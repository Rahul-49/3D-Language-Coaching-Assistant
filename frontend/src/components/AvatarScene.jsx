import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MathUtils } from "three";

// Candidate viseme -> morph keys mapping
// IMPORTANT: You may need to change these string values to match your specific avatar model!
// Check the browser console for the "[Avatar] Available morph keys" log to see what's available.
const RPM_VISEME_CANDIDATES = {
  A: ["viseme_sil", "JawOpen", "MouthClose"],
  B: ["viseme_PP", "viseme_CH", "viseme_DD"],
  C: ["viseme_I", "viseme_E"],
  D: ["viseme_AA", "viseme_aa"],
  E: ["viseme_O", "viseme_U", "viseme_RR"],
  F: ["viseme_U", "viseme_O"],
  X: ["viseme_PP", "viseme_sil"]
};

// This is the set of all possible morph targets we will animate
const ALL_MORPH_KEYS = Array.from(
  new Set(Object.values(RPM_VISEME_CANDIDATES).flat())
);

function Avatar({ url, visemes, audioRef }) {
  const group = useRef();
  const startTimeRef = useRef(0);
  const { scene } = useGLTF(url);
  const meshesRef = useRef([]);
  const dynamicFallbackKeysRef = useRef([]);
  const processedVisemesRef = useRef([]);
  const fallbackTimerRef = useRef(0);

  useEffect(() => {
    if (!scene) return;
    const found = [];
    scene.traverse((obj) => {
      const hasMorphs = obj?.morphTargetDictionary && obj?.morphTargetInfluences;
      if (hasMorphs) {
        // Initialize all influences to 0
        Object.keys(obj.morphTargetDictionary).forEach((key, index) => {
            if (obj.morphTargetInfluences) {
                obj.morphTargetInfluences[index] = 0;
            }
        });
        found.push(obj);
      }
    });
    meshesRef.current = found;
    if (found.length) {
      console.debug("[Avatar] Available morph keys:", found.flatMap(m => Object.keys(m.morphTargetDictionary)));
      // Build dynamic fallback list by heuristics on available morph names
      const names = Array.from(new Set(found.flatMap(m => Object.keys(m.morphTargetDictionary || {}))));
      const preferred = [];
      const addIf = (pred) => names.filter((k) => pred(k)).forEach(k => { if (!preferred.includes(k)) preferred.push(k); });
      addIf(k => /jaw/i.test(k));
      addIf(k => /open/i.test(k));
      addIf(k => /aa\b/i.test(k));
      addIf(k => /mouth/i.test(k));
      addIf(k => /viseme_/i.test(k));
      // Keep the rest as last resort
      names.forEach(k => { if (!preferred.includes(k)) preferred.push(k); });
      dynamicFallbackKeysRef.current = preferred;
    } else {
      console.warn("[Avatar] No meshes with morph targets found");
    }
  }, [scene]);

  // Normalize visemes to ensure we always have start/end fields.
  // Supports entries that only have { time, value } by inferring an end from the next time or a small default window.
  useEffect(() => {
    const arr = Array.isArray(visemes) ? visemes.slice() : [];
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
        end = hasNum(nextT) ? nextT : start + 0.08; // default 80ms window
      }
      norm.push({ start, end, value: v.value });
    }
    processedVisemesRef.current = norm;
  }, [visemes]);

  // If there is no audio element playing (browser SpeechSynthesis fallback),
  // start the animation clock when visemes arrive and stop after their duration.
  useEffect(() => {
    const audioEl = audioRef?.current;
    const hasAudio = !!(audioEl && typeof audioEl.addEventListener === 'function');
    const list = processedVisemesRef.current || [];
    if (!list.length) {
      // No visemes -> reset
      startTimeRef.current = 0;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = 0;
      }
      return;
    }
    // If no audio element available, drive animation purely from time
    if (!hasAudio) {
      // Start clock now
      startTimeRef.current = performance.now() / 1000;
      // Compute total duration and schedule a stop
      const lastEnd = list.reduce((mx, v) => Math.max(mx, v?.end ?? 0), 0);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => {
        startTimeRef.current = 0;
        fallbackTimerRef.current = 0;
      }, Math.max(0, (lastEnd + 0.2) * 1000));
    }
    return () => {
      // Cleanup timer when visemes change
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
        if (process?.env?.NODE_ENV !== 'production') {
          console.debug('[Avatar] Audio play detected, animation started');
        }
      };
      const onEnded = () => {
        startTimeRef.current = 0; // Reset start time to stop animation
      };
      
      audioEl.addEventListener("play", onPlay);
      audioEl.addEventListener("ended", onEnded);
      audioEl.addEventListener("pause", onEnded); // Also stop on pause
      
      return () => {
        audioEl.removeEventListener("play", onPlay);
        audioEl.removeEventListener("ended", onEnded);
        audioEl.removeEventListener("pause", onEnded);
      };
    }
  }, [audioRef, visemes]);

  useFrame((state, delta) => {
    if (!meshesRef.current.length || startTimeRef.current === 0) {
      // If audio is not playing, smoothly return all morphs to 0
       meshesRef.current.forEach(mesh => {
            if (mesh.morphTargetInfluences) {
                ALL_MORPH_KEYS.forEach(key => {
                    const index = mesh.morphTargetDictionary?.[key];
                    if (index !== undefined) {
                        mesh.morphTargetInfluences[index] = MathUtils.lerp(mesh.morphTargetInfluences[index], 0, 0.2);
                    }
                });
            }
        });
      return;
    }

    const elapsedTime = performance.now() / 1000 - startTimeRef.current;
    const vlist = processedVisemesRef.current || [];
    const currentCue = vlist.find(v =>
      elapsedTime >= (v.start ?? 0) && elapsedTime <= (v.end ?? 0)
    );

    let activeKey = null;
    if (currentCue) {
        const candidates = RPM_VISEME_CANDIDATES[currentCue.value] || [];
        for (const cand of candidates) {
            const existsSomewhere = meshesRef.current.some(m => m.morphTargetDictionary?.[cand] !== undefined);
            if (existsSomewhere) {
                activeKey = cand;
                break;
            }
        }
    }
    // Fallback: if audio is playing but no mapped viseme is found, pick a sensible available morph
    if (!activeKey) {
      const fallbackOrder = ["JawOpen", "viseme_AA", "viseme_O", "viseme_U", "viseme_I", "MouthClose", "viseme_PP"]; 
      // Find the first fallback key that exists on any mesh
      for (const key of fallbackOrder) {
        const exists = meshesRef.current.some(m => m.morphTargetDictionary?.[key] !== undefined);
        if (exists) { activeKey = key; break; }
      }
      // As last resort: pick any known morph key present in the first mesh
      if (!activeKey && meshesRef.current.length) {
        const dict = meshesRef.current[0].morphTargetDictionary || {};
        const anyKey = Object.keys(dict)[0];
        if (anyKey) activeKey = anyKey;
      }
    }

    // DEBUG LOG: Uncomment this to see live animation data in the browser console.
    // if (state.clock.elapsedTime % 0.25 < delta) { // Log roughly 4 times per second
    //     console.log({
    //         time: elapsedTime.toFixed(2),
    //         cue: currentCue ? currentCue.value : null,
    //         activeMorph: activeKey
    //     });
    // }

    meshesRef.current.forEach(mesh => {
      const dict = mesh.morphTargetDictionary || {};
      const infl = mesh.morphTargetInfluences || [];

      ALL_MORPH_KEYS.forEach((key) => {
        const index = dict[key];
        if (index !== undefined) {
          const target = (key === activeKey) ? 1.0 : 0.0;
          infl[index] = MathUtils.lerp(infl[index], target, 0.4);
        }
      });
    });
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