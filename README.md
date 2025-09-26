# 3D Avatar English Interview Assistant

  This project provides a real-time interview practice assistant using a Ready Player Me 3D avatar with lip sync.

  - Backend: Flask, MongoDB, service stubs (STT Whisper), grammar, aligner, semantic, moderation, Gemini; TTS via edge-tts (preferred) or pyttsx3 (fallback)
  - Frontend: React + Vite, Three.js + @react-three/fiber/drei, Ready Player Me avatar loader, basic recording and scoring UI

## Monorepo Structure

avatar-assistant/
  backend/
    app/
      main.py
      routes/
        session.py
        check.py
      services/
        stt.py
        tts.py
        grammar.py
        aligner.py
        semantic.py
        gemini_client.py
        moderation.py
      db/
        mongo.py
    requirements.txt
  frontend/
    index.html
    vite.config.js
    package.json
    src/
      main.jsx
      App.jsx
      api/
        apiClient.js
        webrtc.js
      components/
        AvatarScene.jsx
        InterviewPanel.jsx
        ScoreReport.jsx
```

## Quick Start (Windows)

### 1) Backend
- Open PowerShell in `d:\Hackathon\avatar-assistant\backend`
- Create and activate venv:
```
python -m venv .venv
./.venv/Scripts/Activate.ps1
```
- Install dependencies:
```
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```
- Create `.env` (example):
```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=avatar_assistant
PORT=8000

# Llama (Ollama) JSON correction path (default is ON)
LLAMA_MODE=1
LLAMA_URL=http://localhost:11434/api/generate
LLAMA_MODEL=llama3.1

# Optional: Google for embeddings/grammar fallback
# GOOGLE_API_KEY=your_key
# GEMINI_MODEL=gemini-2.5-flash

# Whisper STT config
WHISPER_MODEL=small
WHISPER_COMPUTE_TYPE=auto

# TTS preferences (edge-tts first; pyttsx3 fallback)
# Use a WAV format that tools like Rhubarb or waveform readers handle well
EDGE_TTS_VOICE=en-US-JennyNeural
EDGE_TTS_FORMAT=riff-16khz-16bit-mono-pcm
```
- Start backend:
```
python -m app.main
```
- Health check: open http://localhost:8000/health

- Optional TTS engines (recommended to avoid silent fallback):
```
python -m pip install edge-tts pyttsx3
```

### 2) Frontend
- Open PowerShell in `d:\Hackathon\avatar-assistant\frontend`
```
npm install
npm run dev
```
- Open the shown URL (typically http://localhost:5173)

## Environment Variables
- `LLAMA_MODE`: "1" to enable Llama (Ollama) JSON correction path. Default "1".
- `LLAMA_URL`: Ollama endpoint (default `http://localhost:11434/api/generate`).
- `LLAMA_MODEL`: e.g., `llama3.1`, `qwen2.5:7b-instruct`, or `mistral:latest`.
- `STATIC_MODE`: if "1", bypasses models; echoes transcript and returns fixed scores.
- `GOOGLE_API_KEY`: enables Gemini grammar fallback and embeddings for semantic score.
- `GEMINI_MODEL`: defaults to `gemini-2.5-flash`.
- `WHISPER_MODEL`: `base|small|medium|large` (bigger = better; larger download).
- `WHISPER_COMPUTE_TYPE`: `auto` is fine on CPU.
- `EDGE_TTS_VOICE`, `EDGE_TTS_FORMAT`: for edge-tts voice and output format (WAV suggested: `riff-16khz-16bit-mono-pcm`).
- `PYTTSX3_VOICE`: voice name substring for Windows SAPI (pyttsx3) fallback.

Tip: Install ffmpeg and add it to PATH so webm/opus audio from the browser decodes reliably.

## How It Works (End-to-End)

### 1) Session flow (backend)
- `POST /api/session/start` creates a session and stores the avatar url.
- `POST /api/check` processes each user answer:
  - If `audio` blob uploaded: `app/services/stt.py` transcribes it via Faster-Whisper.
    - If direct decode fails, tries ffmpeg to convert webm→wav then transcribes.
  - Moderation check (`app/services/moderation.py`).
  - Correction + scoring path:
    - If `STATIC_MODE=1`: echo transcript and return fixed scores.
    - Else if `LLAMA_MODE=1`: call Ollama (`LLAMA_URL`/`LLAMA_MODEL`) with `format:"json"` and a strict JSON prompt.
      - Parses response into `correction`, `score`, `fluency`, `mistakes`.
      - If model echoes, it reprompts; if still identical, minimal tweak; optionally, Gemini fallback can be enabled.
    - Else: Gemini fallback (`app/services/grammar.py`) if `GOOGLE_API_KEY` is present.
  - Semantic score via embeddings (if `GOOGLE_API_KEY`) or heuristic fallback in `semantic.py`.
  - Pronunciation proxy score in `aligner.py`.
  - TTS in `tts.py`: tries `edge-tts` first (mp3/opus), then `pyttsx3` (wav), else silent wav. Returns `audio_b64`, `mime`, and a synthetic `visemes` timeline.
  - Stores attempt in MongoDB and returns the JSON payload to frontend.
