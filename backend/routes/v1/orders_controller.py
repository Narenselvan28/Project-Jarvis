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

from backend.repositories.material_repository import material_repo
from backend.repositories.contract_repository import contract_repo
from backend.repositories.workforce_repository import workforce_repo
from backend.services.websocket_service import websocket_service

@orders_v1_bp.route("/orders", methods=["GET"])
def list_orders():
    status = request.args.get("status")
    priority = request.args.get("priority")
    orders = order_repo.get_all_orders(status=status, priority=priority)
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
    order_id = validated.order_id or raw_data.get("id") or f"ORD-{count}"
    contract_id = raw_data.get("contract_id") or f"CON-{order_id.replace('ORD-', '')}"

    customer_name = raw_data.get("customer_name") or raw_data.get("customer") or validated.customer or "Acme Apparel Global"
    product_name = raw_data.get("product_name") or raw_data.get("product") or validated.product or "Combed Cotton Pique Polo T-Shirt"
    product_code = raw_data.get("product_code") or validated.product_code or "PRD-POLO-02"
    quantity = int(raw_data.get("quantity") or validated.quantity or 5000)
    priority = raw_data.get("priority") or validated.priority or "HIGH"
    deadline = str(raw_data.get("delivery_deadline") or raw_data.get("deadline") or validated.deadline or "2026-09-25 18:00:00")
    unit = raw_data.get("unit", "Pieces")

    req_material = raw_data.get("required_material", "100% Combed Cotton")
    req_color = raw_data.get("required_color", "Navy Blue")
    req_fabric = raw_data.get("required_fabric", "Single Jersey 180 GSM")
    req_garment = raw_data.get("required_garment_type", "Men's Regular Fit")

    # 1. Feasibility checks (BOM & Workforce)
    mat_check = material_repo.check_feasibility(req_material, quantity)
    wf_check = workforce_repo.check_capacity("Spinning", 12)

    est_cost = float(raw_data.get("estimated_production_cost", 85000.0))

    # 2. Build canonical Order Document
    order_data = {
        "id": order_id,
        "order_id": order_id,
        "customer": customer_name,
        "customer_name": customer_name,
        "product": product_name,
        "product_name": product_name,
        "product_code": product_code,
        "quantity": quantity,
        "unit": unit,
        "priority": priority,
        "status": "Scheduled",
        "production_status": "SCHEDULED",
        "erp_status": "IN_PRODUCTION",
        "deadline": deadline,
        "delivery_deadline": deadline,
        "contract_id": contract_id,
        "required_material": req_material,
        "required_color": req_color,
        "required_fabric": req_fabric,
        "required_garment_type": req_garment,
        "combing_required": bool(raw_data.get("combing_required", True)),
        "scouring_bleaching_required": bool(raw_data.get("scouring_bleaching_required", True)),
        "compacting_required": bool(raw_data.get("compacting_required", True)),
        "printing_required": bool(raw_data.get("printing_required", False)),
        "embroidery_required": bool(raw_data.get("embroidery_required", True)),
        "workforce_required": int(raw_data.get("workforce_required", 12)),
        "estimated_production_cost": est_cost,
        "actual_production_cost": est_cost,
        "deadline_status": "Safe",
        "progress_pct": 0,
        "current_stage": "Cutting",
        "created_at": raw_data.get("created_at") or raw_data.get("order_date")
    }

    # 3. Create Contract Document
    contract_repo.upsert({
        "id": contract_id,
        "order_id": order_id,
        "customer_name": customer_name,
        "contract_date": raw_data.get("contract_date", "2026-09-18"),
        "delivery_deadline": deadline,
        "quantity": quantity,
        "unit": unit,
        "contract_value": est_cost * 1.5,
        "penalty_per_hour_delay": 5000.0,
        "status": "Safe"
    })

    # 4. Generate operations and save order
    created = order_repo.create_order(order_data)

    # 5. Broadcast real-time update
    websocket_service.broadcast("order.updated", {"order_id": order_id, "status": "Scheduled"})

    return make_success(created, meta={"contract_id": contract_id, "material_feasibility": mat_check, "workforce_capacity": wf_check}, status_code=201)

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

@orders_v1_bp.route("/orders/plans", methods=["GET"])
def list_order_plans():
    from backend.database.mongo import get_collection
    plans = list(get_collection("planning_plans").find({}, {"_id": 0}).sort("created_at", -1))
    return make_success(plans, meta={"total_plans": len(plans)})

@orders_v1_bp.route("/orders/plan/<string:plan_id>/validate", methods=["POST"])
@role_required("SUPERVISOR", "MANAGER")
def validate_order_plan(plan_id):
    from backend.optimization.scheduler import production_scheduler
    from backend.database.mongo import get_collection
    raw_data = request.get_json() or {}
    operations = raw_data.get("operations")
    if not operations:
        plan = get_collection("planning_plans").find_one({"id": plan_id}, {"_id": 0})
        operations = plan.get("operations", []) if plan else []
    validation = production_scheduler.validate_plan(operations)
    return make_success(validation)

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

