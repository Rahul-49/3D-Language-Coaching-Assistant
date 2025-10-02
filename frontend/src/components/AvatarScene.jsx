import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MathUtils } from "three";

// DEBUG flags: enable temporary diagnostics to validate morph animation.
const DEBUG_FORCE_MOUTHOPEN = false;
const DEBUG_PULSE_SECONDS = 3;
const DEBUG_ROTATE = false;

// --- Rhubarb-aware viseme mapping (A-H, X) - Refined per documentation
// These map Rhubarb visemes to multiple possible morph keys following
// the official Hanna-Barbera inspired mouth shape guidelines.
const VISEME_WEIGHTS = {
  // A: Closed mouth for P, B, M - slight pressure between lips
  A: { MouthClose: 0.95, viseme_PP: 1.0, mouthOpen: 0.0 },
  
  // B: Slightly open with clenched teeth - for most consonants (K, S, T) and "EE"
  B: { mouthOpen: 0.35, mouthSmile: 0.45, viseme_I: 0.8, JawOpen: 0.15 },
  
  // C: Open mouth for "EH" (men) and "AE" (bat) - also transition A/B→D
  C: { mouthOpen: 0.6, JawOpen: 0.4, viseme_E: 0.85, mouthSmile: 0.1 },
  
  // D: Wide open for "AA" (father) - maximum jaw opening
  D: { mouthOpen: 1.0, JawOpen: 1.0, viseme_AA: 1.0, mouthSmile: 0.0 },
  
  // E: Slightly rounded for "AO" (off) and "ER" (bird) - transition C/D→F
  E: { mouthOpen: 0.55, JawOpen: 0.35, viseme_O: 0.6, mouthRound: 0.5 },
  
  // F: Puckered lips for "UW" (you), "OW" (show), "W" (way)
  F: { mouthOpen: 0.3, viseme_U: 1.0, mouthRound: 0.9, mouthFunnel: 0.8, JawOpen: 0.2 },
  
  // G: Upper teeth on lower lip for "F" (for) and "V" (very)
  G: { mouthOpen: 0.25, viseme_F: 1.0, mouthSmile: 0.2, JawOpen: 0.1 },
  
  // H: Tongue raised behind upper teeth for long "L" - at least as open as C
  H: { mouthOpen: 0.65, JawOpen: 0.45, viseme_L: 1.0, tongueOut: 0.4 },
  
  // X: Idle/rest position - closed but relaxed (less pressure than A)
  X: { MouthClose: 0.85, mouthOpen: 0.0, viseme_sil: 1.0 }
};

const ALL_MORPH_KEYS = [
  "mouthOpen", "mouthSmile", "mouthRound", "mouthFunnel", "JawOpen", "MouthClose",
  "viseme_AA", "viseme_E", "viseme_I", "viseme_O", "viseme_U", 
  "viseme_PP", "viseme_F", "viseme_L", "viseme_sil", "tongueOut"
];

