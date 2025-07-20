from functools import wraps
from flask import request, jsonify
import re

def validate_json(*required_fields):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Invalid JSON data'}), 400
            
            for field in required_fields:
                if field not in data or not data[field]:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_github_url(url):
    pattern = r'^https://github\.com/[a-zA-Z0-9_-]+/[a-zA-Z0-9_.-]+/?$'
    return re.match(pattern, url) is not None
