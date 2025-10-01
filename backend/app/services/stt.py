# Placeholder STT using faster-whisper (to be implemented)
  # For now, return a static transcript if audio provided

import os
import tempfile
from faster_whisper import WhisperModel
import subprocess
import shutil
import logging

_model = None

def _get_model():
    global _model
    if _model is None:
        model_name = os.getenv("WHISPER_MODEL", "base")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "auto")
        _model = WhisperModel(model_name, compute_type=compute_type)
    return _model

def transcribe_audio(audio_file) -> str:
    """
    Transcribe an uploaded audio file (werkzeug FileStorage) using faster-whisper.
    Returns the combined transcript text.
    """
    if not audio_file:
        return ""

    # Persist the upload to a temporary file
    suffix = os.path.splitext(getattr(audio_file, 'filename', '') or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        audio_path = tmp.name
        audio_file.save(audio_path)

    try:
        model = _get_model()
        try:
            # Try direct transcription (requires ffmpeg when format is webm/opus)
            segments, _ = model.transcribe(audio_path, language=os.getenv("WHISPER_LANG"))
        except Exception as e:
            # If direct transcription fails (likely due to missing ffmpeg), try converting to wav if ffmpeg is available
            ffmpeg = shutil.which("ffmpeg")
            if ffmpeg:
                wav_path = audio_path + ".wav"
                cmd = [ffmpeg, "-y", "-i", audio_path, "-ar", "16000", "-ac", "1", wav_path]
                try:
                    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    segments, _ = model.transcribe(wav_path, language=os.getenv("WHISPER_LANG"))
                    try:
                        os.remove(wav_path)
                    except Exception:
                        pass
                except Exception as e2:
                    logging.error(f"Failed to convert {audio_path} to wav: {e2}")
            else:
                # No ffmpeg available and direct transcription failed
                logging.error(f"Failed to transcribe {audio_path}: {e}")
                return ""
        parts = [seg.text.strip() for seg in segments if getattr(seg, 'text', '').strip()]
        return " ".join(parts)
    finally:
        try:
            os.remove(audio_path)
        except Exception:
            pass
