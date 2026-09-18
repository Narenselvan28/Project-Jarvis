"""
V1 Authentication & User Controller
"""

from flask import Blueprint, request
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from backend.repositories.user_repository import user_repo
from backend.repositories.audit_repository import audit_repo
from backend.schemas.common import make_success, make_error

auth_v1_bp = Blueprint("auth_v1", __name__, url_prefix="/api/v1")

@auth_v1_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return make_error("VALIDATION_ERROR", "Username and password are required.", status_code=400)

    user = user_repo.get_by_username(username)
    if not user or not user_repo.verify_password(user, password):
        return make_error("INVALID_CREDENTIALS", "Invalid username or password.", status_code=401)

    access_token = create_access_token(identity=user["id"], additional_claims={"role": user["role"], "username": user["username"]})
    refresh_token = create_refresh_token(identity=user["id"])

    audit_repo.record_event(
        action="LOGIN",
        actor=user["username"],
        role=user["role"],
        entity="USER",
        entity_id=user["id"]
    )

    return make_success({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user.get("full_name", user["username"]),
            "email": user.get("email")
        }
    })

@auth_v1_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id)
    if not user:
        return make_error("RESOURCE_NOT_FOUND", "User not found.", status_code=404)

    return make_success({
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user.get("full_name", user["username"]),
            "email": user.get("email")
        }
    })

@auth_v1_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    users = user_repo.get_all_safe()
    return make_success(users, meta={"total": len(users)})
