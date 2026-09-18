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
    
    doc = {
        "id": order_id,
        "product_name": data.get("product_name", "Classic Crew Neck T-Shirt"),
        "product_code": data.get("product_code", "PRD-TSHIRT-01"),
        "quantity": int(data.get("quantity", 5000)),
        "priority": data.get("priority", "MEDIUM"),
        "status": data.get("status", "PLANNED"),
        "deadline_hours": float(data.get("deadline_hours", 24.0)),
        "due_date": data.get("due_date"),
        "assigned_lane_id": data.get("assigned_lane_id", "L01"),
        "created_at": data.get("created_at")
    }
    get_collection("orders").insert_one(doc)
    return jsonify({"order": doc}), 201
