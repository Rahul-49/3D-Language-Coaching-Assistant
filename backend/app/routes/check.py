from flask import Blueprint, request, jsonify
import os
from datetime import datetime
from ..db.mongo import get_db
from ..services.stt import transcribe_audio
from ..services.moderation import is_allowed
from ..services.grammar import analyze_grammar
from ..services.semantic import semantic_score
from ..services.aligner import pronunciation_score
from ..services.tts import synthesize_tts
import json
import requests

check_bp = Blueprint('check', __name__)


@check_bp.post('/check')
def check_answer():
    # Expected multipart/form-data with fields: session_id, question, audio(optional), transcript(optional)
    session_id = request.form.get('session_id')
    question = request.form.get('question')
    provided_transcript = request.form.get('transcript')
    audio = request.files.get('audio')
    if not session_id or not question:
        return jsonify({'error': 'session_id and question required'}), 400

    # STT
    transcript = provided_transcript
    if not transcript and audio:
        transcript = transcribe_audio(audio)

    if not transcript:
        return jsonify({'error': 'no transcript provided or derived'}), 400

    # Moderation
    if not is_allowed(transcript):
        return jsonify({'action': 'retry', 'reason': 'moderation'}), 200

    # Local helper to generate a spoken feedback line based on scores/mistakes
    def make_feedback_text(corr_text: str, score: int, mistakes_list):
        try:
            mcount = len(mistakes_list or [])
        except Exception:
            mcount = 0
        if score >= 85 and mcount == 0:
            prefix = "Great job! That sounds good."
        elif score >= 70:
            prefix = "Good attempt—you can improve."
        else:
            prefix = "Let's improve this."
        corr_text = corr_text or ""
        return f"{prefix} Try this: {corr_text}".strip()

    # Static mode: echo user transcript and use fixed scores
    if os.getenv('STATIC_MODE') == '1':
        correction = transcript
        grammar_score = int(os.getenv('STATIC_GRAMMAR', '85'))
        fluency = int(os.getenv('STATIC_FLUENCY', '80'))
        sem_score = int(os.getenv('STATIC_SEMANTIC', '80'))
        pron_score = int(os.getenv('STATIC_PRONUNCIATION', '75'))
        mistakes = []

        db = get_db()
        attempt = {
            'session_id': session_id,
            'question': question,
            'transcript': transcript,
            'correction': correction,
            'mistakes': mistakes,
            'scores': {
                'grammar': grammar_score,
                'pronunciation': pron_score,
                'semantic': sem_score,
                'fluency': fluency
            },
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        db.attempts.insert_one(attempt)

        feedback_text = make_feedback_text(correction, grammar_score, mistakes)
        speak_text = f"{feedback_text}"
        tts = synthesize_tts(speak_text)
        return jsonify({
            'transcript': transcript,
            'correction': correction,
            'mistakes': mistakes,
            'scores': attempt['scores'],
            'tts': tts,
            'feedback_text': feedback_text
        })

    # Prefer Gemini path when GOOGLE_API_KEY is configured (bypass Llama)
    if os.getenv('GOOGLE_API_KEY'):
        analysis = analyze_grammar(transcript)
        correction = analysis['correction']
        grammar_score = analysis['score']
        fluency = analysis.get('fluency', 70)
        mistakes = analysis.get('mistakes', [])
        diff_html = analysis.get('diff_html', '')

        sem_score = semantic_score(question, transcript)
        pron_score = pronunciation_score(transcript, correction)

        db = get_db()
        attempt = {
            'session_id': session_id,
            'question': question,
            'transcript': transcript,
            'correction': correction,
            'mistakes': mistakes,
            'scores': {
                'grammar': grammar_score,
                'pronunciation': pron_score,
                'semantic': sem_score,
                'fluency': fluency
            },
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        db.attempts.insert_one(attempt)

        feedback_text = make_feedback_text(correction, grammar_score, mistakes)
        speak_text = f"{feedback_text}"
        tts = synthesize_tts(speak_text)
        return jsonify({
            'transcript': transcript,
            'correction': correction,
            'mistakes': mistakes,
            'scores': attempt['scores'],
            'tts': tts,
            'feedback_text': feedback_text
        })

    # Llama mode via local Ollama server
    if os.getenv('LLAMA_MODE', '1') == '1':
        llama_url = os.getenv('LLAMA_URL', 'http://localhost:11434/api/generate')
        llama_model = os.getenv('LLAMA_MODEL', 'llama3.1')
        base_prompt = (
            "You are an English grammar editor. Give a answer based on the grammar and semantics of input, output STRICT JSON only with keys:\n"
            "Correct the grammer and semantics of input and return it.\n"
            "correction: string (a rewritten, corrected answer of user input; NEVER identical to input),\n"
            "score: integer 0-100 (grammar quality),\n"
            "fluency: integer 0-100,\n"
            "mistakes: array of short strings (what you fixed).\n"
            "Always rewrite even if the input seems correct by slightly improving phrasing.\n\n"
            "Don't extend more than number in lines given in the input.\n"
            f"Answer: {transcript}\n"
            "Output:"
        )
        payload = {
            'model': llama_model,
            'prompt': base_prompt,
            'format': 'json',
            'options': {
                'temperature': 0.2,
                'num_ctx': 4096
            },
            'stream': False
        }
        correction = transcript
        grammar_score = 85
        fluency = 80
        mistakes = []
        try:
            resp = requests.post(llama_url, json=payload, timeout=25)
            if resp.ok:
                text = resp.json().get('response', '')
                cleaned = "\n".join([ln for ln in text.splitlines() if not ln.strip().startswith('```')]).strip()
                data = json.loads(cleaned)
                corr = str(data.get('correction', transcript)) or transcript
                # Safeguard: if model echoes input, reprompt once with stronger instruction
                if corr.strip().lower() == transcript.strip().lower():
                    reprompt = base_prompt + "\nRewrite to improve clarity and correctness. Do not copy the original."
                    payload['prompt'] = reprompt
                    resp2 = requests.post(llama_url, json=payload, timeout=25)
                    if resp2.ok:
                        t2 = resp2.json().get('response', '')
                        cleaned2 = "\n".join([ln for ln in t2.splitlines() if not ln.strip().startswith('```')]).strip()
                        data2 = json.loads(cleaned2)
                        corr = str(data2.get('correction', corr)) or corr
                        data = data2
                correction = corr
                grammar_score = int(float(data.get('score', grammar_score)))
                fluency = int(float(data.get('fluency', fluency)))
                m = data.get('mistakes')
                mistakes = m if isinstance(m, list) else mistakes
        except Exception:
            # If parsing fails repeatedly, ensure we at least tweak the sentence minimally
            if correction == transcript and correction:
                if not correction.endswith('.'):
                    correction = correction + '.'

        # Semantic and pronunciation using existing heuristics/services
        sem_score = semantic_score(question, transcript)
        pron_score = pronunciation_score(transcript, correction)

        db = get_db()
        attempt = {
            'session_id': session_id,
            'question': question,
            'transcript': transcript,
            'correction': correction,
            'mistakes': mistakes,
            'scores': {
                'grammar': grammar_score,
                'pronunciation': pron_score,
                'semantic': sem_score,
                'fluency': fluency
            },
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        db.attempts.insert_one(attempt)

        feedback_text = make_feedback_text(correction, grammar_score, mistakes)
        speak_text = f"{feedback_text}"
        tts = synthesize_tts(speak_text)
        return jsonify({
            'transcript': transcript,
            'correction': correction,
            'mistakes': mistakes,
            'scores': attempt['scores'],
            'tts': tts,
            'feedback_text': feedback_text
        })

    # Grammar + correction
    analysis = analyze_grammar(transcript)
    correction = analysis['correction']
    grammar_score = analysis['score']
    fluency = analysis.get('fluency', 70)
    mistakes = analysis.get('mistakes', [])
    diff_html = analysis.get('diff_html', '')

    # Semantic similarity against question intent (placeholder)
    sem_score = semantic_score(question, transcript)

    # Pronunciation scoring (placeholder forced alignment)
    pron_score = pronunciation_score(transcript, correction)

    # Save attempt
    db = get_db()
    attempt = {
        'session_id': session_id,
        'question': question,
        'transcript': transcript,
        'correction': correction,
        'mistakes': mistakes,
        'scores': {
            'grammar': grammar_score,
            'pronunciation': pron_score,
            'semantic': sem_score,
            'fluency': fluency
        },
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
    db.attempts.insert_one(attempt)

    # TTS for correction
    feedback_text = make_feedback_text(correction, grammar_score, mistakes)
    speak_text = f"{feedback_text}"
    tts = synthesize_tts(speak_text)

    return jsonify({
        'transcript': transcript,
        'correction': correction,
        'mistakes': mistakes,
        'scores': attempt['scores'],
        'tts': tts,  # { 'audio_b64': '...', 'visemes': [...] }
        'feedback_text': feedback_text
    })
