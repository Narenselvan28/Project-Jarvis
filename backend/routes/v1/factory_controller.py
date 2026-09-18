"""
V1 Factory Control Room Overview Controller
"""

from flask import Blueprint
from backend.repositories.factory_repository import factory_repo
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.disruption_repository import disruption_repo
from backend.repositories.maintenance_repository import maintenance_repo
from backend.domain.machine_state import MachineState
from backend.schemas.common import make_success

factory_v1_bp = Blueprint("factory_v1", __name__, url_prefix="/api/v1")

@factory_v1_bp.route("/factory", methods=["GET"])
def get_factory_overview():
    lanes = factory_repo.get_lanes()
    machines = machine_repo.get_all_machines()
    all_orders = order_repo.get_all_orders()
    active_orders = [o for o in all_orders if o.get("status") in ["RUNNING", "BLOCKED", "QUEUED"]]
    active_disruptions = disruption_repo.find_all({"status": "ACTIVE"})
    open_maintenance = maintenance_repo.get_all()
    open_maint_count = len([m for m in open_maintenance if m.get("status") in ["OPEN", "ASSIGNED", "IN_PROGRESS"]])

    status_counts = {s.value: 0 for s in MachineState}
    for m in machines:
        st = m.get("status", "AVAILABLE")
        status_counts[st] = status_counts.get(st, 0) + 1

    machines_by_lane = {}
    for m in machines:
        l_id = m.get("lane_id", "L01")
        machines_by_lane.setdefault(l_id, []).append(m)

    lanes_data = []
    for l in lanes:
        lane_dict = dict(l)
        lane_id = l.get("id")
        lane_machines = sorted(machines_by_lane.get(lane_id, []), key=lambda x: x.get("svg_x", 100))
        lane_dict["machines"] = lane_machines
        lanes_data.append(lane_dict)

    overview = {
        "factory_name": "ARIVON Adaptive Precision Plant",
        "current_shift": "Shift 1 (06:00 - 14:00)",
        "lanes": lanes_data,
        "machines": machines,
        "active_orders": active_orders,
        "active_disruptions": active_disruptions,
        "open_maintenance_count": open_maint_count,
        "status_counts": status_counts,
        "total_machines": len(machines),
        "running_count": status_counts.get("RUNNING", 0),
        "failed_count": status_counts.get("FAILED", 0),
        "available_count": status_counts.get("AVAILABLE", 0)
    }

    return make_success(overview, meta={"lane_count": len(lanes), "machine_count": len(machines)})
