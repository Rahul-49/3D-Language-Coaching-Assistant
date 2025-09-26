import os
import numpy as np
import google.generativeai as genai

_embeddings_model = None

def _get_embeddings_model():
    global _embeddings_model
    if _embeddings_model is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            # Without API key, fallback to heuristic
            return None
        genai.configure(api_key=api_key)
        _embeddings_model = "text-embedding-004"
    return _embeddings_model

def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)

def semantic_score(question: str, answer: str) -> int:
    if not answer or not question:
        return 0

    model = _get_embeddings_model()
    if model is None:
        # Fallback simple overlap heuristic
        qs = set(question.lower().split())
        as_ = set(answer.lower().split())
        overlap = len(qs & as_)
        denom = len(qs | as_) or 1
        return int(round(100 * overlap / denom))

    try:
        q_emb = genai.embed_content(model=model, content=question)["embedding"]
        a_emb = genai.embed_content(model=model, content=answer)["embedding"]
        sim = _cosine_sim(np.array(q_emb, dtype=float), np.array(a_emb, dtype=float))
        score = int(round(max(0.0, min(1.0, (sim + 1) / 2)) * 100))
        return score
    except Exception:
        # On any failure, fallback
        qs = set(question.lower().split())
        as_ = set(answer.lower().split())
        overlap = len(qs & as_)
        denom = len(qs | as_) or 1
        return int(round(100 * overlap / denom))
