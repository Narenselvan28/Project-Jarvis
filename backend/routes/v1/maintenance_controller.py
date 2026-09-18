"""
V1 Maintenance Work Orders Controller
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.repositories.maintenance_repository import maintenance_repo
from backend.repositories.user_repository import user_repo
from backend.services.maintenance_service import maintenance_service
from backend.schemas.common import make_success, make_error
from backend.domain.errors import DomainError

maintenance_v1_bp = Blueprint("maintenance_v1", __name__, url_prefix="/api/v1")

@maintenance_v1_bp.route("/maintenance", methods=["GET"])
def list_maintenance():
    status = request.args.get("status")
    orders = maintenance_repo.get_all(status=status)
    return make_success(orders, meta={"count": len(orders)})

@maintenance_v1_bp.route("/maintenance/<string:wo_id>", methods=["GET"])
def get_work_order(wo_id):
    wo = maintenance_repo.get_by_id(wo_id)
    if not wo:
        return make_error("RESOURCE_NOT_FOUND", f"Work order '{wo_id}' not found.", status_code=404)
    return make_success(wo)

@maintenance_v1_bp.route("/maintenance", methods=["POST"])
@jwt_required()
def create_work_order():
    data = request.get_json() or {}
    machine_id = data.get("machine_id")
    if not machine_id:
        return make_error("VALIDATION_ERROR", "Machine ID is required.", status_code=400)

    wo = maintenance_service.create_work_order(
        machine_id=machine_id,
        disruption_id=data.get("disruption_id"),
        fault_type=data.get("fault_type", "Mechanical Breakdown"),
        priority=data.get("priority", "HIGH"),
        estimated_hours=float(data.get("estimated_hours", 4.0)),
        assigned_to=data.get("assigned_to")
    )
    return make_success(wo, status_code=201)

@maintenance_v1_bp.route("/maintenance/<string:wo_id>/status", methods=["PATCH"])
@jwt_required()
def update_work_order_status(wo_id):
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "service", "role": "SERVICE_PERSON"}
    data = request.get_json() or {}
    new_status = data.get("status")

    if not new_status:
        return make_error("VALIDATION_ERROR", "Field 'status' is required.", status_code=400)

    try:
        updated = maintenance_service.update_work_order_status(
            work_order_id=wo_id,
            new_status=new_status,
            notes=data.get("notes"),
            assigned_to=data.get("assigned_to"),
            actual_hours=data.get("actual_hours"),
            user=user
        )
        return make_success(updated)
    except DomainError as de:
        return make_error(de.code, de.message, details=de.details, status_code=de.status_code)
    except Exception as e:
        return make_error("INTERNAL_ERROR", str(e), status_code=500)
