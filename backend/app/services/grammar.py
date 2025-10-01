# Grammar analysis and correction placeholder
# Later connect to local Llama 3.1 + rules + your knowledge base
 
import os
import json
from typing import Dict
 
import google.generativeai as genai
 
_gen_model = None
 
 
def _get_model():
    global _gen_model
    if _gen_model is not None:
       return _gen_model

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
       return None
    genai.configure(api_key=api_key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    _gen_model = genai.GenerativeModel(model_name)
    return _gen_model


def _safe_parse_json(s: str):
    s = s.strip()
    if s.startswith("```"):
       lines = []
       for line in s.splitlines():
           if line.strip().startswith("```"):
               continue
           lines.append(line)
       s = "\n".join(lines).strip()
    try:
       return json.loads(s)
    except Exception:
       return None
 
 
def analyze_grammar(text: str) -> Dict:
    """
    Analyze grammar using Google Generative AI if configured. Expected output:
    {
      "correction": str,
      "score": int (0-100),
      "fluency": int (0-100),
      "mistakes": [str]
    }
    Falls back to simple rule-based correction if API is not configured or fails.
    """
    model = _get_model()
    if model is not None and text:
        try:
            import time
            t0 = time.time()
            prompt = (
                "You are an English grammar evaluator. Given a student's answer, return STRICT JSON ONLY with keys:\n"
                "correction: string (rewritten, corrected answer),\n"
                "score: integer 0-100 (grammar quality),\n"
                "fluency: integer 0-100 (speech fluency guess),\n"
                "mistakes: array of short strings (what was wrong).\n\n"
                "IMPORTANT: If the input contains ANY profanity, swear words, or inappropriate language:\n"
                "- Set correction to EXACTLY: 'I am not sure about that, please retry.'\n"
                "- Set score to 0\n"
                "- Set mistakes to ['inappropriate language']\n"
                "- Do NOT provide the actual corrected profane sentence\n\n"
                "If user asks questions unrelated to English learning:\n"
                "- Set correction to EXACTLY: 'I am not sure about that, please retry.'\n"
                "- Set score to 0\n\n"
                f"Original: {text}\n"
                "Output:"
            )
            # Add request timeout to avoid hangs
            try:
                resp = model.generate_content(prompt, request_options={"timeout": float(os.getenv("GEMINI_TIMEOUT_SEC", "12"))})
            except TypeError:
                # Older SDKs may not support request_options; fall back without it
                resp = model.generate_content(prompt)
            raw_response = (resp.text or "") if resp else ""
            print(f"[GRAMMAR] Raw Gemini response: {raw_response}")
            data = _safe_parse_json(raw_response)
            print(f"[GRAMMAR] Parsed data: {data}")
            if isinstance(data, dict) and "correction" in data:
                correction = str(data.get("correction", "")).strip() or text
                score = int(float(data.get("score", 80)))
                fluency = int(float(data.get("fluency", 75)))
                mistakes = data.get("mistakes") or []
                if not isinstance(mistakes, list):
                    mistakes = [str(mistakes)]
                
                # Safety check: if correction still contains profanity, override it
                from .moderation import is_allowed
                if not is_allowed(correction) and correction != "I am not sure about that, please retry.":
                    print(f"[GRAMMAR] Safety override: correction contained profanity")
                    correction = "I am not sure about that, please retry."
                    score = 0
                    mistakes = ["inappropriate language"]
                
                dt = time.time() - t0
                print(f"[GRAMMAR] Gemini analysis completed in {dt:.2f}s")
                return {"correction": correction, "score": score, "fluency": fluency, "mistakes": mistakes}
        except Exception as e:
            print(f"[GRAMMAR] Gemini analysis failed: {e}")
 
    # Fallback heuristic
    correction = text.replace("I am student", "I am a student").replace("and like", "and I like")
    score = 75 if correction != text else 90
    fluency = 72
    mistakes = [] if correction == text else ["Missing article 'a' before 'student'", "Missing pronoun 'I' before 'like'"]
    return {"correction": correction, "score": score, "fluency": fluency, "mistakes": mistakes}
