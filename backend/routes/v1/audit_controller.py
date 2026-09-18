"""
Audit Log Controller - V1
Provides audit and governance trail querying from MongoDB.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from backend.repositories.audit_repository import audit_repo
from backend.domain.auth_decorators import role_required

audit_v1_bp = Blueprint("audit_v1", __name__, url_prefix="/api/v1/audit")

@audit_v1_bp.route("", methods=["GET"])
@jwt_required()
def get_audit_logs():
    """
    Returns recent audit logs recorded in MongoDB.
    Supports filtering by action and entity, with pagination limit.
    """
    try:
        limit = int(request.args.get("limit", 100))
    except (ValueError, TypeError):
        limit = 100

    action = request.args.get("action")
    entity = request.args.get("entity")

    logs = audit_repo.get_recent_logs(limit=limit, entity=entity, action=action)

    # Format fields cleanly for frontend
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": log.get("id", str(log.get("_id", ""))),
            "timestamp": log.get("timestamp"),
            "created_at": log.get("timestamp"),
            "actor": log.get("actor", "SYSTEM"),
            "username": log.get("actor", "SYSTEM"),
            "role": log.get("role", "SYSTEM"),
            "action": log.get("action", "UNKNOWN"),
            "entity_type": log.get("entity", "-"),
            "entity_id": log.get("entity_id", "-"),
            "before": log.get("before"),
            "after": log.get("after"),
            "details": log.get("metadata", {}),
            "request_id": log.get("request_id")
        })

    return jsonify({
        "status": "success",
        "total": len(formatted_logs),
        "audit_logs": formatted_logs
    }), 200
