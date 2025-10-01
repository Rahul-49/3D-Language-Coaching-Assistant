# Gemini client placeholder. Replace with google-generativeai usage.

import os
import textwrap
import google.generativeai as genai

_model = None

def _get_model():
    global _model
    if _model is not None:
        return _model
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    _model = genai.GenerativeModel(name)
    return _model

def generate_feedback(scores: dict, mistakes: list) -> str:
    """
    Generate a short, motivational feedback paragraph personalized to the user's performance.
    If Google Generative AI is unavailable, return a helpful default message.
    """
    model = _get_model()
    if model is None:
        return (
            "Great job completing the interview! Focus on the areas mentioned in the report and keep practicing. "
            "With steady effort, your fluency and confidence will grow!"
        )

    try:
        prompt = textwrap.dedent(
            f"""
            You are a supportive English coach. Based on the assessment below, write a concise, encouraging
            feedback paragraph (3-4 sentences). Mention 1-2 key strengths and 2-3 specific, actionable tips.
            Keep the tone positive and practical.
            If user speaks any censored words, profanity, or any other inappropriate language, please politely ignore and reply with "I am not sure about that retry.
            If user asks any other question unrelated to english, please politely ignore and reply with "I am not sure about that retry.
            
            Scores (0-100): {scores}
            Common mistakes: {mistakes}
            """
        ).strip()
        resp = model.generate_content(prompt)
        text = (resp.text or "").strip() if resp else ""
        if text:
            return text
    except Exception:
        pass

    return (
        "Great job completing the interview! Focus on adding missing articles and smoothing your phrasing. "
        "Practice pronouncing tricky words and aim for steady, natural pacing. Your ideas are clear—keep it up!"
    )
