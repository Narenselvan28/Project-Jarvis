from backend.models.order import Order, OrderOperation, OrderState
from backend.models.machine import Machine

class ImpactAnalysisService:
    @staticmethod
    def analyze_failure_impact(failed_machine_id, failure_duration_hours=6.0):
        """
        Detects all orders and operations affected when a machine fails.
        """
        # Find all operations on this machine that are not finished
        impacted_ops = OrderOperation.query.filter(
            OrderOperation.assigned_machine_id == failed_machine_id,
            OrderOperation.status.in_([OrderState.QUEUED.value, OrderState.RUNNING.value, OrderState.PLANNED.value])
        ).all()

        affected_order_ids = list({op.order_id for op in impacted_ops})
        affected_orders = Order.query.filter(Order.id.in_(affected_order_ids)).all()

        blocked_operations_summary = []
        for op in impacted_ops:
            blocked_operations_summary.append({
                "operation_id": op.id,
                "order_id": op.order_id,
                "sequence": op.sequence,
                "process_id": op.process_id,
                "process_name": op.process.name if op.process else op.process_id,
                "scheduled_start": op.scheduled_start_min,
                "scheduled_end": op.scheduled_end_min,
                "status": "BLOCKED"
            })

        # Calculate estimated schedule delay
        estimated_delay_min = failure_duration_hours * 60.0

        priority_counts = {"URGENT": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for o in affected_orders:
            if o.priority in priority_counts:
                priority_counts[o.priority] += 1

        return {
            "failed_machine_id": failed_machine_id,
            "failure_duration_hours": failure_duration_hours,
            "affected_orders_count": len(affected_orders),
            "affected_orders": [o.to_dict(include_operations=True) for o in affected_orders],
            "blocked_operations": blocked_operations_summary,
            "estimated_delay_hours": failure_duration_hours,
            "priority_breakdown": priority_counts
        }

impact_analysis_service = ImpactAnalysisService()
