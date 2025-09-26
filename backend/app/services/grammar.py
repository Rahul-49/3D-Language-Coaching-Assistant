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
            prompt = (
                "You are an English grammar evaluator. Given a student's answer, return STRICT JSON ONLY with keys:\n"
                "correction: string (rewritten, corrected answer),\n"
                "score: integer 0-100 (grammar quality),\n"
                "fluency: integer 0-100 (speech fluency guess),\n"
                "mistakes: array of short strings (what was wrong).\n\n"
                f"Original: {text}\n"
                "Output:"
            )
            resp = model.generate_content(prompt)
            data = _safe_parse_json((resp.text or "")) if resp else None
            if isinstance(data, dict) and "correction" in data:
                correction = str(data.get("correction", "")).strip() or text
                score = int(float(data.get("score", 80)))
                fluency = int(float(data.get("fluency", 75)))
                mistakes = data.get("mistakes") or []
                if not isinstance(mistakes, list):
                    mistakes = [str(mistakes)]
                return {"correction": correction, "score": score, "fluency": fluency, "mistakes": mistakes}
        except Exception:
            pass
 
    # Fallback heuristic
    correction = text.replace("I am student", "I am a student").replace("and like", "and I like")
    score = 75 if correction != text else 90
    fluency = 72
    mistakes = [] if correction == text else ["Missing article 'a' before 'student'", "Missing pronoun 'I' before 'like'"]
    return {"correction": correction, "score": score, "fluency": fluency, "mistakes": mistakes}
