"""
V1 Disruptions & Recovery Controller
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.repositories.disruption_repository import disruption_repo
from backend.repositories.user_repository import user_repo
from backend.services.disruption_service import disruption_service
from backend.schemas.common import make_success, make_error
from backend.schemas.disruption_schemas import DisruptionApprovalSchema

disruptions_v1_bp = Blueprint("disruptions_v1", __name__, url_prefix="/api/v1")

@disruptions_v1_bp.route("/disruptions", methods=["GET"])
def list_disruptions():
    disruptions = disruption_repo.get_all()
    return make_success(disruptions, meta={"count": len(disruptions)})

@disruptions_v1_bp.route("/disruptions/active", methods=["GET"])
def get_active_disruptions():
    active = disruption_repo.find_all({"status": "ACTIVE"})
    return make_success(active)

@disruptions_v1_bp.route("/disruptions/<string:disruption_id>", methods=["GET"])
def get_disruption(disruption_id):
    disruption = disruption_repo.get_by_id(disruption_id)
    if not disruption:
        return make_error("RESOURCE_NOT_FOUND", f"Disruption '{disruption_id}' not found.", status_code=404)
    return make_success(disruption)

from backend.domain.auth_decorators import role_required

@disruptions_v1_bp.route("/disruptions/<string:disruption_id>/approve", methods=["POST"])
@role_required("MANAGER")
def approve_recovery(disruption_id):
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    raw_data = request.get_json() or {}

    try:
        appr = DisruptionApprovalSchema(**raw_data)
        result = disruption_service.approve_recommendation(
            disruption_id=disruption_id,
            chosen_option=appr.option_id,
            user=user
        )
        return make_success(result)
    except Exception as e:
        return make_error("RECOVERY_APPROVAL_FAILED", str(e), status_code=400)

@disruptions_v1_bp.route("/disruptions/<string:disruption_id>/reject", methods=["POST"])
@role_required("MANAGER")
def reject_recovery(disruption_id):
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    raw_data = request.get_json() or {}
    reason = raw_data.get("reason", "Manager rejected all recovery options")

    try:
        result = disruption_service.reject_recommendation(
            disruption_id=disruption_id,
            reason=reason,
            user=user
        )
        return make_success(result)
    except Exception as e:
        return make_error("RECOVERY_REJECTION_FAILED", str(e), status_code=400)
