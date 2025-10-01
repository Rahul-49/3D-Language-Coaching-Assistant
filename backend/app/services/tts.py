import base64
import os
import io
from typing import Dict, List
import soundfile as sf

# Edge-TTS removed

# pyttsx3 (local Windows TTS)
try:
    import pyttsx3  # type: ignore
    _HAS_PYTTSX3 = True
except Exception:
    _HAS_PYTTSX3 = False

def _estimate_duration_secs(text: str, wpm: int = 160) -> float:
    words = max(1, len(text.split()))
    minutes = words / max(80, wpm)
    return float(minutes * 60.0)

def _make_dummy_visemes(text: str, duration: float) -> List[Dict]:
    labels = ["A", "B", "C", "D", "E", "F"]
    step = 0.08
    t = 0.0
    vis = []
    i = 0
    while t < duration:
        vis.append({"time": round(t,3), "value": labels[i % len(labels)]})
        t += step
        i += 1
    return vis

def _run_rhubarb(wav_path: str) -> List[Dict]:
    import subprocess
    import tempfile
    import json

    rhubarb_path = os.getenv("RHUBARB_PATH", "rhubarb")  # Use PATH by default
    # Resolve Windows-specific cases: if a folder is provided, append rhubarb.exe
    try:
        rp = rhubarb_path.strip().strip('"').strip("'")
        if os.path.isdir(rp):
            candidate = os.path.join(rp, "rhubarb.exe")
            if os.path.isfile(candidate):
                rhubarb_path = candidate
        else:
            # If file without extension but .exe exists next to it, use that
            root, ext = os.path.splitext(rp)
            if ext == "" and os.path.isfile(root + ".exe"):
                rhubarb_path = root + ".exe"
    except Exception:
        pass

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as f:
            out_json = f.name
        cmd = [rhubarb_path, "-f", "json", "-o", out_json, wav_path]
        print(f"[Rhubarb] Resolved path: {rhubarb_path}")
        print(f"[Rhubarb] Running command: {' '.join(cmd)}")
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=float(os.getenv("RHUBARB_TIMEOUT_SEC", "20")))
        with open(out_json, "r", encoding="utf-8") as f:
            data = json.load(f)
        cues = data.get("mouthCues") or []
        print(f"[Rhubarb] Successfully generated {len(cues)} viseme cues.")
        cleaned = []
        for c in cues:
            try:
                cleaned.append({
                    "start": float(c.get("start",0.0)),
                    "end": float(c.get("end",0.0)),
                    "value": str(c.get("value","X"))
                })
            except Exception:
                continue
        return cleaned
    except FileNotFoundError:
        print(f"[Rhubarb] ERROR: Rhubarb executable not found. RHUBARB_PATH='{rhubarb_path}'. Set RHUBARB_PATH to full path of rhubarb.exe or ensure it's in PATH.")
        return []
    except subprocess.TimeoutExpired:
        print("[Rhubarb] ERROR: Rhubarb timed out. Increase RHUBARB_TIMEOUT_SEC or check the executable path and WAV file.")
        return []
    except subprocess.CalledProcessError as e:
        print(f"[Rhubarb] ERROR: Rhubarb process failed with exit code {e.returncode}.")
        print(f"[Rhubarb] STDOUT: {e.stdout}")
        print(f"[Rhubarb] STDERR: {e.stderr}")
        return []
    except Exception as e:
        print(f"[Rhubarb] ERROR: An unexpected error occurred while running Rhubarb: {e}")
        return []
    finally:
        if 'out_json' in locals() and os.path.exists(out_json):
            os.remove(out_json)


def synthesize_tts(text: str):
    if not text:
        return {"audio_b64": "", "mime": "audio/wav", "visemes": [], "text": text}
    
    print(f"[TTS] Processing text: '{text}'")

    # 1) pyttsx3
    if _HAS_PYTTSX3:
        try:
            import tempfile
            engine = pyttsx3.init()
            voice_name = os.getenv("PYTTSX3_VOICE")
            voices = engine.getProperty('voices') or []
            selected_id = None
            if voice_name:
                for v in voices:
                    vn = (v.name or '').lower()
                    vid = (getattr(v, 'id', '') or '').lower()
                    if voice_name.lower() in vn or voice_name.lower() in vid:
                        selected_id = v.id
                        break
            if not selected_id:
                # Heuristics to prefer common female voices on Windows SAPI5 and others
                female_hints = [
                    'female', 'zira', 'jenny', 'aria', 'susan', 'heather', 'eva', 'salli', 'kimberly', 'michelle', 'amy', 'emma'
                ]
                for hint in female_hints:
                    for v in voices:
                        vn = (v.name or '').lower()
                        vid = (getattr(v, 'id', '') or '').lower()
                        if hint in vn or hint in vid:
                            selected_id = v.id
                            break
                    if selected_id:
                        break
            if selected_id:
                engine.setProperty('voice', selected_id)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                tmp_wav = f.name
            engine.save_to_file(text, tmp_wav)
            engine.runAndWait()
            with open(tmp_wav,'rb') as f:
                audio_bytes = f.read()
            visemes = _run_rhubarb(tmp_wav)
            print(f"[TTS] Generated {len(visemes)} visemes for pyttsx3 audio")
            try:
                os.remove(tmp_wav)
            except Exception:
                pass
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            return {"audio_b64": audio_b64, "mime": "audio/wav", "visemes": visemes, "text": text}
        except Exception as e:
            print(f"[pyttsx3] Failed: {e}")
            pass

    # 2) Silent fallback
    print("[TTS] Warning: All TTS engines failed. Generating silent fallback audio.")
    import numpy as np
    sr = 22050
    duration = max(0.5, min(5.0, _estimate_duration_secs(text)))
    wav = np.zeros(int(sr * duration), dtype="float32")
    buf = io.BytesIO()
    sf.write(buf, wav, sr, format="WAV")
    audio_bytes = buf.getvalue()
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    visemes = _make_dummy_visemes(text, duration)
    print(f"[TTS] Using silent fallback with {len(visemes)} dummy visemes")
    return {"audio_b64": audio_b64, "mime": "audio/wav", "visemes": visemes, "text": text}