function Avatar({ url, visemes, audioRef }) {
  const group = useRef();
  const startTimeRef = useRef(0);
  const { scene } = useGLTF(url);
  const meshesRef = useRef([]);
  const dynamicFallbackKeysRef = useRef([]);
  const processedVisemesRef = useRef([]);
  const fallbackTimerRef = useRef(0);
  const lastLogRef = useRef(0);
  const debugPulseUntilRef = useRef(0);

  useEffect(() => {
    if (!scene) return;
    const found = [];
    scene.traverse((obj) => {
      const hasMorphs = obj?.morphTargetDictionary && obj?.morphTargetInfluences;
      if (hasMorphs) {
        try {
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
              if ('morphTargets' in m) m.morphTargets = true;
              if ('morphNormals' in m) m.morphNormals = true;
              m.needsUpdate = true;
            });
          }
        } catch (e) {}
        Object.keys(obj.morphTargetDictionary).forEach((key, index) => {
            if (obj.morphTargetInfluences) {
                obj.morphTargetInfluences[index] = 0;
            }
        });
        found.push(obj);
      }
    });
    
    const mouthMeshes = found.filter(m => {
      const dict = m.morphTargetDictionary || {};
      return ("mouthOpen" in dict) || ("mouthSmile" in dict) || ("JawOpen" in dict);
    });
    meshesRef.current = mouthMeshes.length ? mouthMeshes : found;
    
    if (found.length) {
      console.info("[Avatar] Found", found.length, "mesh(es) with morphs.");
      console.info("[Avatar] Using", meshesRef.current.length, "mesh(es) for animation.");
      console.info("[Avatar] Available morph keys (unique):", Array.from(new Set(found.flatMap(m => Object.keys(m.morphTargetDictionary)))));
      console.info("[Avatar] Target meshes:", meshesRef.current.map(m => ({ name: m.name, keys: Object.keys(m.morphTargetDictionary||{}) })))
      
      const names = Array.from(new Set(found.flatMap(m => Object.keys(m.morphTargetDictionary || {}))));
      const preferred = [];
      const addIf = (pred) => names.filter((k) => pred(k)).forEach(k => { if (!preferred.includes(k)) preferred.push(k); });
      addIf(k => /jaw/i.test(k));
      addIf(k => /open/i.test(k));
      addIf(k => /aa\b/i.test(k));
      addIf(k => /mouth/i.test(k));
      addIf(k => /viseme_/i.test(k));
      names.forEach(k => { if (!preferred.includes(k)) preferred.push(k); });
      dynamicFallbackKeysRef.current = preferred;
      
      debugPulseUntilRef.current = performance.now() / 1000 + DEBUG_PULSE_SECONDS;
    } else {
      console.warn("[Avatar] No meshes with morph targets found");
    }
  }, [scene]);

  useEffect(() => {
    const arr = Array.isArray(visemes) ? visemes.slice() : [];
    console.log('[Avatar] Raw visemes received:', { count: arr.length, sample: arr.slice(0, 3) });
    const norm = [];
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i] || {};
      const hasNum = (x) => typeof x === 'number' && !Number.isNaN(x) && Number.isFinite(x);
      const t = hasNum(v.time) ? v.time : undefined;
      const start = hasNum(v.start) ? v.start : (t ?? 0);
      let end = hasNum(v.end) ? v.end : undefined;
      if (!hasNum(end)) {
        const next = arr[i + 1] || {};
        const nextT = hasNum(next.time) ? next.time : undefined;
        end = hasNum(nextT) ? nextT : start + 0.08;
      }
      norm.push({ start, end, value: v.value });
    }
    
    const usesMs = norm.some(v => (v?.end ?? 0) > 1000 || (v?.start ?? 0) > 1000);
    const fixed = usesMs ? norm.map(v => ({ ...v, start: v.start / 1000, end: v.end / 1000 })) : norm;
    processedVisemesRef.current = fixed;
    console.info('[Avatar] Visemes processed:', { count: fixed.length, sample: fixed.slice(0, 5), usesMs, duration: fixed.length ? Math.max(...fixed.map(v => v.end)) : 0 });

    const audioEl = audioRef?.current;
    const hasAudio = !!(audioEl && typeof audioEl.addEventListener === 'function');
    
    if (!hasAudio) {
      if (fixed.length) {
        startTimeRef.current = performance.now() / 1000;
        const lastEnd = fixed.reduce((mx, v) => Math.max(mx, v?.end ?? 0), 0);
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = setTimeout(() => {
          startTimeRef.current = 0;
          fallbackTimerRef.current = 0;
        }, Math.max(0, (lastEnd + 0.2) * 1000));
      } else {
        startTimeRef.current = 0;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = 0;
        }
      }
    } else {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = 0;
      }
    }
  }, [visemes]);

  useEffect(() => {
    const audioEl = audioRef?.current;
    const list = processedVisemesRef.current || [];
    if (!list.length) {
      startTimeRef.current = 0;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = 0;
      }
      return;
    }
    
    startTimeRef.current = performance.now() / 1000;
    const lastEnd = list.reduce((mx, v) => Math.max(mx, v?.end ?? 0), 0);
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      startTimeRef.current = 0;
      fallbackTimerRef.current = 0;
    }, Math.max(0, (lastEnd + 0.2) * 1000));
    
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = 0;
      }
    };
  }, [audioRef, visemes]);

  useEffect(() => {
    const audioEl = audioRef?.current;
    if (audioEl) {
      const onPlay = () => {
        startTimeRef.current = performance.now() / 1000;
        console.info('[Avatar] Audio play detected. Beginning viseme sync.');
      };
      const onEnded = () => {
        console.info('[Avatar] Audio ended/paused. Viseme timer will control animation stop.');
      };
      
      audioEl.addEventListener("play", onPlay);
      audioEl.addEventListener("ended", onEnded);
      audioEl.addEventListener("pause", onEnded);
      
      return () => {
        audioEl.removeEventListener("play", onPlay);
        audioEl.removeEventListener("ended", onEnded);
        audioEl.removeEventListener("pause", onEnded);
      };
    }
  }, [audioRef, visemes]);

  useFrame((state, delta) => {
    if (DEBUG_ROTATE && group.current) {
      group.current.rotation.y += 0.2 * delta;
    }

    const nowSec = performance.now() / 1000;
    if (nowSec < debugPulseUntilRef.current && startTimeRef.current === 0) {
      startTimeRef.current = nowSec;
    }

    // If no morph meshes or no active timing, softly decay everything to zero
    if (!meshesRef.current.length || (startTimeRef.current === 0 && nowSec >= debugPulseUntilRef.current)) {
      meshesRef.current.forEach(mesh => {
        if (mesh.morphTargetInfluences) {
          ALL_MORPH_KEYS.forEach(key => {
            const index = mesh.morphTargetDictionary?.[key];
            if (index !== undefined) {
              mesh.morphTargetInfluences[index] = MathUtils.lerp(
                mesh.morphTargetInfluences[index], 
                0, 
                0.32
              );
            }
          });
        }
      });
      return;
    }

    // compute elapsed time (prefer real audio currentTime when playing)
    const audioEl = audioRef?.current;
    let elapsedTime = 0;
    if (audioEl && typeof audioEl.currentTime === 'number' && !audioEl.paused) {
      elapsedTime = Math.max(0, audioEl.currentTime);
    } else {
      elapsedTime = Math.max(0, nowSec - startTimeRef.current);
    }

    const vlist = processedVisemesRef.current || [];

    // Find nearest previous and next cue for blending (co-articulation)
    let prev = null;
    let next = null;
    for (let i = 0; i < vlist.length; i++) {
      const v = vlist[i];
      if (v.start <= elapsedTime) prev = { idx: i, cue: v };
      if (v.start > elapsedTime) { next = { idx: i, cue: v }; break; }
    }

    // Build blended target weights with improved co-articulation
    const basePrev = prev?.cue?.value ?? "X";
    const baseNext = next?.cue?.value ?? null;
    let blendT = 0;
    
    // Enhanced blending for smoother transitions
    if (prev?.cue && baseNext && next?.cue) {
      const denom = Math.max(0.0001, (next.cue.start - prev.cue.start));
      const rawT = MathUtils.clamp((elapsedTime - prev.cue.start) / denom, 0, 1);
      
      // Use ease-in-out for more natural co-articulation
      // Emphasize anticipatory movements (blend starts earlier)
      blendT = rawT < 0.5 
        ? 2 * rawT * rawT  // ease in (accelerate toward next shape)
        : 1 - Math.pow(-2 * rawT + 2, 2) / 2; // ease out
    }

    // Resolve weight sets and blend them
    const prevWeights = VISEME_WEIGHTS[basePrev] || VISEME_WEIGHTS.X;
    const nextWeights = baseNext ? (VISEME_WEIGHTS[baseNext] || VISEME_WEIGHTS.X) : null;

    // function: read weight for key after lerp between prev/next
    const blendedWeightFor = (k) => {
      const a = prevWeights[k] ?? 0;
      const b = nextWeights ? (nextWeights[k] ?? 0) : a;
      return MathUtils.lerp(a, b, blendT);
    };

    // debug/log tick occasionally
    if (state.clock.elapsedTime - lastLogRef.current > 0.2) {
      lastLogRef.current = state.clock.elapsedTime;
      console.debug('[Avatar] tick', {
        time: elapsedTime.toFixed(2),
        prev: basePrev,
        next: baseNext,
        blend: blendT.toFixed(2)
      });
    }

    // Non-linear scale with improved curve for natural movement
    const scaleCurve = (t) => {
      if (t <= 0) return 0;
      // Slightly softer curve to prevent over-exaggeration
      return Math.min(1, Math.pow(t, 1.05));
    };

    // Reduced global gain for more subtle, natural movements
    const GAIN = 1.8;

    // Apply blended weights to *all* morph keys present on each mesh
    meshesRef.current.forEach(mesh => {
      const dict = mesh.morphTargetDictionary || {};
      const infl = mesh.morphTargetInfluences || [];

      // compute per-key target (if a key isn't in our mapping, it will be decayed to 0)
      Object.entries(dict).forEach(([key, idx]) => {
        // Try direct mapping first from our VISEME_WEIGHTS
        let rawTarget = blendedWeightFor(key);
        
        // If no direct match, use enhanced alias heuristics
        if (!rawTarget || rawTarget === 0) {
          const alias = key.toLowerCase();
          
          // Jaw movements
          if (/jaw.*open/i.test(alias) || alias === 'jawopen') {
            rawTarget = blendedWeightFor('JawOpen');
          }
          // Mouth open/close
          else if (/mouth.*open/i.test(alias) && !/smile|round|funnel/.test(alias)) {
            rawTarget = blendedWeightFor('mouthOpen');
          }
          else if (/mouth.*close/i.test(alias) || alias === 'mouthclose') {
            rawTarget = blendedWeightFor('MouthClose');
          }
          // Mouth shapes
          else if (/mouth.*smile/i.test(alias) || alias === 'mouthsmile') {
            rawTarget = blendedWeightFor('mouthSmile');
          }
          else if (/mouth.*round/i.test(alias) || alias === 'mouthround') {
            rawTarget = blendedWeightFor('mouthRound');
          }
          else if (/mouth.*funnel/i.test(alias) || alias === 'mouthfunnel') {
            rawTarget = blendedWeightFor('mouthFunnel');
          }
          // Viseme mappings (ARKit/standard naming)
          else if (/viseme[_\s]?aa/i.test(alias)) {
            rawTarget = blendedWeightFor('viseme_AA');
          }
          else if (/viseme[_\s]?e/i.test(alias) && !/ee/i.test(alias)) {
            rawTarget = blendedWeightFor('viseme_E');
          }
          else if (/viseme[_\s]?i/i.test(alias) || /viseme[_\s]?ee/i.test(alias)) {
            rawTarget = blendedWeightFor('viseme_I');
          }
          else if (/viseme[_\s]?o/i.test(alias) && !/oo/i.test(alias)) {
            rawTarget = blendedWeightFor('viseme_O');
          }
          else if (/viseme[_\s]?u/i.test(alias) || /viseme[_\s]?oo/i.test(alias)) {
            rawTarget = blendedWeightFor('viseme_U');
          }
          else if (/viseme[_\s]?(pp|p)/i.test(alias)) {
            rawTarget = blendedWeightFor('viseme_PP');
          }
          else if (/viseme[_\s]?f/i.test(alias)) {
            rawTarget = blendedWeightFor('viseme_F');
          }
          else if (/viseme[_\s]?l/i.test(alias)) {
            rawTarget = blendedWeightFor('viseme_L');
          }
          else if (/viseme[_\s]?sil/i.test(alias) || /viseme[_\s]?rest/i.test(alias)) {
            rawTarget = blendedWeightFor('viseme_sil');
          }
          // Tongue
          else if (/tongue/i.test(alias)) {
            rawTarget = blendedWeightFor('tongueOut');
          }
        }

        // final scaled target with adaptive lerp speed
        const target = Math.min(1, GAIN * scaleCurve(rawTarget || 0));
        
        // Dynamic lerp: faster attack (opening), slower decay (closing) for natural feel
        const currentVal = infl[idx] || 0;
        const isIncreasing = target > currentVal;
        const lerpFactor = isIncreasing ? 0.45 : 0.25;
        
        infl[idx] = MathUtils.lerp(currentVal, target, lerpFactor);
      });

      // softly decay any morphs not explicitly handled (safety: ensure no leftover shapes)
      Object.entries(dict).forEach(([key, idx]) => {
        if (idx === undefined) return;
        // if influence is tiny, clamp to 0 for stability
        if (infl[idx] < 0.001) infl[idx] = 0;
      });
    });

    // Subtle jaw / head motion based on mouth openness
    // Use a combination of JawOpen and mouthOpen for natural head tilt
    const jawVal = blendedWeightFor('JawOpen') || 0;
    const mouthVal = blendedWeightFor('mouthOpen') || 0;
    const openness = Math.max(jawVal, mouthVal * 0.7);
    
    if (group.current) {
      // Very subtle downward tilt when mouth opens wide
      const targetRotX = -0.02 * openness;
      group.current.rotation.x = MathUtils.lerp(
        group.current.rotation.x, 
        targetRotX, 
        0.12
      );
    }

    // If we've gone past the last cue and audio isn't playing, schedule stop
    const lastEnd = vlist.reduce((mx, v) => Math.max(mx, v?.end ?? 0), 0);
    if ((!audioEl || audioEl.paused) && elapsedTime > (lastEnd + 0.15)) {
      startTimeRef.current = 0;
    }
  });

  return <primitive ref={group} object={scene} position={[0, -1.6, 0]} />;
}

export default function AvatarScene({ avatarUrl, visemes, audioRef }) {
  return (
    <Canvas camera={{ position: [0, 0.5, 3.5], fov: 8 }} style={{ touchAction: 'none', width: '100%', height: '100%' }}>
      <ambientLight intensity={1.0} />
      <directionalLight position={[2, 9, 2]} intensity={1.2} />
      <Avatar url={avatarUrl} visemes={visemes} audioRef={audioRef} />
    </Canvas>
  );
}

useGLTF.preload("https://models.readyplayer.me/68d681b0808887d27d794e82.glb");