"""
ReFlow V1 Factory Control Room Overview Controller
Provides deterministic grid layout metadata, process flow sequences, and real-time state.
"""

from flask import Blueprint
from backend.repositories.factory_repository import factory_repo
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.disruption_repository import disruption_repo
from backend.repositories.maintenance_repository import maintenance_repo
from backend.repositories.schedule_repository import schedule_repo
from backend.domain.machine_state import MachineState
from backend.schemas.common import make_success

factory_v1_bp = Blueprint("factory_v1", __name__, url_prefix="/api/v1")

@factory_v1_bp.route("/factory", methods=["GET"])
def get_factory_overview():
    lanes = factory_repo.get_lanes()
    processes = factory_repo.get_processes()
    machines = machine_repo.get_all_machines()
    all_orders = order_repo.get_all_orders()
    active_orders = [o for o in all_orders if o.get("status") in ["RUNNING", "BLOCKED", "QUEUED"]]
    active_disruptions = disruption_repo.find_all({"status": "ACTIVE"})
    open_maintenance = maintenance_repo.get_all()
    open_maint_count = len([m for m in open_maintenance if m.get("status") in ["OPEN", "ASSIGNED", "IN_PROGRESS"]])

    # Process and Lane lookups for deterministic grid layout
    proc_map = {p["id"]: p for p in processes}
    lane_seq_map = {l["id"]: l.get("sequence", idx + 1) for idx, l in enumerate(lanes)}
    lane_name_map = {l["id"]: l.get("name", f"Lane {idx+1}") for idx, l in enumerate(lanes)}

    status_counts = {s.value: 0 for s in MachineState}
    enriched_machines = []
    machines_by_lane = {}

    for m in machines:
        st = m.get("status", "AVAILABLE")
        status_counts[st] = status_counts.get(st, 0) + 1
        l_id = m.get("lane_id", "L01")
        p_id = m.get("process_id", "P01")
        proc = proc_map.get(p_id, {})

        m_enriched = dict(m)
        m_enriched["grid_row"] = lane_seq_map.get(l_id, 1)
        m_enriched["grid_column"] = proc.get("sequence_index", 1)
        m_enriched["process_code"] = proc.get("code", "FI")
        m_enriched["process_name"] = proc.get("name", "Inspection")
        m_enriched["lane_name"] = lane_name_map.get(l_id, l_id)
        if "utilization" not in m_enriched:
            m_enriched["utilization"] = round(m.get("historical_utilization", 76.5), 1)

        enriched_machines.append(m_enriched)
        machines_by_lane.setdefault(l_id, []).append(m_enriched)

    lanes_data = []
    for l in lanes:
        lane_dict = dict(l)
        lane_id = l.get("id")
        lane_machs = sorted(machines_by_lane.get(lane_id, []), key=lambda x: x.get("grid_column", 1))
        lane_dict["machines"] = lane_machs
        # Compute real average utilization for the lane
        if lane_machs:
            avg_util = round(sum(m.get("utilization", 75.0) for m in lane_machs) / len(lane_machs), 1)
            lane_dict["utilization"] = avg_util
        else:
            lane_dict["utilization"] = 0.0
        lanes_data.append(lane_dict)

    active_sched = schedule_repo.get_active()
    active_sched_id = active_sched.get("id") if active_sched else None
    sched_ops = schedule_repo.get_operations(schedule_id=active_sched_id) if active_sched_id else []

    order_routes = {}
    for op in sched_ops:
        ord_id = op.get("order_id")
        if not ord_id:
            continue
        order_routes.setdefault(ord_id, []).append({
            "sequence": op.get("sequence", 1),
            "operation": op.get("process_name", op.get("process_id", "Operation")),
            "process_id": op.get("process_id"),
            "machine_id": op.get("machine_id") or op.get("assigned_machine_id"),
            "status": op.get("status", "ACTIVE"),
            "is_reassigned": op.get("is_reassigned", False),
            "original_machine_id": op.get("original_machine_id"),
            "scheduled_start_min": op.get("scheduled_start_min", 0),
            "scheduled_end_min": op.get("scheduled_end_min", 60)
        })

    for ord_id in order_routes:
        order_routes[ord_id].sort(key=lambda x: x["sequence"])

    # Decorate machines with recovery info from active schedule operations
    for op in sched_ops:
        m_id = op.get("machine_id") or op.get("assigned_machine_id")
        if m_id and (op.get("is_reassigned") or op.get("original_machine_id")):
            for em in enriched_machines:
                if em.get("id") == m_id:
                    em["is_reassigned"] = True
                    em["original_machine_id"] = op.get("original_machine_id")
                    em["recovered_order_id"] = op.get("order_id")

    overview = {
        "factory_name": "ReFlow Nilayam — Adaptive Production Facility",
        "current_shift": "Shift 1 (06:00 - 14:00)",
        "lanes": lanes_data,
        "processes": processes,
        "machines": enriched_machines,
        "active_orders": active_orders,
        "active_disruptions": active_disruptions,
        "active_schedule": {
            "id": active_sched.get("id") if active_sched else "SCHED-V1",
            "version": active_sched.get("version", 1) if active_sched else 1,
            "status": active_sched.get("status", "ACTIVE") if active_sched else "ACTIVE",
            "schedule_type": active_sched.get("schedule_type", "BASELINE") if active_sched else "BASELINE"
        } if active_sched else None,
        "order_routes": order_routes,
        "open_maintenance_count": open_maint_count,
        "status_counts": status_counts,
        "total_machines": len(enriched_machines),
        "running_count": status_counts.get("RUNNING", 0),
        "failed_count": status_counts.get("FAILED", 0),
        "available_count": status_counts.get("AVAILABLE", 0)
    }

    return make_success(overview, meta={"lane_count": len(lanes), "machine_count": len(enriched_machines)})
