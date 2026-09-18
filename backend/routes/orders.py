from flask import Blueprint, jsonify
from backend.models.order import Order

orders_bp = Blueprint("orders", __name__, url_prefix="/api/orders")

@orders_bp.route("", methods=["GET"])
def list_orders():
    orders = Order.query.all()
    return jsonify({"orders": [o.to_dict(include_operations=True) for o in orders]}), 200

@orders_bp.route("/<string:order_id>", methods=["GET"])
def get_order(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    
    # Enrich operation route data with machine names and lane IDs
    data = order.to_dict(include_operations=True)
    for op in data["operations"]:
        if op.get("assigned_machine_id"):
            from backend.models.machine import Machine
            m = Machine.query.get(op["assigned_machine_id"])
            if m:
                op["machine_name"] = m.name
                op["lane_id"] = m.lane_id
                op["lane_name"] = m.lane.name if m.lane else m.lane_id
                op["machine_status"] = m.status
                op["precision_level"] = m.precision_level

    return jsonify({"order": data}), 200
