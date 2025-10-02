import os
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from ..db.mongo import get_db


def get_jwt_secret():
    """Get JWT secret key from environment"""
    return os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-please-change-in-production')


def create_jwt_token(user_id, email):
    """Create a JWT token for a user"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=30),  # Token expires in 30 days
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, get_jwt_secret(), algorithm='HS256')
    return token


def decode_jwt_token(token):
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user():
    """Extract current user from JWT token in Authorization header"""
    auth_header = request.headers.get('Authorization', '')
    parts = auth_header.split(' ')
    token = parts[1] if len(parts) == 2 and parts[0].lower() == 'bearer' else None
    
    if not token:
        return None
    
    payload = decode_jwt_token(token)
    if not payload:
        return None
    
    # Verify user exists in database
    db = get_db()
    user = db.users.find_one({'user_id': payload.get('user_id')})
    return user


def require_auth(f):
    """Decorator to require authentication for a route"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'unauthorized'}), 401
        
        # Add user to kwargs so route can access it
        kwargs['current_user'] = user
        return f(*args, **kwargs)
    
    return decorated_function


def optional_auth(f):
    """Decorator that optionally extracts user if authenticated"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        kwargs['current_user'] = user
        return f(*args, **kwargs)
    
    return decorated_function
