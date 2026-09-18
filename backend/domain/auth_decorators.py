"""
ReFlow RBAC Authentication & Authorization Decorators
"""

from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from backend.repositories.user_repository import user_repo

def role_required(*allowed_roles):
    """
    Decorator enforcing that the caller possesses one of the allowed roles.
    Extracts identity and claims from JWT.
    Returns HTTP 403 if role is unauthorized, or 401 if token is missing/invalid.
    """
    normalized_allowed = {r.upper().replace(" ", "_") for r in allowed_roles}
    # Also support aliases e.g. SERVICE PERSON -> SERVICE_PERSON
    if "SERVICE_PERSON" in normalized_allowed:
        normalized_allowed.add("SERVICE")
        normalized_allowed.add("SERVICE_PERSON")

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Authentication required. Please provide a valid JWT access token.",
                        "details": str(e)
                    }
                }), 401

            claims = get_jwt()
            role = claims.get("role")
            if not role:
                user_id = get_jwt_identity()
                user = user_repo.get_by_id(user_id)
                role = user.get("role") if user else None

            if not role:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "User role could not be verified from token claims."
                    }
                }), 403

            norm_role = role.upper().replace(" ", "_")
            if norm_role not in normalized_allowed and "ALL" not in normalized_allowed:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": f"Access denied: Action requires one of {list(allowed_roles)}, but user has role '{role}'.",
                        "required_roles": list(allowed_roles),
                        "user_role": role
                    }
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
