from flask import Blueprint, request, jsonify
from ..services.tts import synthesize_tts


tts_bp = Blueprint('tts', __name__)


@tts_bp.post('/tts')
def tts_endpoint():
    data = request.get_json(silent=True) or {}
    text = data.get('text')
    if not text or not isinstance(text, str):
        return jsonify({"error": "text is required"}), 400
    try:
        result = synthesize_tts(text)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
