"""
V1 Gantt Timeline Controller
"""

from datetime import datetime
from flask import Blueprint, request
from backend.repositories.schedule_repository import schedule_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.machine_repository import machine_repo
from backend.schemas.common import make_success, make_error

gantt_v1_bp = Blueprint("gantt_v1", __name__, url_prefix="/api/v1")

@gantt_v1_bp.route("/gantt/global", methods=["GET"])
@gantt_v1_bp.route("/gantt/orders", methods=["GET"])
def get_global_gantt():
    operations = schedule_repo.get_operations()
    if not operations:
        all_orders = order_repo.get_all_orders()
        for o in all_orders:
            for op in o.get("operations", []):
                operations.append({
                    "id": op.get("id", f"{o.get('id')}-OP{op.get('sequence')}"),
                    "order_id": o.get("id"),
                    "sequence": op.get("sequence"),
                    "process_id": op.get("process_id"),
                    "process_name": op.get("process_name", op.get("process_id")),
                    "machine_id": op.get("assigned_machine_id"),
                    "status": op.get("status", "PLANNED"),
                    "start_min": op.get("scheduled_start_min", 0),
                    "end_min": op.get("scheduled_end_min", 60),
                    "duration_min": op.get("processing_time_min", 60),
                    "is_reassigned": op.get("is_reassigned", False)
                })

    active_sched = schedule_repo.get_active()
    return make_success({
        "view": "GLOBAL",
        "current_time_marker_min": 180.0,
        "schedule_version": active_sched.get("version", 1) if active_sched else 1,
        "schedule_type": active_sched.get("schedule_type", "BASELINE") if active_sched else "BASELINE",
        "operations": operations
    })

@gantt_v1_bp.route("/gantt/orders/<string:order_id>", methods=["GET"])
@gantt_v1_bp.route("/gantt/order/<string:order_id>", methods=["GET"])
def get_order_gantt(order_id):
    order = order_repo.get_by_id(order_id)
    if not order:
        return make_error("RESOURCE_NOT_FOUND", f"Order '{order_id}' not found.", status_code=404)

    active_sched = schedule_repo.get_active()
    active_sched_id = active_sched.get("id") if active_sched else None

    operations = []
    if active_sched_id:
        operations = schedule_repo.get_operations(schedule_id=active_sched_id, order_id=order_id)
    if not operations:
        operations = schedule_repo.get_operations(order_id=order_id)
    if not operations:
        operations = order.get("operations", [])

    return make_success({
        "view": "ORDER",
        "order_id": order_id,
        "schedule_id": active_sched_id,
        "schedule_version": active_sched.get("version", 1) if active_sched else 1,
        "product": order.get("product"),
        "quantity": order.get("quantity"),
        "priority": order.get("priority"),
        "deadline_hours": order.get("deadline_hours", 24.0),
        "deadline_min": order.get("deadline_hours", 24.0) * 60.0,
        "current_time_marker_min": 180.0,
        "operations": operations
    })

@gantt_v1_bp.route("/gantt/machines/<string:machine_id>", methods=["GET"])
def get_machine_gantt(machine_id):
    machine = machine_repo.get_by_id(machine_id)
    if not machine:
        return make_error("RESOURCE_NOT_FOUND", f"Machine '{machine_id}' not found.", status_code=404)

    operations = schedule_repo.get_operations(machine_id=machine_id)
    return make_success({
        "view": "MACHINE",
        "machine_id": machine_id,
        "machine_name": machine.get("name"),
        "status": machine.get("status"),
        "operations": operations
    })
