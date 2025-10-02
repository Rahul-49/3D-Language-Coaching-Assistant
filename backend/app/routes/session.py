from flask import Blueprint, request, jsonify
from ..db.mongo import get_db
from ..utils.jwt_auth import require_auth, optional_auth
from datetime import datetime
import uuid
from ..services.gemini_client import generate_feedback
  
session_bp = Blueprint('session', __name__)


@session_bp.post('/start')
@require_auth
def start_session(current_user):
    """Start a new interview session for authenticated user"""
    body = request.get_json(silent=True) or {}
    avatar_url = body.get('avatar_url')
    user_id = current_user['user_id']

    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    db = get_db()
    
    session_doc = {
        'session_id': session_id,
        'user_id': user_id,
        'email': current_user.get('email'),
        'avatar_url': avatar_url,
        'started_at': datetime.utcnow().isoformat() + 'Z',
        'status': 'active'
    }
    db.sessions.insert_one(session_doc)

    return jsonify({
        'session_id': session_id,
        'message': 'session started'
    })


@session_bp.post('/end')
@require_auth
def end_session(current_user):
    """End an interview session and calculate final scores"""
    body = request.get_json(silent=True) or {}
    session_id = body.get('session_id')
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400

    db = get_db()
    
    # Verify session belongs to current user
    session = db.sessions.find_one({'session_id': session_id})
    if not session:
        return jsonify({'error': 'session not found'}), 404
    
    if session.get('user_id') != current_user['user_id']:
        return jsonify({'error': 'unauthorized'}), 403

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

    # Update session with final scores and status
    db.sessions.update_one({'session_id': session_id}, {
        '$set': {
            'status': 'completed',
            'ended_at': datetime.utcnow().isoformat() + 'Z',
            'final_scores': scores,
            'feedback': feedback,
            'total_attempts': len(attempts)
        }
    })

    return jsonify({'message': 'session ended', 'scores': scores, 'feedback': feedback})


@session_bp.get('/history')
@require_auth
def get_session_history(current_user):
    """Get all sessions for the authenticated user"""
    db = get_db()
    
    # Get all sessions for this user, sorted by most recent first
    sessions = list(db.sessions.find(
        {'user_id': current_user['user_id']},
        {'_id': 0}  # Exclude MongoDB _id field
    ).sort('started_at', -1))
    
    return jsonify({'sessions': sessions})


@session_bp.get('/<session_id>')
@require_auth
def get_session_details(current_user, session_id):
    """Get detailed information about a specific session"""
    db = get_db()
    
    # Get session
    session = db.sessions.find_one({'session_id': session_id}, {'_id': 0})
    if not session:
        return jsonify({'error': 'session not found'}), 404
    
    # Verify session belongs to current user
    if session.get('user_id') != current_user['user_id']:
        return jsonify({'error': 'unauthorized'}), 403
    
    # Get all attempts for this session
    attempts = list(db.attempts.find(
        {'session_id': session_id},
        {'_id': 0}
    ).sort('timestamp', 1))
    
    return jsonify({
        'session': session,
        'attempts': attempts
    })
