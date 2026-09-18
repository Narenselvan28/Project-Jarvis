from backend.extensions import db
from backend.models.order import Order, OrderOperation, OrderState
from backend.models.machine import Machine, MachineState
from backend.models.schedule import Schedule
from backend.optimization.scheduler import production_scheduler
from backend.services.websocket_service import websocket_service

class SchedulingService:
    @staticmethod
    def get_current_schedule():
        orders = Order.query.all()
        machines = Machine.query.all()
        active_schedule = Schedule.query.filter_by(is_active=True).first()

        operations_data = []
        for o in orders:
            for op in o.operations:
                operations_data.append({
                    "id": op.id,
                    "order_id": o.id,
                    "product_name": o.product.name if o.product else "Part",
                    "priority": o.priority,
                    "sequence": op.sequence,
                    "process_id": op.process_id,
                    "process_name": op.process.name if op.process else op.process_id,
                    "machine_id": op.assigned_machine_id,
                    "original_machine_id": op.original_machine_id,
                    "status": op.status,
                    "start_min": op.scheduled_start_min,
                    "end_min": op.scheduled_end_min,
                    "duration_min": op.processing_time_min,
                    "progress": op.progress_percentage
                })

        return {
            "schedule": active_schedule.to_dict() if active_schedule else None,
            "operations": operations_data,
            "order_count": len(orders),
            "machine_count": len(machines)
        }

    @staticmethod
    def get_baseline_comparisons():
        orders = Order.query.all()
        machines = {m.id: m for m in Machine.query.all()}
        comparisons = production_scheduler.compute_baseline_comparisons(orders, machines)
        
        # Also grab active optimized metrics
        active = Schedule.query.filter_by(is_active=True).first()
        if active:
            comparisons["ADAPTIVE_CP_SAT"] = {
                "algorithm": "Adaptive ML + OR-Tools CP-SAT (Proposed)",
                "makespan_minutes": active.makespan_minutes,
                "makespan_hours": round(active.makespan_minutes / 60.0, 2),
                "total_tardiness_minutes": active.total_tardiness_minutes,
                "late_orders": active.late_orders_count,
                "total_cost": active.total_production_cost,
                "utilization_pct": active.average_utilization,
                "stability_score": active.stability_score
            }
        return comparisons

    @staticmethod
    def reoptimize_after_recovery(repaired_machine_id=None):
        """
        Re-evaluates schedule once machine is repaired to determine if jobs should be shifted back or kept.
        """
        orders = Order.query.all()
        machines = {m.id: m for m in Machine.query.all()}

        # Re-solve
        affected_orders = [o for o in orders if any(op.status != OrderState.COMPLETED.value for op in o.operations)]
        
        # Build map
        res = production_scheduler.solve_disruption_recovery(
            failed_machine_id="", # No machine locked out now
            failure_duration_hours=0.0,
            affected_orders=affected_orders,
            compatible_candidates_map={},
            all_machines=machines
        )

        websocket_service.notify_schedule_updated(res)
        return res

scheduling_service = SchedulingService()
