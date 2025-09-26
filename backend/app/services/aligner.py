# Pronunciation scoring placeholder.
# In production, use a forced-alignment library (e.g., Montreal Forced Aligner or a phoneme aligner).

def _tokenize(s: str):
    return [t.strip(".,!?;:").lower() for t in (s or "").split() if t.strip()]

def pronunciation_score(hypothesis: str, reference: str) -> int:
    """
    Deterministic proxy for pronunciation scoring based on word overlap similarity.
    Not a real pronunciation model, but provides stable, explainable scoring.
    """
    hyp = set(_tokenize(hypothesis))
    ref = set(_tokenize(reference))
    if not hyp or not ref:
        return 50
    overlap = len(hyp & ref)
    denom = len(ref)
    ratio = overlap / max(1, denom)
    # Map overlap ratio to a 50-95 range
    score = int(round(50 + ratio * 45))
    return max(0, min(100, score))
