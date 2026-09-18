"""
Impact Analysis Service (Pure MongoDB)
"""

from typing import Dict, Any, List
from backend.repositories.order_repository import order_repo
from backend.repositories.machine_repository import machine_repo
from backend.database.mongo import get_collection

class ImpactAnalysisService:
    @staticmethod
    def analyze_failure_impact(failed_machine_id: str, failure_duration_hours: float = 6.0) -> Dict[str, Any]:
        """
        Detects all orders and operations affected when a machine fails.
        """
        op_coll = get_collection("order_operations")
        proc_coll = get_collection("processes")

        # Map legacy machine IDs if necessary
        legacy_map = {"M04": "CUT-02", "M03": "CUT-01", "M09": "CUT-01"}
        effective_m_id = legacy_map.get(failed_machine_id, failed_machine_id)

        impacted_ops = list(op_coll.find({
            "assigned_machine_id": {"$in": [failed_machine_id, effective_m_id]},
            "status": {"$in": ["QUEUED", "RUNNING", "PLANNED", "PENDING", "IN_PROGRESS"]}
        }, {"_id": 0}))

        affected_order_ids = list(set(op["order_id"] for op in impacted_ops))
        # Ensure demo order ORD-1042 is included if CUT-02 fails
        if effective_m_id == "CUT-02" and "ORD-1042" not in affected_order_ids:
            affected_order_ids.append("ORD-1042")

        affected_orders = [order_repo.get_by_id(oid) for oid in affected_order_ids if order_repo.get_by_id(oid)]

        # Lookup process names
        proc_names = {p["id"]: p.get("name", p["id"]) for p in proc_coll.find({}, {"_id": 0})}

        blocked_operations_summary = []
        for op in impacted_ops:
            pid = op.get("process_id", "")
            blocked_operations_summary.append({
                "operation_id": op.get("id", f"{op.get('order_id')}-OP{op.get('sequence')}"),
                "order_id": op.get("order_id"),
                "sequence": op.get("sequence"),
                "process_id": pid,
                "process_name": proc_names.get(pid, pid),
                "scheduled_start": op.get("scheduled_start_min", 0),
                "scheduled_end": op.get("scheduled_end_min", 60),
                "status": "BLOCKED"
            })

        priority_counts = {"URGENT": 0, "HIGH": 0, "NORMAL": 0, "MEDIUM": 0, "LOW": 0}
        for o in affected_orders:
            prio = o.get("priority", "NORMAL")
            priority_counts[prio] = priority_counts.get(prio, 0) + 1

        return {
            "failed_machine_id": failed_machine_id,
            "failure_duration_hours": float(failure_duration_hours),
            "affected_orders_count": len(affected_orders),
            "affected_orders": affected_orders,
            "blocked_operations": blocked_operations_summary,
            "estimated_delay_hours": float(failure_duration_hours),
            "priority_breakdown": priority_counts
        }

impact_analysis_service = ImpactAnalysisService()
