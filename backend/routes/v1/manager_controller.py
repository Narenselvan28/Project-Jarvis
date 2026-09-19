"""
V1 Manager Controller
Handles Manager-specific actions: Disruption Simulation and Recovery Decisioning
"""

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from backend.repositories.user_repository import user_repo
from backend.repositories.disruption_repository import disruption_repo
from backend.services.disruption_service import disruption_service
from backend.schemas.common import make_success, make_error
from backend.domain.auth_decorators import role_required
from backend.database.mongo import get_collection

manager_v1_bp = Blueprint("manager_v1", __name__, url_prefix="/api/v1")

@manager_v1_bp.route("/manager/simulate-disruption", methods=["POST"])
@role_required("MANAGER", "ADMIN")
def simulate_machine_failure():
    """
    POST /api/v1/manager/simulate-disruption
    Triggers machine breakdown simulation, recalculates affected orders,
    generates CP-SAT Option A & Option B, creates maintenance work order,
    and returns full recovery options.
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    data = request.get_json() or {}

    machine_id = data.get("machine_id")
    if not machine_id:
        return make_error("VALIDATION_ERROR", "Machine ID is required for simulation.", status_code=400)

    failure_type = data.get("failure_type", "Mechanical Breakdown")
    try:
        duration_hours = float(data.get("duration_hours", data.get("downtime_hours", 4.0)))
    except (ValueError, TypeError):
        duration_hours = 4.0

    reason = data.get("reason", f"Manager simulated failure on {machine_id}")

    try:
        result = disruption_service.simulate_disruption(
            machine_id=machine_id,
            failure_type=failure_type,
            duration_hours=duration_hours,
            user=user
        )
        return make_success(result, meta={"status": "PENDING_APPROVAL"})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return make_error("SIMULATION_FAILED", str(e), status_code=500)

@manager_v1_bp.route("/recovery/<string:disruption_id>/approve", methods=["POST"])
@role_required("MANAGER", "ADMIN")
def approve_recovery_option(disruption_id):
    """
    POST /api/v1/recovery/:id/approve
    Manager approves either Option A or Option B.
    Validates PENDING_APPROVAL -> APPROVED -> ACTIVE.
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    data = request.get_json() or {}

    option = data.get("option") or data.get("option_id") or data.get("chosen_option") or "option_a"
    notes = data.get("notes", "Manager approved recovery plan")

    disruption = disruption_repo.get_by_id(disruption_id)
    if not disruption:
        return make_error("RESOURCE_NOT_FOUND", f"Disruption '{disruption_id}' not found.", status_code=404)

    curr_status = disruption.get("status", "ACTIVE")
    if curr_status not in ["ACTIVE", "PENDING_APPROVAL", "OPEN"]:
        return make_error("INVALID_STATE", f"Disruption '{disruption_id}' is already {curr_status}.", status_code=400)

    try:
        result = disruption_service.approve_recommendation(
            disruption_id=disruption_id,
            chosen_option=option.lower(),
            user=user
        )
        return make_success(result)
    except Exception as e:
        return make_error("RECOVERY_APPROVAL_FAILED", str(e), status_code=400)

@manager_v1_bp.route("/recovery/<string:disruption_id>/reject", methods=["POST"])
@role_required("MANAGER", "ADMIN")
def reject_recovery_options(disruption_id):
    """
    POST /api/v1/recovery/:id/reject
    Manager explicitly rejects proposed recovery options.
    Leaves machine FAILED and schedule unchanged. Allows regeneration.
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    data = request.get_json() or {}
    reason = data.get("reason", "Manager rejected recovery options.")

    disruption = disruption_repo.get_by_id(disruption_id)
    if not disruption:
        return make_error("RESOURCE_NOT_FOUND", f"Disruption '{disruption_id}' not found.", status_code=404)

    try:
        result = disruption_service.reject_recommendation(
            disruption_id=disruption_id,
            reason=reason,
            user=user
        )
        return make_success(result)
    except Exception as e:
        return make_error("RECOVERY_REJECTION_FAILED", str(e), status_code=400)

@manager_v1_bp.route("/recovery/<string:disruption_id>/regenerate", methods=["POST"])
@role_required("MANAGER", "ADMIN")
def regenerate_recovery_options(disruption_id):
    """
    POST /api/v1/recovery/:id/regenerate
    Re-runs the CP-SAT optimization engine against current shopfloor state.
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    
    disruption = disruption_repo.get_by_id(disruption_id)
    if not disruption:
        return make_error("RESOURCE_NOT_FOUND", f"Disruption '{disruption_id}' not found.", status_code=404)

    machine_id = disruption.get("machine_id")
    failure_type = disruption.get("failure_type", "Mechanical Breakdown")
    duration_hours = disruption.get("estimated_downtime_hours", 4.0)

    try:
        result = disruption_service.simulate_disruption(
            machine_id=machine_id,
            failure_type=failure_type,
            duration_hours=duration_hours,
            user=user
        )
        return make_success(result)
    except Exception as e:
        return make_error("REGENERATION_FAILED", str(e), status_code=500)
