import json
from datetime import datetime
from backend.extensions import db
from backend.models.machine import Machine, MachineState
from backend.models.order import Order, OrderOperation, OrderState
from backend.models.disruption import Disruption, DisruptionStatus
from backend.models.maintenance import MaintenanceStatus
from backend.models.ml_prediction import MLPrediction
from backend.models.audit_log import AuditLog
from backend.services.machine_service import machine_service
from backend.services.impact_analysis_service import impact_analysis_service
from backend.services.maintenance_service import maintenance_service
from backend.services.websocket_service import websocket_service
from backend.optimization.candidate_machine_selector import find_candidate_machines
from backend.optimization.scheduler import production_scheduler

class DisruptionService:
    @staticmethod
    def simulate_disruption(machine_id, failure_type="Mechanical Failure", duration_hours=6.0, user=None, auto_optimize=True):
        """
        Executes the end-to-end intelligent disruption recovery pipeline:
        1. Detect/Mark Machine Failure
        2. Impact Analysis -> Identify Affected Orders
        3. Determine Blocked Operations
        4. Cross-Lane Candidate Machine Discovery
        5. ML Prediction & Candidate Ranking (Processing Time, Risk, Suitability)
        6. Constraint Validation & OR-Tools CP-SAT Optimization
        7. Generate Feasible Schedule & Dynamic Operation Reassignment
        8. Create Maintenance Work Order for Service Person
        9. Live Factory WebSocket Updates
        """
        machine = Machine.query.get(machine_id)
        if not machine:
            raise ValueError(f"Machine {machine_id} not found")

        username = user.username if user else "MANAGER"
        user_id = user.id if user else None

        # 1. Update machine status to FAILED
        machine_service.update_machine_status(
            machine_id=machine_id,
            new_status=MachineState.FAILED.value,
            reason=f"Disruption: {failure_type}",
            user_id=user_id,
            username=username
        )

        # 2. Record Disruption
        disruption = Disruption(
            machine_id=machine_id,
            failure_type=failure_type,
            duration_hours=duration_hours,
            status=DisruptionStatus.ACTIVE.value,
            started_at=datetime.utcnow()
        )
        db.session.add(disruption)
        db.session.flush()

        # 3. Impact Analysis
        impact = impact_analysis_service.analyze_failure_impact(machine_id, duration_hours)
        disruption.affected_orders_count = impact["affected_orders_count"]

        # 4. Mark affected operations as BLOCKED
        affected_order_ids = [o["id"] for o in impact["affected_orders"]]
        affected_orders = Order.query.filter(Order.id.in_(affected_order_ids)).all() if affected_order_ids else []

        for order in affected_orders:
            for op in order.operations:
                if op.assigned_machine_id == machine_id and op.status != OrderState.COMPLETED.value:
                    op.status = OrderState.BLOCKED.value
            order.status = OrderState.BLOCKED.value

        db.session.commit()

        # 5. Create Maintenance Work Order
        prio = "URGENT" if any(o.priority == "URGENT" for o in affected_orders) else "HIGH"
        work_order = maintenance_service.create_work_order(
            machine_id=machine_id,
            disruption_id=disruption.id,
            fault_type=failure_type,
            priority=prio,
            estimated_hours=duration_hours
        )

        # 6. Candidate Machine Discovery & ML Suitability
        all_machines = {m.id: m for m in Machine.query.all()}
        compatible_map = {}
        all_candidates_summary = []

        for order in affected_orders:
            for op in order.operations:
                if op.assigned_machine_id == machine_id:
                    req_prec = order.product.required_precision if order.product else "HIGH"
                    candidates = find_candidate_machines(machine_id, op.process_id, order, op, required_precision=req_prec)
                    compatible_map[op.process_id] = candidates

                    for c in candidates:
                        all_candidates_summary.append({
                            "order_id": order.id,
                            "operation_id": op.id,
                            "process_id": op.process_id,
                            "candidate_machine_id": c["machine_id"],
                            "candidate_machine_name": c["machine_name"],
                            "lane_id": c["lane_id"],
                            "suitability_score": c["suitability_score"],
                            "predicted_processing_time": c["predicted_processing_time"],
                            "setup_time_min": c["setup_time_min"],
                            "production_cost": c["production_cost"],
                            "failure_risk_pct": c["failure_risk_pct"],
                            "is_feasible": c["is_feasible"],
                            "reasons": c.get("reasons", [])
                        })

                        # Cache ML prediction
                        ml_rec = MLPrediction(
                            machine_id=c["machine_id"],
                            order_id=order.id,
                            operation_id=op.id,
                            predicted_processing_time=c["predicted_processing_time"],
                            predicted_failure_risk=c["failure_risk_pct"] / 100.0,
                            suitability_score=c["suitability_score"],
                            feature_contributions_json=json.dumps(c.get("feature_contributions", {}))
                        )
                        db.session.add(ml_rec)

        db.session.commit()

        # 7. OR-Tools CP-SAT Constrained Rescheduling
        optimization_result = None
        if auto_optimize and affected_orders:
            websocket_service.notify_optimization_started({"disruption_id": disruption.id, "machine_id": machine_id})
            
            optimization_result = production_scheduler.solve_disruption_recovery(
                failed_machine_id=machine_id,
                failure_duration_hours=duration_hours,
                affected_orders=affected_orders,
                compatible_candidates_map=compatible_map,
                all_machines=all_machines
            )

            # Apply optimized schedule reassignments
            if optimization_result and optimization_result["is_feasible"]:
                for assign in optimization_result["recommended_assignments"]:
                    op = OrderOperation.query.filter_by(order_id=assign["order_id"], sequence=assign["sequence"]).first()
                    if op:
                        if assign["is_reassigned"]:
                            op.original_machine_id = op.assigned_machine_id
                            op.assigned_machine_id = assign["selected_machine_id"]
                            op.status = OrderState.REASSIGNED.value
                            # If machine was IDLE/AVAILABLE, it is now assigned
                            sub_m = all_machines.get(assign["selected_machine_id"])
                            if sub_m and sub_m.status in [MachineState.AVAILABLE.value, MachineState.IDLE.value]:
                                sub_m.status = MachineState.RUNNING.value
                                sub_m.current_order_id = assign["order_id"]
                        else:
                            op.status = OrderState.RUNNING.value if op.sequence == 1 else OrderState.QUEUED.value

                        op.scheduled_start_min = assign["scheduled_start_min"]
                        op.scheduled_end_min = assign["scheduled_end_min"]
                        op.processing_time_min = assign["processing_time_min"]

                for order in affected_orders:
                    order.status = OrderState.RUNNING.value

                db.session.commit()
                websocket_service.notify_optimization_completed(optimization_result)

        # Broadcast failure & schedule events
        websocket_service.notify_machine_failed({
            "disruption_id": disruption.id,
            "machine_id": machine_id,
            "failure_type": failure_type,
            "duration_hours": duration_hours,
            "affected_orders_count": len(affected_orders),
            "work_order_number": work_order.work_order_number
        })

        # Log audit trail
        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="DISRUPTION_SIMULATED_AND_RECOVERED",
            entity_type="DISRUPTION",
            entity_id=str(disruption.id),
            details_json=json.dumps({
                "machine_id": machine_id,
                "failure_type": failure_type,
                "duration_hours": duration_hours,
                "affected_orders": affected_order_ids,
                "optimization_status": optimization_result["status"] if optimization_result else "PENDING"
            })
        )
        db.session.add(audit)
        db.session.commit()

        return {
            "status": "completed",
            "disruption_id": disruption.id,
            "machine_id": machine_id,
            "failure_type": failure_type,
            "duration_hours": duration_hours,
            "work_order": work_order.to_dict(),
            "impact_analysis": impact,
            "candidate_machines": all_candidates_summary,
            "optimization_result": optimization_result
        }

disruption_service = DisruptionService()
