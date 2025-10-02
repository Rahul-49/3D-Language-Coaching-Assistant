from flask import Blueprint, jsonify, request
from ..db.mongo import get_db
from ..utils.jwt_auth import require_auth

onboarding_bp = Blueprint('onboarding', __name__)


@onboarding_bp.get('')
@require_auth
def get_onboarding(current_user):
    """Get onboarding status for authenticated user"""
    db = get_db()
    user_id = current_user.get('user_id')
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
@require_auth
def save_onboarding(current_user):
    """Save onboarding data for authenticated user"""
    db = get_db()
    body = request.get_json(silent=True) or {}
    update = {
        'knowledgeLevel': body.get('knowledgeLevel'),
        'goals': body.get('goals') or [],
        'preferredSessionMins': body.get('preferredSessionMins'),
    }
    if body.get('complete'):
        update['completed'] = True

    user_id = current_user.get('user_id')
    db.onboarding.update_one(
        {'user_id': user_id}, 
        {'$set': update, '$setOnInsert': {'user_id': user_id}}, 
        upsert=True
    )

    return jsonify({'ok': True, 'saved': update})
