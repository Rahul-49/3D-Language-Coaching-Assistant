from flask import Blueprint, jsonify, request
from ..db.mongo import get_db

onboarding_bp = Blueprint('onboarding', __name__)


def _get_user_by_token(db, request):
    auth_header = request.headers.get('Authorization') or ''
    parts = auth_header.split(' ')
    token = parts[1] if len(parts) == 2 and parts[0].lower() == 'bearer' else None
    if not token:
        return None
    return db.users.find_one({'token': token})


@onboarding_bp.get('')
def get_onboarding():
    db = get_db()
    user = _get_user_by_token(db, request)
    if not user:
        return jsonify({'error': 'unauthorized'}), 401

    user_id = user.get('user_id')
    ob = db.onboarding.find_one({'user_id': user_id}) or {}
    resp = {
        'onboardingCompleted': bool(ob.get('completed')),
        'onboarding': {
            'knowledgeLevel': ob.get('knowledgeLevel'),
            'goals': ob.get('goals') or [],
            'preferredSessionMins': ob.get('preferredSessionMins'),
        }
    }
    return jsonify(resp)


@onboarding_bp.post('')
def save_onboarding():
    db = get_db()
    user = _get_user_by_token(db, request)
    if not user:
        return jsonify({'error': 'unauthorized'}), 401

    body = request.get_json(silent=True) or {}
    update = {
        'knowledgeLevel': body.get('knowledgeLevel'),
        'goals': body.get('goals') or [],
        'preferredSessionMins': body.get('preferredSessionMins'),
    }
    if body.get('complete'):
        update['completed'] = True

    user_id = user.get('user_id')
    db.onboarding.update_one({'user_id': user_id}, {'$set': update, '$setOnInsert': {'user_id': user_id}}, upsert=True)

    return jsonify({'ok': True, 'saved': update})
