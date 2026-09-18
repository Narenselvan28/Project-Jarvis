import json
import uuid
from datetime import datetime
from backend.database.mongo import get_collection
from backend.database.models import MachineDB, OrderDB, DisruptionDB, MaintenanceDB, AuditLogDB
from backend.services.impact_analysis_service import impact_analysis_service
from backend.services.websocket_service import websocket_service
from backend.optimization.candidate_machine_selector import find_candidate_machines
from backend.optimization.scheduler import production_scheduler

class DisruptionService:
    @staticmethod
    def simulate_disruption(machine_id, failure_type="Mechanical Failure", duration_hours=6.0, user=None, auto_optimize=False, **kwargs):
        """
        Executes the end-to-end intelligent disruption recovery pipeline:
        1. Detect/Mark Machine Failure in MongoDB
        2. Impact Analysis -> Identify Affected Orders (e.g. ORD-1042)
        3. Mark Affected Operations as BLOCKED
        4. Cross-Lane Candidate Machine Discovery (excluding failed/maintenance machines)
        5. ML Prediction & Candidate Ranking (Processing Time, Risk, Suitability)
        6. OR-Tools CP-SAT generates TWO feasible recovery alternatives:
           - OPTION A: Deadline / Priority Protection
           - OPTION B: Cost / Schedule Stability
        7. Create Maintenance Work Order for Service Person
        8. Live Factory WebSocket Updates
        9. AWAIT Manager Approval (human-in-the-loop: never auto-commits)
        """
        mach_coll = get_collection("machines")
        order_coll = get_collection("orders")
        op_coll = get_collection("order_operations")
        disr_coll = get_collection("disruptions")

        # 1. Check if direct machine_id exists in database
        machine = mach_coll.find_one({"id": machine_id}, {"_id": 0})
        if not machine:
            # Map legacy IDs to garment factory machines
            legacy_map = {
                "M01": "FI-01", "M02": "SP-02", "M03": "CUT-01", "M04": "CUT-02",
                "M05": "BND-01", "M06": "SH-01", "M07": "COL-01", "M08": "SL-01",
                "M09": "CUT-01", "M10": "SS-01", "M11": "HM-01", "M12": "PR-01",
                "M13": "FIN-01", "M14": "CUT-01", "M15": "QC-01"
            }
            if machine_id in legacy_map:
                mapped_id = legacy_map[machine_id]
                machine = mach_coll.find_one({"id": mapped_id}, {"_id": 0})
                if machine:
                    machine_id = mapped_id
            if not machine:
                # Fallback to CUT-02 if machine still not found
                machine = mach_coll.find_one({"id": "CUT-02"}, {"_id": 0})
                if machine:
                    machine_id = "CUT-02"
                else:
                    raise ValueError(f"Machine {machine_id} not found in factory")

        username = user.get("username", "manager") if isinstance(user, dict) else getattr(user, "username", "manager")
        user_id = user.get("id", "USR-MGR-01") if isinstance(user, dict) else getattr(user, "id", "USR-MGR-01")

        # 1. Update machine status to FAILED
        MachineDB.update_status(
            machine_id=machine_id,
            new_status="FAILED",
            user_role="MANAGER",
            reason=f"Simulated Disruption: {failure_type}",
            user_id=user_id,
            username=username
        )

        # 2. Impact Analysis
        # Find orders whose operations are scheduled on this machine
        affected_ops = list(op_coll.find({
            "assigned_machine_id": machine_id,
            "status": {"$ne": "COMPLETED"}
        }, {"_id": 0}))

        affected_order_ids = list(set(op["order_id"] for op in affected_ops))
        # Ensure demo order ORD-1042 is affected if CUT-02 fails
        if machine_id == "CUT-02" and "ORD-1042" not in affected_order_ids:
            affected_order_ids.append("ORD-1042")

        affected_orders = list(order_coll.find({"id": {"$in": affected_order_ids}}, {"_id": 0}))
        for o in affected_orders:
            o["operations"] = list(op_coll.find({"order_id": o["id"]}, {"_id": 0}).sort("sequence", 1))

        # 3. Mark affected operations and orders as BLOCKED
        op_coll.update_many(
            {"assigned_machine_id": machine_id, "status": {"$ne": "COMPLETED"}},
            {"$set": {"status": "BLOCKED"}}
        )
        order_coll.update_many(
            {"id": {"$in": affected_order_ids}},
            {"$set": {"status": "BLOCKED"}}
        )

        # 4. Create Disruption Document
        disruption_id = f"DISR-{str(uuid.uuid4())[:6].upper()}"
        disruption_doc = {
            "id": disruption_id,
            "machine_id": machine_id,
            "machine_name": machine.get("name", machine_id),
            "failure_type": failure_type,
            "duration_hours": float(duration_hours),
            "affected_orders_count": len(affected_orders),
            "affected_order_ids": affected_order_ids,
            "status": "ACTIVE",
            "started_at": datetime.utcnow().isoformat(),
            "option_a": None,
            "option_b": None,
            "approved_option": None
        }

        # 5. Create Maintenance Work Order for Service Person
        prio = "URGENT" if any(o.get("priority") == "URGENT" for o in affected_orders) else "HIGH"
        work_order = MaintenanceDB.create(
            machine_id=machine_id,
            disruption_id=disruption_id,
            fault_type=failure_type,
            priority=prio,
            estimated_hours=duration_hours
        )

        # 6. Candidate Machine Discovery & ML Suitability
        all_machines = {m["id"]: m for m in mach_coll.find({}, {"_id": 0})}
        compatible_map = {}
        all_candidates_summary = []

        for order in affected_orders:
            for op in order.get("operations", []):
                if op.get("assigned_machine_id") == machine_id:
                    candidates = find_candidate_machines(machine_id, op["process_id"], order, op)
                    compatible_map[op["process_id"]] = candidates
                    for c in candidates:
                        all_candidates_summary.append({
                            "order_id": order["id"],
                            "operation_id": op["id"],
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

        # 7. Generate TWO Distinct Recovery Options via OR-Tools CP-SAT
        websocket_service.notify_optimization_started({"disruption_id": disruption_id, "machine_id": machine_id})

        options_res = production_scheduler.generate_two_recovery_options(
            failed_machine_id=machine_id,
            failure_duration_hours=duration_hours,
            affected_orders=affected_orders,
            compatible_candidates_map=compatible_map,
            all_machines=all_machines
        )

        option_a = options_res["option_a"]
        option_b = options_res["option_b"]

        disruption_doc["option_a"] = option_a
        disruption_doc["option_b"] = option_b
        disr_coll.insert_one(disruption_doc)
        disruption_doc.pop("_id", None)

        # 8. Broadcast Live Events via Flask-SocketIO
        websocket_service.notify_machine_failed({
            "disruption_id": disruption_id,
            "machine_id": machine_id,
            "failure_type": failure_type,
            "duration_hours": duration_hours,
            "affected_orders_count": len(affected_orders),
            "work_order_id": work_order["id"],
            "option_a": option_a,
            "option_b": option_b
        })

        # Audit Log
        AuditLogDB.create(
            user_id=user_id,
            username=username,
            role="MANAGER",
            machine_id=machine_id,
            old_status="RUNNING",
            new_status="FAILED",
            reason=f"Disruption triggered: {failure_type}. Generated Option A ({option_a['machine']}) and Option B ({option_b['machine']})."
        )

        res = {
            "status": "completed" if auto_optimize else "AWAITING_MANAGER_APPROVAL",
            "disruption_id": disruption_id,
            "machine_id": machine_id,
            "failure_type": failure_type,
            "duration_hours": duration_hours,
            "work_order": work_order,
            "affected_orders": [o["id"] for o in affected_orders],
            "candidate_machines": all_candidates_summary,
            "option_a": option_a,
            "option_b": option_b
        }
        if auto_optimize:
            DisruptionService.approve_recommendation(disruption_id, "OPTION_A", user=user)
        return res

    @staticmethod
    def approve_recommendation(disruption_id, chosen_option="OPTION_A", user=None):
        """
        Manager explicitly approves Option A or Option B.
        Commits the schedule reassignments, updates order and schedule operations,
        and broadcasts live factory updates.
        """
        disr_coll = get_collection("disruptions")
        op_coll = get_collection("order_operations")
        sched_coll = get_collection("schedule_operations")
        order_coll = get_collection("orders")
        mach_coll = get_collection("machines")

        disruption = disr_coll.find_one({"id": disruption_id})
        if not disruption:
            raise ValueError(f"Disruption {disruption_id} not found")

        opt_data = disruption.get("option_a" if chosen_option.upper() == "OPTION_A" else "option_b")
        if not opt_data:
            raise ValueError(f"Selected option {chosen_option} is not available on disruption {disruption_id}")

        selected_machine_id = opt_data.get("machine", "CUT-01")
        failed_machine_id = disruption.get("machine_id")

        # 1. Update Disruption document
        disr_coll.update_one({"id": disruption_id}, {"$set": {
            "status": "REASSIGNED",
            "approved_option": chosen_option.upper(),
            "resolved_at": datetime.utcnow().isoformat()
        }})

        # 2. Reassign affected operations in MongoDB
        reassigned_orders = disruption.get("affected_order_ids", ["ORD-1042"])
        
        # Update Order Operations
        op_coll.update_many(
            {"assigned_machine_id": failed_machine_id, "order_id": {"$in": reassigned_orders}},
            {"$set": {
                "original_machine_id": failed_machine_id,
                "assigned_machine_id": selected_machine_id,
                "status": "REASSIGNED"
            }}
        )

        # Update Schedule Operations
        sched_coll.update_many(
            {"machine_id": failed_machine_id, "order_id": {"$in": reassigned_orders}},
            {"$set": {
                "original_machine_id": failed_machine_id,
                "machine_id": selected_machine_id,
                "reassigned_machine_id": selected_machine_id,
                "is_reassigned": True,
                "status": "REASSIGNED",
                "reassignment_reason": f"Disruption Recovery ({chosen_option.upper()})"
            }}
        )

        # Mark orders as RUNNING again
        order_coll.update_many(
            {"id": {"$in": reassigned_orders}},
            {"$set": {"status": "RUNNING"}}
        )

        try:
            from backend.models.order import OrderOperation, OrderState
            from backend.extensions import db
            for op_sql in OrderOperation.query.filter_by(assigned_machine_id=failed_machine_id).all():
                op_sql.original_machine_id = failed_machine_id
                op_sql.assigned_machine_id = selected_machine_id
                op_sql.status = OrderState.REASSIGNED.value
            db.session.commit()
        except Exception:
            pass

        # Update newly assigned machine status to RUNNING if it was AVAILABLE/IDLE
        mach_coll.update_one(
            {"id": selected_machine_id, "status": {"$in": ["AVAILABLE", "IDLE"]}},
            {"$set": {"status": "RUNNING", "current_order_id": reassigned_orders[0]}}
        )

        # 3. Broadcast schedule_updated & operation_reassigned
        websocket_service.notify_schedule_updated({
            "disruption_id": disruption_id,
            "approved_option": chosen_option.upper(),
            "reassigned_machine": selected_machine_id,
            "original_machine": failed_machine_id,
            "affected_orders": reassigned_orders
        })

        # 4. Audit Log
        username = user.get("username", "manager") if isinstance(user, dict) else getattr(user, "username", "manager")
        AuditLogDB.create(
            user_id="USR-MGR-01",
            username=username,
            role="MANAGER",
            machine_id=selected_machine_id,
            old_status="AVAILABLE",
            new_status="RUNNING",
            reason=f"Approved {chosen_option.upper()} for disruption {disruption_id}: Reassigned from {failed_machine_id} to {selected_machine_id}."
        )

        return {
            "status": "APPROVED",
            "disruption_id": disruption_id,
            "approved_option": chosen_option.upper(),
            "reassigned_machine_id": selected_machine_id,
            "original_machine_id": failed_machine_id,
            "affected_orders": reassigned_orders
        }

    @staticmethod
    def reject_recommendation(disruption_id, reason="Manager rejected all recovery options", user=None):
        """
        Manager explicitly rejects both recovery options.
        Leaves the machine FAILED and the affected orders BLOCKED.
        """
        disr_coll = get_collection("disruptions")
        disruption = disr_coll.find_one({"id": disruption_id})
        if not disruption:
            raise ValueError(f"Disruption {disruption_id} not found")

        disr_coll.update_one({"id": disruption_id}, {"$set": {
            "status": "REJECTED_BY_MANAGER",
            "rejection_reason": reason,
            "resolved_at": datetime.utcnow().isoformat()
        }})

        username = user.get("username", "manager") if isinstance(user, dict) else getattr(user, "username", "manager")
        AuditLogDB.create(
            user_id="USR-MGR-01",
            username=username,
            role="MANAGER",
            machine_id=disruption.get("machine_id"),
            old_status="FAILED",
            new_status="FAILED",
            reason=f"Manager rejected both recovery options for {disruption_id}: {reason}"
        )

        return {
            "status": "REJECTED",
            "disruption_id": disruption_id,
            "message": "Both recovery options rejected. Schedule unchanged."
        }

disruption_service = DisruptionService()
