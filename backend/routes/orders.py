from flask import Blueprint, jsonify, request
from backend.database.mongo import get_collection
from backend.database.models import OrderDB

orders_bp = Blueprint("orders", __name__, url_prefix="/api/orders")

@orders_bp.route("", methods=["GET"])
def list_orders():
    orders = OrderDB.all()
    return jsonify({"orders": orders}), 200

@orders_bp.route("/<string:order_id>", methods=["GET"])
def get_order(order_id):
    order = OrderDB.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    # Enrich operations with machine details from MongoDB
    mach_coll = get_collection("machines")
    for op in order.get("operations", []):
        m_id = op.get("assigned_machine_id")
        if m_id:
            mach = mach_coll.find_one({"id": m_id}, {"_id": 0})
            if mach:
                op["machine_name"] = mach.get("name", m_id)
                op["lane_id"] = mach.get("lane_id", "L01")
                op["machine_status"] = mach.get("status", "AVAILABLE")
                op["capacity"] = mach.get("capacity")
                op["hourly_rate"] = mach.get("hourly_rate")

    return jsonify({"order": order}), 200

@orders_bp.route("", methods=["POST"])
def create_order():
    data = request.get_json() or {}
    order_id = data.get("id") or f"ORD-{get_collection('orders').count_documents({}) + 1041}"
    product_name = data.get("product_name") or data.get("product", "Classic Crew Neck T-Shirt")
    product_code = data.get("product_code", "PRD-TSHIRT-01")
    quantity = int(data.get("quantity", 5000))
    priority = data.get("priority", "MEDIUM")
    deadline = data.get("due_date") or data.get("deadline")
    customer = data.get("customer", "Retail Customer")

    from backend.services.order_planning_service import order_planning_service
    from backend.repositories.order_repository import order_repo

    plan = order_planning_service.generate_plan_for_order(
        product_name=product_name,
        product_code=product_code,
        quantity=quantity,
        priority=priority,
        deadline_str=deadline,
        customer=customer,
        order_id=order_id
    )
    
    doc = {
        "id": order_id,
        "order_id": order_id,
        "plan_id": plan["id"],
        "product_name": product_name,
        "product": product_name,
        "product_code": product_code,
        "quantity": quantity,
        "priority": priority,
        "status": "PENDING_SUPERVISOR_REVIEW",
        "production_status": "PENDING_SUPERVISOR_REVIEW",
        "deadline_hours": float(data.get("deadline_hours", 24.0)),
        "due_date": deadline,
        "deadline": deadline,
        "customer": customer,
        "assigned_lane_id": data.get("assigned_lane_id", "L01"),
        "created_at": data.get("created_at"),
        "operations": plan.get("operations", [])
    }
    order_repo.create_order(doc, operations=plan.get("operations", []))
    return jsonify({"order": doc, "plan": plan, "status": "PENDING_SUPERVISOR_REVIEW"}), 201
