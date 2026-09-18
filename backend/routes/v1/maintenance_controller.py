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

from backend.domain.auth_decorators import role_required

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
@role_required("MANAGER", "SUPERVISOR", "SERVICE_PERSON")
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
@role_required("SERVICE_PERSON", "MANAGER", "SUPERVISOR")
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

# ============================================================
# SERVICE PERSONS & FIELD TECHNICIANS
# ============================================================

from backend.repositories.service_person_repository import service_person_repo
from backend.repositories.maintenance_invoice_repository import maintenance_invoice_repo
from backend.repositories.machine_repository import machine_repo
from backend.services.machine_service import machine_service
from backend.services.websocket_service import websocket_service
from backend.repositories.audit_repository import audit_repo
from datetime import datetime

@maintenance_v1_bp.route("/maintenance/service-persons", methods=["GET"])
def list_service_persons():
    availability = request.args.get("availability")
    sps = service_person_repo.get_all(availability=availability)
    return make_success(sps, meta={"count": len(sps)})

# ============================================================
# MAINTENANCE INVOICES & BILLING
# ============================================================

@maintenance_v1_bp.route("/maintenance/invoices", methods=["GET"])
def list_invoices():
    service_person_id = request.args.get("service_person_id")
    machine_id = request.args.get("machine_id")
    invoices = maintenance_invoice_repo.get_all(service_person_id=service_person_id, machine_id=machine_id)
    return make_success(invoices, meta={"count": len(invoices)})

@maintenance_v1_bp.route("/maintenance/invoices", methods=["POST"])
@role_required("SERVICE_PERSON", "MANAGER")
def generate_invoice():
    payload = request.get_json() or {}
    machine_id = payload.get("machine_id")
    if not machine_id:
        return make_error("VALIDATION_ERROR", "Machine ID is required.", status_code=400)

    # 1. Create Maintenance Invoice
    invoice = maintenance_invoice_repo.create_invoice(payload)

    # 2. Update Work Order if specified
    wo_id = payload.get("work_order_id") or payload.get("service_request_id")
    if wo_id:
        try:
            maintenance_repo.update_workflow(
                wo_id=wo_id,
                new_status="VERIFIED",
                notes=payload.get("remarks") or payload.get("action_taken"),
                actual_hours=float(payload.get("downtime_hours", 2.5))
            )
            maintenance_repo.update({"id": wo_id}, {"invoice_id": invoice.get("id")})
        except Exception:
            pass

    # 3. Restore Machine to AVAILABLE
    try:
        machine_service.update_machine_status(
            machine_id=machine_id,
            new_status="AVAILABLE",
            user_role="MANAGER",
            reason=f"Maintenance repair completed and billed under invoice {invoice.get('id')}."
        )
        machine_repo.update({"id": machine_id}, {
            "health_score": 98,
            "last_maintenance_date": datetime.now().strftime("%Y-%m-%d"),
            "current_order_id": None,
            "current_operation_name": None
        })
    except Exception:
        machine_repo.update_status(machine_id, "AVAILABLE")

    # 4. Update Service Person Metrics
    sp_id = payload.get("service_person_id", "SP-01")
    service_person_repo.record_repair_completed(sp_id, float(payload.get("downtime_hours", 2.5)))

    # 5. Audit Log
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "service", "role": "SERVICE_PERSON"}
    audit_repo.create_log(
        user=user,
        action="REPAIR_COMPLETED",
        entity_type="MACHINE",
        entity_id=machine_id,
        reason=f"Repair completed. Invoice {invoice.get('id')} generated (Total: ₹{invoice.get('total_cost'):,.2f}). Machine marked AVAILABLE."
    )

    # 6. Broadcast updates
    websocket_service.broadcast("maintenance.updated", {"work_order_id": wo_id, "invoice": invoice})
    websocket_service.broadcast("machine.updated", {"machine_id": machine_id, "status": "AVAILABLE"})

    return make_success(invoice, status_code=201)

