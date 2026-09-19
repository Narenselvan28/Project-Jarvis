"""
V1 Machines Controller
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.user_repository import user_repo
from backend.services.machine_service import machine_service
from backend.ml.prediction import predict_machine_risk, predict_processing_time
from backend.optimization.candidate_machine_selector import find_candidate_machines
from backend.schemas.common import make_success, make_error
from backend.domain.errors import DomainError

machines_v1_bp = Blueprint("machines_v1", __name__, url_prefix="/api/v1")

@machines_v1_bp.route("/machines", methods=["GET"])
def list_machines():
    machines = machine_repo.get_all_machines()
    return make_success(machines, meta={"count": len(machines)})

@machines_v1_bp.route("/machines/<string:machine_id>", methods=["GET"])
def get_machine(machine_id):
    machine = machine_repo.get_by_id(machine_id)
    if not machine:
        return make_error("RESOURCE_NOT_FOUND", f"Machine '{machine_id}' not found.", status_code=404)

    # Live ML failure risk prediction
    risk = predict_machine_risk(machine)
    machine["ml_failure_risk_analysis"] = risk

    # If running an order, predict processing time with SHAP
    if machine.get("current_order_id"):
        order = order_repo.get_by_id(machine["current_order_id"])
        if order:
            active_op = next((op for op in order.get("operations", []) if op.get("assigned_machine_id") == machine_id), None)
            if active_op:
                pred = predict_processing_time(machine, order, active_op)
                machine["current_order_prediction"] = pred

    return make_success(machine)

@machines_v1_bp.route("/machines/<string:machine_id>/status", methods=["PATCH"])
@jwt_required()
def update_machine_status(machine_id):
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    data = request.get_json() or {}
    new_status = data.get("status")
    reason = data.get("reason", "Manual status change")

    if not new_status:
        return make_error("VALIDATION_ERROR", "Field 'status' is required.", status_code=400)

    try:
        success, updated = machine_service.update_machine_status(
            machine_id=machine_id,
            new_status=new_status,
            user_role=user.get("role", "MANAGER"),
            reason=reason,
            user_id=user.get("id"),
            username=user.get("username")
        )
        return make_success(updated)
    except DomainError as de:
        return make_error(de.code, de.message, details=de.details, status_code=de.status_code)
    except Exception as e:
        return make_error("INTERNAL_ERROR", str(e), status_code=500)

@machines_v1_bp.route("/machines/<string:machine_id>/candidates", methods=["GET"])
def get_machine_candidates(machine_id):
    machine = machine_repo.get_by_id(machine_id)
    if not machine:
        return make_error("RESOURCE_NOT_FOUND", f"Machine '{machine_id}' not found.", status_code=404)

    proc_id = machine.get("process_id", "P03")
    candidates = find_candidate_machines(
        failed_machine_id=machine_id,
        process_id=proc_id,
        order={"quantity": 5000, "priority": "HIGH"},
        operation={"sequence": 1},
        required_precision=machine.get("precision_level", "HIGH")
    )
    return make_success(candidates, meta={"target_machine": machine_id, "process_id": proc_id})
