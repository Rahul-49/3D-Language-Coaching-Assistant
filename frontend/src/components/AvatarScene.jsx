import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MathUtils } from "three";

// DEBUG flags: enable temporary diagnostics to validate morph animation.
const DEBUG_FORCE_MOUTHOPEN = false;
const DEBUG_PULSE_SECONDS = 3;
const DEBUG_ROTATE = false;

// --- Rhubarb-aware viseme mapping (A-H, X).
// These map Rhubarb visemes to multiple possible morph keys.
// If your model uses different keys (e.g. viseme_AA, viseme_O, etc.),
// those keys will be used automatically when present in the morph dictionary.
const VISEME_WEIGHTS = {
  A: { MouthClose: 1.0, viseme_PP: 1.0 },                 // lips closed
  B: { mouthSmile: 0.2, mouthOpen: 0.9, viseme_B: 1.0 },  // light open
  C: { mouthOpen: 0.55, viseme_O: 0.45 },                 // mid open
  D: { mouthOpen: 1.0, JawOpen: 0.85, viseme_AA: 1.0 },   // full "AAH"
  E: { mouthOpen: 0.5, viseme_I: 0.6, mouthSmile: 0.3 }, // "EH/EE"
  F: { mouthSmile: 0.7, viseme_F: 1.0 },                  // "F/V" teeth
  G: { mouthOpen: 0.85, viseme_O: 2.0, JawOpen: 0.6 },    // strong "O"
  H: { mouthOpen: 0.4, viseme_U: 0.6, JawOpen: 0.3 },    // strong "U"
  X: { MouthClose: 1.0 }                                  // silence
};

const ALL_MORPH_KEYS = ["mouthOpen", "mouthSmile", "JawOpen", "MouthClose", "viseme_AA", "viseme_O", "viseme_U", "viseme_I", "viseme_PP"];

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

    // Build blended target weights (defaults to X if nothing found)
    const basePrev = prev?.cue?.value ?? "X";
    const baseNext = next?.cue?.value ?? null;
    let blendT = 0;
    if (prev?.cue && baseNext && next?.cue) {
      const denom = Math.max(0.0001, (next.cue.start - prev.cue.start));
      blendT = MathUtils.clamp((elapsedTime - prev.cue.start) / denom, 0, 1);
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

    // Non-linear scale to reduce "overdrive" look
    const scaleCurve = (t) => {
      if (t <= 0) return 0;
      return Math.min(1, Math.pow(t, 1.12)); // gentle nonlinear curve
    };

    // optional global gain for visibility (keep conservative)
    const GAIN = 5.4;

    // Apply blended weights to *all* morph keys present on each mesh
    meshesRef.current.forEach(mesh => {
      const dict = mesh.morphTargetDictionary || {};
      const infl = mesh.morphTargetInfluences || [];

      // compute per-key target (if a key isn't in our mapping, it will be decayed to 0)
      Object.entries(dict).forEach(([key, idx]) => {
        // keys may be named in several ways (JawOpen, mouthOpen, viseme_AA, etc.)
        // try: direct key (A-H mapping uses names like viseme_AA or MouthClose)
        // fallback: if key looks like a viseme name (e.g. startsWith('viseme_')), try mapping by suffix
        let rawTarget = blendedWeightFor(key);
        // If blendedWeightFor returned 0 (no explicit mapping), also check for common aliases:
        if (!rawTarget) {
          // alias heuristics
          const alias = key.toLowerCase();
          if (alias.includes('jaw')) rawTarget = blendedWeightFor('JawOpen');
          else if (alias.includes('open')) rawTarget = blendedWeightFor('mouthOpen') || blendedWeightFor('JawOpen');
          else if (alias.includes('close')) rawTarget = blendedWeightFor('MouthClose');
          else if (/viseme_?a/i.test(alias)) rawTarget = blendedWeightFor('viseme_AA') || blendedWeightFor('A');
          else if (/viseme_?o/i.test(alias)) rawTarget = blendedWeightFor('viseme_O') || blendedWeightFor('G');
          else if (/viseme_?u/i.test(alias)) rawTarget = blendedWeightFor('viseme_U') || blendedWeightFor('H');
          else if (/pp|p/i.test(alias)) rawTarget = blendedWeightFor('viseme_PP') || blendedWeightFor('A');
        }

        // final scaled target
        const target = Math.min(1, GAIN * scaleCurve(rawTarget || 0));
        // lerp faster when active, slower when deactivating
        const lerpFactor = (rawTarget && rawTarget > 0.01) ? 0.38 : 0.18;
        infl[idx] = MathUtils.lerp(infl[idx] || 0, target, lerpFactor);
      });

      // softly decay any morphs not explicitly handled (safety: ensure no leftover shapes)
      Object.entries(dict).forEach(([key, idx]) => {
        if (idx === undefined) return;
        // if influence is tiny, clamp to 0 for stability
        if (infl[idx] < 0.001) infl[idx] = 0;
      });
    });

    // subtle jaw / head motion based on blended JawOpen or mouthOpen
    const jawVal = blendedWeightFor('JawOpen') || blendedWeightFor('mouthOpen') || 0;
    if (group.current) {
      group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, -0.03 * jawVal, 0.08);
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

