"""
ReFlow V1 Authentication & User Controller
Enforces real JWT authentication, MongoDB user persistence, role governance, and audit logging.
"""

import re
import uuid
from datetime import datetime
from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from backend.repositories.user_repository import user_repo
from backend.repositories.audit_repository import audit_repo
from backend.domain.auth_decorators import role_required
from backend.schemas.common import make_success, make_error

auth_v1_bp = Blueprint("auth_v1", __name__, url_prefix="/api/v1")

@auth_v1_bp.route("/auth/signup", methods=["POST"])
def signup():
    """
    POST /api/v1/auth/signup
    Registers a new operational user in MongoDB.
    Enforces password strength and role registration governance:
    MANAGER: restricted/admin-created
    SUPERVISOR: controlled self-registration
    SERVICE_PERSON: controlled self-registration
    """
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    username = data.get("username", "").strip().lower()
    email = data.get("email", "").strip().lower() or f"{username}@reflow.io"
    password = data.get("password", "").strip()
    confirm_password = data.get("confirm_password", "").strip()
    role = data.get("role", "SUPERVISOR").strip().upper()
    admin_invite_code = data.get("admin_invite_code", "").strip()

    # 1. Validation
    if not full_name:
        return make_error("VALIDATION_ERROR", "Full name is required.", status_code=400)
    if not username or len(username) < 3:
        return make_error("VALIDATION_ERROR", "Username must be at least 3 characters long.", status_code=400)
    if not password:
        return make_error("VALIDATION_ERROR", "Password is required.", status_code=400)
    if password != confirm_password:
        return make_error("PASSWORD_MISMATCH", "Passwords do not match.", status_code=400)
    if len(password) < 8:
        return make_error("WEAK_PASSWORD", "Password must be at least 8 characters long.", status_code=400)
    if not (re.search(r"[A-Za-z]", password) and re.search(r"\d", password)):
        return make_error("WEAK_PASSWORD", "Password must contain both letters and digits.", status_code=400)

    # 2. Role Governance
    valid_roles = ["MANAGER", "SUPERVISOR", "SERVICE_PERSON"]
    if role not in valid_roles:
        return make_error("INVALID_ROLE", f"Role must be one of {valid_roles}", status_code=400)

    # Restriction: MANAGER accounts cannot be freely self-created without authorized code
    if role == "MANAGER":
        valid_admin_codes = ["REFLOW-PLANT-ADMIN-2026", "REFLOW-MANAGER-KEY"]
        if admin_invite_code not in valid_admin_codes:
            return make_error(
                "FORBIDDEN",
                "Manager accounts cannot be self-registered without administrator authorization. "
                "Please register as SUPERVISOR or SERVICE_PERSON, or use the seeded demo manager account.",
                status_code=403
            )

    # 3. Uniqueness Check
    existing_user = user_repo.get_by_username(username)
    if existing_user:
        return make_error("CONFLICT", f"Username '{username}' already exists.", status_code=409)

    # 4. Create User in MongoDB
    new_user = user_repo.create_or_update(
        username=username,
        password=password,
        role=role,
        email=email,
        full_name=full_name
    )

    # 5. Issue JWT
    user_id = str(new_user.get("id", str(uuid.uuid4())[:8]))
    access_token = create_access_token(
        identity=user_id,
        additional_claims={
            "role": role,
            "username": username,
            "name": full_name
        }
    )
    refresh_token = create_refresh_token(identity=user_id)

    # 6. Audit Log
    audit_repo.record_event(
        action="SIGNUP",
        actor=username,
        role=role,
        entity="USER",
        entity_id=user_id,
        metadata={"email": email, "full_name": full_name}
    )

    return make_success({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "username": username,
            "role": role,
            "full_name": full_name,
            "email": email
        }
    }, status_code=201)

@auth_v1_bp.route("/auth/login", methods=["POST"])
def login():
    """
    POST /api/v1/auth/login
    Authenticates user against MongoDB and returns JWT access + refresh tokens.
    """
    data = request.get_json() or {}
    username = data.get("username", "").strip().lower()
    password = data.get("password", "").strip()

    if not username or not password:
        return make_error("VALIDATION_ERROR", "Username and password are required.", status_code=400)

    user = user_repo.get_by_username(username)
    if not user or not user_repo.verify_password(user, password):
        return make_error("INVALID_CREDENTIALS", "Invalid username or password.", status_code=401)

    user_id = str(user.get("id", str(user.get("_id"))))
    access_token = create_access_token(
        identity=user_id,
        additional_claims={
            "role": user["role"],
            "username": user["username"],
            "name": user.get("full_name", user["username"])
        }
    )
    refresh_token = create_refresh_token(identity=user_id)

    audit_repo.record_event(
        action="LOGIN",
        actor=user["username"],
        role=user["role"],
        entity="USER",
        entity_id=user_id
    )

    return make_success({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "username": user["username"],
            "role": user["role"],
            "full_name": user.get("full_name", user["username"]),
            "email": user.get("email")
        }
    })

@auth_v1_bp.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """
    POST /api/v1/auth/refresh
    Refreshes expired access token using valid refresh token.
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id)
    if not user:
        return make_error("RESOURCE_NOT_FOUND", "User not found.", status_code=404)

    new_access_token = create_access_token(
        identity=user_id,
        additional_claims={
            "role": user["role"],
            "username": user["username"],
            "name": user.get("full_name", user["username"])
        }
    )
    return make_success({"access_token": new_access_token})

@auth_v1_bp.route("/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    """
    POST /api/v1/auth/logout
    Records logout in audit trail.
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id)
    actor = user.get("username", "unknown") if user else "user"
    role = user.get("role", "OPERATOR") if user else "OPERATOR"

    audit_repo.record_event(
        action="LOGOUT",
        actor=actor,
        role=role,
        entity="USER",
        entity_id=str(user_id)
    )
    return make_success({"message": "Successfully logged out."})

@auth_v1_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def me():
    """
    GET /api/v1/auth/me
    Retrieves current authenticated user profile from MongoDB.
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id)
    if not user:
        return make_error("RESOURCE_NOT_FOUND", "User not found.", status_code=404)

    return make_success({
        "user": {
            "id": str(user.get("id", user_id)),
            "username": user["username"],
            "role": user["role"],
            "full_name": user.get("full_name", user["username"]),
            "email": user.get("email")
        }
    })

@auth_v1_bp.route("/users", methods=["GET"])
@role_required("MANAGER", "SUPERVISOR")
def list_users():
    """
    GET /api/v1/users
    Returns all registered users (passwords omitted). Restricted to MANAGER and SUPERVISOR.
    """
    users = user_repo.get_all_safe()
    return make_success(users, meta={"total": len(users)})
