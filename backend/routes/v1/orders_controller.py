"""
V1 Orders and Production Planning Controller
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.repositories.order_repository import order_repo
from backend.repositories.user_repository import user_repo
from backend.services.order_planning_service import order_planning_service
from backend.schemas.order_schemas import OrderCreateSchema, PlanGenerationRequestSchema, PlanApprovalSchema, PlanRejectSchema
from backend.schemas.common import make_success, make_error
from backend.domain.errors import DomainError

from backend.domain.auth_decorators import role_required

orders_v1_bp = Blueprint("orders_v1", __name__, url_prefix="/api/v1")

@orders_v1_bp.route("/orders", methods=["GET"])
def list_orders():
    orders = order_repo.get_all_orders()
    return make_success(orders, meta={"total_orders": len(orders)})

@orders_v1_bp.route("/orders/<string:order_id>", methods=["GET"])
def get_order(order_id):
    order = order_repo.get_by_id(order_id)
    if not order:
        return make_error("RESOURCE_NOT_FOUND", f"Order '{order_id}' not found.", status_code=404)
    return make_success(order)

@orders_v1_bp.route("/orders", methods=["POST"])
@role_required("MANAGER", "SUPERVISOR")
def create_order():
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    raw_data = request.get_json() or {}

    try:
        validated = OrderCreateSchema(**raw_data)
    except Exception as e:
        return make_error("VALIDATION_ERROR", str(e), status_code=400)

    count = order_repo.count() + 1042
    order_id = validated.order_id or f"ORD-{count}"
    order_data = {
        "id": order_id,
        "product": validated.product,
        "product_code": validated.product_code,
        "quantity": validated.quantity,
        "priority": validated.priority,
        "customer": validated.customer,
        "status": "QUEUED",
        "deadline_hours": 24.0,
        "deadline": validated.deadline
    }

    created = order_repo.create_order(order_data)
    return make_success(created, status_code=201)

@orders_v1_bp.route("/orders/plan", methods=["POST"])
@role_required("MANAGER", "SUPERVISOR")
def generate_order_plan():
    """
    Intelligence Loop 1: Automatic Production Planning
    Manager inputs order parameters -> ML predicts times -> CP-SAT optimizes allocations
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    raw_data = request.get_json() or {}

    try:
        req = PlanGenerationRequestSchema(**raw_data)
    except Exception as e:
        return make_error("VALIDATION_ERROR", str(e), status_code=400)

    plan = order_planning_service.generate_plan_for_order(
        product_name=req.product_name,
        product_code=req.product_code,
        quantity=req.quantity,
        priority=req.priority,
        deadline_str=req.deadline,
        customer=req.customer,
        user_id=user["id"],
        username=user["username"]
    )
    return make_success(plan, meta={"status": "PENDING_SUPERVISOR_APPROVAL"})

@orders_v1_bp.route("/orders/plan/<string:plan_id>/approve", methods=["POST"])
@role_required("SUPERVISOR", "MANAGER")
def approve_order_plan(plan_id):
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "supervisor", "role": "SUPERVISOR"}
    raw_data = request.get_json() or {}

    try:
        appr = PlanApprovalSchema(**raw_data)
        result = order_planning_service.approve_plan(
            plan_id=plan_id,
            operations=appr.operations,
            notes=appr.notes or "Approved",
            username=user["username"]
        )
        return make_success(result)
    except DomainError as de:
        return make_error(de.code, de.message, details=de.details, status_code=de.status_code)
    except Exception as e:
        return make_error("INTERNAL_ERROR", str(e), status_code=500)

@orders_v1_bp.route("/orders/plan/<string:plan_id>/reject", methods=["POST"])
@role_required("SUPERVISOR", "MANAGER")
def reject_order_plan(plan_id):
    raw_data = request.get_json() or {}
    reason = raw_data.get("reason", "Rejected by Supervisor")
    from backend.database.mongo import get_collection
    get_collection("planning_plans").update_one(
        {"id": plan_id},
        {"$set": {"status": "REJECTED", "rejection_reason": reason}}
    )
    return make_success({"status": "REJECTED", "plan_id": plan_id, "reason": reason})
