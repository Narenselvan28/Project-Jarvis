from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from backend.database.mongo import get_collection
from backend.database.models import OrderDB, MachineDB

gantt_bp = Blueprint("gantt", __name__, url_prefix="/api/gantt")

def _format_hours_mins(total_minutes):
    hrs = int(total_minutes // 60)
    mins = int(total_minutes % 60)
    if hrs > 24:
        days = hrs // 24
        rem_hrs = hrs % 24
        return f"{days}d {rem_hrs}h"
    if hrs > 0:
        return f"{hrs}h {mins}m"
    return f"{mins}m"

@gantt_bp.route("/order/<order_id>", methods=["GET"])
def get_order_gantt(order_id):
    """
    FEATURE 1: ORDER-LEVEL GANTT CHART
    Returns real scheduled operations from MongoDB, complete timeline,
    reassignment markers, deadline marker, now marker, and computed metrics.
    """
    order = get_collection("orders").find_one({"id": order_id}, {"_id": 0})
    if not order:
        return jsonify({"error": f"Order {order_id} not found"}), 404

    sched_ops = list(get_collection("schedule_operations").find(
        {"order_id": order_id}, {"_id": 0}
    ).sort("sequence", 1))

    # If no schedule_operations exist yet, fall back to order_operations
    if not sched_ops:
        order_ops = list(get_collection("order_operations").find(
            {"order_id": order_id}, {"_id": 0}
        ).sort("sequence", 1))
        now = datetime.utcnow()
        sched_ops = []
        for op in order_ops:
            s_start = now + timedelta(minutes=op.get("scheduled_start_min", 0))
            s_end = now + timedelta(minutes=op.get("scheduled_end_min", 60))
            dur = op.get("processing_time_min", 60)
            sched_ops.append({
                "id": f"SCHED-{op['id']}",
                "order_id": order_id,
                "sequence": op.get("sequence", 1),
                "process_id": op.get("process_id"),
                "process_name": op.get("process_name", op.get("process_id")),
                "machine_id": op.get("assigned_machine_id"),
                "machine_name": op.get("assigned_machine_id"),
                "lane_id": "L01",
                "worker_name": "Shift Lead",
                "status": op.get("status", "QUEUED"),
                "scheduled_start": s_start.isoformat(),
                "scheduled_end": s_end.isoformat(),
                "scheduled_start_min": op.get("scheduled_start_min", 0),
                "scheduled_end_min": op.get("scheduled_end_min", 60),
                "duration_min": dur,
                "predicted_processing_time": dur,
                "setup_time": op.get("setup_time_min", 15),
                "actual_processing_time": dur if op.get("status") == "COMPLETED" else None,
                "is_delayed": False,
                "is_reassigned": op.get("status") == "REASSIGNED",
                "original_machine_id": op.get("original_machine_id"),
                "reassigned_machine_id": op.get("assigned_machine_id") if op.get("status") == "REASSIGNED" else None,
                "production_cost": round((dur / 60.0) * 1200.0, 2),
                "progress_percentage": op.get("progress_percentage", 0)
            })

    # Compute Gantt summary metrics
    total_proc_min = 0.0
    total_setup_min = 0.0
    total_cost = 0.0
    reassignments_count = 0
    max_end_min = 0.0
    min_start_min = 0.0

    for op in sched_ops:
        dur = op.get("duration_min") or op.get("predicted_processing_time", 60.0)
        setup = op.get("setup_time", 15.0)
        cost = op.get("production_cost", 500.0)
        total_proc_min += dur
        total_setup_min += setup
        total_cost += cost
        if op.get("is_reassigned") or op.get("status") == "REASSIGNED":
            reassignments_count += 1
        end_m = op.get("scheduled_end_min", 0)
        if end_m > max_end_min:
            max_end_min = end_m

    total_duration_min = max_end_min - min_start_min if max_end_min > 0 else (total_proc_min + total_setup_min)
    waiting_min = max(0.0, total_duration_min - (total_proc_min + total_setup_min))

    # Deadline status
    deadline_hrs = order.get("deadline_hours", 24.0)
    total_duration_hrs = total_duration_min / 60.0
    if total_duration_hrs <= deadline_hrs:
        deadline_status = "ON TIME"
    elif total_duration_hrs <= deadline_hrs * 1.15:
        deadline_status = "AT RISK"
    else:
        deadline_status = "LATE"

    now_iso = datetime.utcnow().isoformat()

    metrics = {
        "total_duration": _format_hours_mins(total_duration_min),
        "total_duration_hours": round(total_duration_hrs, 2),
        "processing_time": _format_hours_mins(total_proc_min),
        "processing_hours": round(total_proc_min / 60.0, 2),
        "setup_time": _format_hours_mins(total_setup_min),
        "setup_hours": round(total_setup_min / 60.0, 2),
        "waiting_time": _format_hours_mins(waiting_min),
        "total_cost": round(total_cost, 2),
        "reassignments_count": reassignments_count,
        "operations_count": len(sched_ops),
        "deadline_status": deadline_status,
        "deadline_hours": deadline_hrs
    }

    return jsonify({
        "order": order,
        "operations": sched_ops,
        "deadline": order.get("due_date"),
        "current_time": now_iso,
        "metrics": metrics
    }), 200

@gantt_bp.route("/orders", methods=["GET"])
def get_all_orders_gantt():
    """
    Returns high-level scheduled operations across all orders for the global multi-order Gantt view.
    Supports filters: priority, status, lane_id.
    """
    priority = request.args.get("priority")
    status = request.args.get("status")
    lane_id = request.args.get("lane_id")

    query = {}
    if priority:
        query["priority"] = priority.upper()
    if status:
        query["status"] = status.upper()
    if lane_id:
        query["assigned_lane_id"] = lane_id.upper()

    orders = list(get_collection("orders").find(query, {"_id": 0}).limit(30))
    order_ids = [o["id"] for o in orders]

    ops = list(get_collection("schedule_operations").find(
        {"order_id": {"$in": order_ids}}, {"_id": 0}
    ).sort("scheduled_start_min", 1))

    # Group operations by order
    ops_by_order = {}
    for op in ops:
        oid = op["order_id"]
        if oid not in ops_by_order:
            ops_by_order[oid] = []
        ops_by_order[oid].append(op)

    results = []
    for o in orders:
        o["operations"] = ops_by_order.get(o["id"], [])
        results.append(o)

    return jsonify({
        "orders": results,
        "current_time": datetime.utcnow().isoformat(),
        "total_orders": len(results)
    }), 200

@gantt_bp.route("/machine/<machine_id>", methods=["GET"])
def get_machine_gantt(machine_id):
    """
    MACHINE-CENTRIC GANTT
    Returns all operations scheduled on a specific machine over time,
    along with failure/downtime blocks.
    """
    machine = get_collection("machines").find_one({"id": machine_id}, {"_id": 0})
    if not machine:
        return jsonify({"error": f"Machine {machine_id} not found"}), 404

    ops = list(get_collection("schedule_operations").find(
        {"machine_id": machine_id}, {"_id": 0}
    ).sort("scheduled_start_min", 1))

    # Find active disruptions or maintenance
    disruptions = list(get_collection("disruptions").find(
        {"machine_id": machine_id}, {"_id": 0}
    ))

    return jsonify({
        "machine": machine,
        "operations": ops,
        "disruptions": disruptions,
        "current_time": datetime.utcnow().isoformat()
    }), 200
