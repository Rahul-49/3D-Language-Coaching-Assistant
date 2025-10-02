from flask import Blueprint, request, jsonify
from ..db.mongo import get_db
from ..utils.jwt_auth import create_jwt_token, require_auth
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from datetime import datetime


auth_bp = Blueprint('auth', __name__)


def _public_user(u):
    return {
        'user_id': u.get('user_id'),
        'email': u.get('email'),
        'created_at': u.get('created_at')
    }


@auth_bp.post('/signup')
def signup():
    body = request.get_json(silent=True) or {}
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400

    db = get_db()
    existing = db.users.find_one({'email': email})
    if existing:
        return jsonify({'error': 'email already registered'}), 409

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = generate_password_hash(password)
    user = {
        'user_id': user_id,
        'email': email,
        'password_hash': password_hash,
        'created_at': datetime.utcnow().isoformat() + 'Z'
    }
    db.users.insert_one(user)

    # Create JWT token for auto-login after signup
    token = create_jwt_token(user_id, email)

    return jsonify({'token': token, 'user': _public_user(user)})


@auth_bp.post('/login')
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    if not email or not password:
        return jsonify({'error': 'email and password required'}), 400

    db = get_db()
    user = db.users.find_one({'email': email})
    if not user or not check_password_hash(user.get('password_hash', ''), password):
        return jsonify({'error': 'invalid credentials'}), 401

    # Create JWT token
    token = create_jwt_token(user['user_id'], email)

    return jsonify({'token': token, 'user': _public_user(user)})


@auth_bp.get('/me')
@require_auth
def me(current_user):
    """Get current authenticated user info"""
    return jsonify({'user': _public_user(current_user)})


