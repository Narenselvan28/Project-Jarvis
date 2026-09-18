from flask import Blueprint, jsonify
from backend.models.lane import Lane
from backend.models.machine import Machine, MachineState
from backend.models.order import Order, OrderState
from backend.models.disruption import Disruption, DisruptionStatus
from backend.models.maintenance import MaintenanceWorkOrder, MaintenanceStatus

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")

@dashboard_bp.route("/factory", methods=["GET"])
def get_factory_overview():
    lanes = Lane.query.order_by(Lane.sequence).all()
    machines = Machine.query.all()
    active_orders = Order.query.filter(Order.status.in_([OrderState.RUNNING.value, OrderState.BLOCKED.value, OrderState.QUEUED.value])).all()
    active_disruptions = Disruption.query.filter_by(status=DisruptionStatus.ACTIVE.value).all()
    open_maintenance = MaintenanceWorkOrder.query.filter(MaintenanceWorkOrder.status.in_([MaintenanceStatus.OPEN.value, MaintenanceStatus.ASSIGNED.value, MaintenanceStatus.IN_PROGRESS.value])).all()

    # Status counts
    status_counts = {s.value: 0 for s in MachineState}
    for m in machines:
        status_counts[m.status] = status_counts.get(m.status, 0) + 1

    # Format lanes with machines
    lanes_data = []
    for l in lanes:
        lane_dict = l.to_dict()
        lane_machines = sorted([m.to_dict(include_details=True) for m in l.machines], key=lambda x: x["svg_x"])
        lane_dict["machines"] = lane_machines
        lanes_data.append(lane_dict)

    return jsonify({
        "factory_name": "Antigravity Precision Manufacturing Plant",
        "current_shift": "Shift 1 (06:00 - 14:00)",
        "lanes": lanes_data,
        "machines": [m.to_dict(include_details=True) for m in machines],
        "active_orders": [o.to_dict(include_operations=True) for o in active_orders],
        "active_disruptions": [d.to_dict() for d in active_disruptions],
        "open_maintenance_count": len(open_maintenance),
        "status_counts": status_counts,
        "total_machines": len(machines),
        "running_count": status_counts.get(MachineState.RUNNING.value, 0),
        "failed_count": status_counts.get(MachineState.FAILED.value, 0),
        "available_count": status_counts.get(MachineState.AVAILABLE.value, 0)
    }), 200
