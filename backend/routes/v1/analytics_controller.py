"""
V1 Factory Analytics Controller
"""

from flask import Blueprint
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.schedule_repository import schedule_repo
from backend.repositories.disruption_repository import disruption_repo
from backend.repositories.maintenance_repository import maintenance_repo
from backend.services.scheduling_service import scheduling_service
from backend.schemas.common import make_success

analytics_v1_bp = Blueprint("analytics_v1", __name__, url_prefix="/api/v1")

@analytics_v1_bp.route("/analytics", methods=["GET"])
def get_analytics():
    machines = machine_repo.get_all_machines()
    orders = order_repo.get_all_orders()
    disruptions = disruption_repo.get_all()
    maintenance_orders = maintenance_repo.get_all()
    operations = schedule_repo.get_operations()

    # 1. Real machine utilization calculation
    utils = [float(m.get("current_utilization", m.get("utilization", 75.0))) for m in machines]
    avg_utilization = round(sum(utils) / max(1, len(utils)), 1)

    # 2. Total production cost & throughput
    total_cost = 0.0
    completed_orders = 0
    late_orders = 0
    for o in orders:
        if o.get("status") == "COMPLETED":
            completed_orders += 1
        for op in o.get("operations", []):
            dur = float(op.get("processing_time_min", 60.0))
            m_id = op.get("assigned_machine_id")
            m_obj = next((m for m in machines if m["id"] == m_id), {})
            rate = float(m_obj.get("hourly_rate", 1200.0))
            total_cost += (dur / 60.0) * rate

    total_orders_count = max(1, len(orders))
    on_time_pct = round(((total_orders_count - late_orders) / total_orders_count) * 100, 1)

    # 3. Disruption & recovery metrics
    reassignments_count = len([op for op in operations if op.get("is_reassigned")])
    total_downtime_hours = sum(float(d.get("duration_hours", 6.0)) for d in disruptions)

    # 4. Baselines comparison
    baselines = scheduling_service.get_baseline_comparisons()

    metrics = {
        "machine_utilization_pct": avg_utilization,
        "total_throughput_units": sum(int(o.get("quantity", 0)) for o in orders),
        "total_production_cost": round(total_cost, 2),
        "on_time_completion_rate": on_time_pct,
        "total_downtime_hours": total_downtime_hours,
        "total_disruptions_logged": len(disruptions),
        "total_maintenance_work_orders": len(maintenance_orders),
        "schedule_reassignments_count": reassignments_count,
        "benchmarks": baselines
    }

    return make_success(metrics)
