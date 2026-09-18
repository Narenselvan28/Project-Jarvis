"""
V1 Admin Controller for Postman & Jury Disruption Injection
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.repositories.user_repository import user_repo
from backend.services.disruption_service import disruption_service
from backend.schemas.common import make_success, make_error
from backend.schemas.disruption_schemas import DisruptionTriggerSchema

admin_v1_bp = Blueprint("admin_v1", __name__, url_prefix="/api/v1")

@admin_v1_bp.route("/admin/disruptions", methods=["POST"])
def trigger_admin_disruption():
    """
    POST /api/v1/admin/disruptions
    Admin/Postman endpoint that executes the genuine production recovery pipeline.
    """
    raw_data = request.get_json() or {}
    try:
        req = DisruptionTriggerSchema(**raw_data)
    except Exception as e:
        return make_error("VALIDATION_ERROR", str(e), status_code=400)

    try:
        result = disruption_service.simulate_disruption(
            machine_id=req.machine_id,
            failure_type=req.failure_type,
            duration_hours=req.duration_hours,
            user={"id": "USR-ADM-01", "username": "admin", "role": "MANAGER"}
        )
        return make_success(result)
    except Exception as e:
        return make_error("PIPELINE_EXECUTION_ERROR", str(e), status_code=400)

@admin_v1_bp.route("/admin/reset", methods=["POST"])
def admin_reset_factory():
    """
    Resets the demo factory environment into deterministic known state.
    """
    from backend.seed.seed_mongo import seed_mongo
    seed_mongo()
    return make_success({"status": "FACTORY_RESET_SUCCESS", "message": "Demo scenario re-seeded successfully."})
