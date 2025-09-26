from flask import Blueprint, request, jsonify
from ..db.mongo import get_db
from datetime import datetime
import uuid
from ..services.gemini_client import generate_feedback
  
session_bp = Blueprint('session', __name__)


@session_bp.post('/start')
def start_session():
    body = request.get_json(silent=True) or {}
    avatar_url = body.get('avatar_url')
    user_id = body.get('user_id', 'anonymous')

    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    db = get_db()
    db.sessions.insert_one({
        'session_id': session_id,
        'user_id': user_id,
        'avatar_url': avatar_url,
        'started_at': datetime.utcnow().isoformat() + 'Z',
        'status': 'active'
    })

    return jsonify({
        'session_id': session_id,
        'message': 'session started'
    })


@session_bp.post('/end')
def end_session():
    body = request.get_json(silent=True) or {}
    session_id = body.get('session_id')
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400

    db = get_db()
    db.sessions.update_one({'session_id': session_id}, {
        '$set': {'status': 'completed', 'ended_at': datetime.utcnow().isoformat() + 'Z'}
    })

    # Aggregate scores
    attempts = list(db.attempts.find({'session_id': session_id}))
    def avg(key):
        vals = [a.get('scores', {}).get(key) for a in attempts if a.get('scores', {}).get(key) is not None]
        return round(sum(vals) / len(vals), 2) if vals else 0

    scores = {
        'grammar': avg('grammar'),
        'pronunciation': avg('pronunciation'),
        'semantic': avg('semantic'),
        'fluency': avg('fluency')
    }
    scores['final'] = round(sum(scores.values()) / 4, 2) if any(scores.values()) else 0

    # Aggregate mistakes
    all_mistakes = []
    for a in attempts:
        ms = a.get('mistakes') or []
        if isinstance(ms, list):
            all_mistakes.extend(ms)

    # Generate feedback text
    feedback = generate_feedback(scores, all_mistakes)

    return jsonify({'message': 'session ended', 'scores': scores, 'feedback': feedback})
