from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.database.models import UserDB

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = UserDB.get_by_id(user_id)
            if not user or user.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden: Insufficient permissions", "required_roles": allowed_roles}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def manager_required(fn):
    return role_required("MANAGER")(fn)

def supervisor_or_manager_required(fn):
    return role_required("MANAGER", "SUPERVISOR")(fn)

def service_person_required(fn):
    return role_required("SERVICE_PERSON", "MANAGER")(fn)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = UserDB.get_by_username(username)
    if not user or not UserDB.verify_password(user, password):
        return jsonify({"error": "Invalid username or password"}), 401

    access_token = create_access_token(identity=str(user["id"]))
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    return jsonify({
        "access_token": access_token,
        "user": user_data
    }), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = UserDB.get_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    return jsonify({"user": user_data}), 200