- `POST /api/session/end` aggregates attempts and returns overall scores and optional feedback.

### 2) Frontend UX
- `src/components/AvatarScene.jsx` renders the Ready Player Me avatar and animates the mouth from visemes.
- `src/components/InterviewPanel.jsx` handles Q&A:
  - Records mic via `MediaRecorder` (audio/webm) and auto-stops using simple VAD:
    - Web Audio `AnalyserNode` measures RMS each frame; after sustained silence it stops and submits.
  - Sends the audio blob to `/api/check` with session + question.
  - Displays `transcript`, `correction`, and scores.
  - Plays TTS:
    - Prefers server audio (`audio_b64` + `mime`).
    - If none, uses browser `SpeechSynthesis` fallback to speak the correction.
  - Lip sync: visemes from the backend are normalized into `start`/`end` windows if only `time` is provided. If a viseme label does not match the model, a sensible fallback (e.g., `JawOpen`, `viseme_AA`) is chosen so the mouth still moves while audio plays.
  - The built-in interview flow now includes 10 questions. Final scores are aggregated over all answered questions when you click Finish.

### 3) WebRTC Signaling (scaffolding)
- Backend exposes `POST /webrtc/offer` using `aiortc` to accept an SDP offer and return an answer.
- Frontend `src/api/webrtc.js` creates an offer and posts to `/webrtc/offer`.
- Currently the backend blackholes incoming audio; extend it to real-time pipelines if needed.

## API Endpoints
- `GET /health`: basic health check.
- `POST /api/session/start` -> `{ session_id }`
- `POST /api/check` (multipart form-data)
  - fields: `session_id`, `question`, `audio` (webm) OR `transcript`
  - returns: `{ transcript, correction, mistakes, scores { grammar, pronunciation, semantic, fluency }, tts { audio_b64, mime, visemes, text } }`
- `POST /api/session/end` -> `{ scores, feedback }`
- `POST /webrtc/offer` -> `{ sdp, type }` (answer)

## Troubleshooting
- Backend cannot import `app`: Ensure you run from `backend/` folder: `python -m app.main`.
- No audio transcription: Install ffmpeg and ensure it’s on PATH; try a larger Whisper model.
- Corrections are identical (echo):
  - Use an instruction-tuned Ollama model: `LLAMA_MODEL=qwen2.5:7b-instruct` or `mistral:latest`.
  - Keep `format:"json"` and strict prompt (already in code).
  - Optionally enable Gemini fallback with `GOOGLE_API_KEY`.
- No TTS audio: Ensure `edge-tts` is installed and you have internet, or `pyttsx3` is installed with Windows SAPI voices available. If both are missing, the backend generates a silent WAV as a last resort; the frontend will then try browser `SpeechSynthesis`.
- Avatar mouth not moving:
  - Open the browser console to see `[Avatar] Available morph keys:` and confirm your model exposes morph targets.
  - Adjust the RPM viseme mapping in `AvatarScene.jsx` to match keys printed in the console (e.g., `JawOpen`, `MouthClose`, specific `viseme_*`).
  - Movement still minimal? Increase the interpolation factor in the animation loop or expand the fallback morph list.
- Frontend not speaking: Check autoplay policies; our playback runs after a user gesture (Stop/auto-stop), which should be allowed.

## Development Notes
- Code paths to check:
  - Backend routes: `backend/app/routes/check.py`, `session.py`
  - Services: `stt.py`, `tts.py`, `grammar.py`, `semantic.py`, `aligner.py`, `moderation.py`
  - Frontend components: `AvatarScene.jsx`, `InterviewPanel.jsx`
- To adjust VAD:
  - See `vadConfigRef` in `InterviewPanel.jsx` (`threshold`, `silenceMs`).
- To force static mode:
  - Set `STATIC_MODE=1` in `.env` or PowerShell (for demos / no-internet mode).

---

With this setup, you can start the backend, open the frontend, press Start, speak your answer, pause, and the app will auto-stop, transcribe, correct (via Llama JSON mode by default), score, and speak back the corrected sentence while saving attempts to MongoDB.
