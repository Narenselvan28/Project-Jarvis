"""
Intelligence Loop 1: Order Planning & Allocation Service
Pipelines: Order -> Plan -> ML Prediction -> Machine Candidates -> OR-Tools CP-SAT -> Proposed Schedule
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.repositories.order_repository import order_repo
from backend.repositories.machine_repository import machine_repo
from backend.repositories.schedule_repository import schedule_repo
from backend.repositories.factory_repository import factory_repo
from backend.repositories.audit_repository import audit_repo
from backend.ml.prediction import predict_processing_time
from backend.optimization.candidate_machine_selector import find_candidate_machines
from backend.optimization.scheduler import production_scheduler
from backend.optimization.constraints import SchedulingModelBuilder
from backend.domain.schedule_versioning import ScheduleStatus, ScheduleType
from backend.services.websocket_service import websocket_service
from backend.domain.errors import ValidationError, ResourceNotFoundError, InvalidStateTransitionError
from backend.domain.state_machine import StateTransitionService, ProductionPlanState

class OrderPlanningService:
    @staticmethod
    def generate_plan_for_order(
        product_name: str = "Classic Crew Neck T-Shirt",
        product_code: str = "PRD-TSHIRT-01",
        quantity: int = 12000,
        priority: str = "URGENT",
        deadline_str: Optional[str] = None,
        customer: str = "Retail Partner A",
        user_id: str = "USR-MGR-01",
        username: str = "manager",
        order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes Intelligence Loop 1:
        1. Sequence operations from Bill of Process
        2. For each operation: find candidates, run ML processing prediction, evaluate suitability
        3. Solve OR-Tools CP-SAT for optimal machine allocation
        4. Return proposed plan awaiting Supervisor approval (never auto-activated)
        """
        now = datetime.utcnow()
        if deadline_str:
            try:
                deadline_dt = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
            except Exception:
                deadline_dt = now + timedelta(hours=24)
        else:
            deadline_dt = now + timedelta(hours=24)

        all_processes = factory_repo.get_processes()
        all_workers = factory_repo.get_workers(available_only=True)
        all_machines = {m["id"]: m for m in machine_repo.get_all_machines()}

        plan_id = f"PLAN-{str(uuid.uuid4())[:6].upper()}"
        if not order_id:
            order_id = f"ORD-{str(uuid.uuid4())[:4].upper()}"

        due_min = max(60, int((deadline_dt - now).total_seconds() / 60.0))
        horizon_val = max(2880, due_min + 1440)
        builder = SchedulingModelBuilder(horizon_minutes=horizon_val)
        prio_weights = {"URGENT": 2.5, "HIGH": 1.8, "NORMAL": 1.0, "MEDIUM": 1.0, "LOW": 0.5}

        # 1. First pass: Collect ML candidate evaluations and register operations in CP-SAT builder
        op_candidates_map = {}
        for seq, proc in enumerate(all_processes, 1):
            proc_id = proc["id"]
            mock_order = {
                "id": order_id,
                "product_code": product_code,
                "quantity": quantity,
                "priority": priority
            }
            mock_op = {
                "sequence": seq,
                "process_id": proc_id
            }

            # Candidate evaluation using real ML predictions + suitability scoring
            candidates = find_candidate_machines(
                failed_machine_id=None,
                process_id=proc_id,
                order=mock_order,
                operation=mock_op,
                required_precision="HIGH"
            )

            feasible_candidates = [c for c in candidates if c.get("is_feasible", True)]
            if not feasible_candidates:
                feasible_candidates = candidates

            cands_info = []
            for cand in feasible_candidates:
                m_id = cand["machine_id"]
                pred_proc = float(cand.get("predicted_processing_time", 60.0))
                setup = float(cand.get("setup_time_min", 15.0))
                dur = max(1, int(pred_proc + setup))
                m_obj = all_machines.get(m_id, {})
                rate = float(m_obj.get("hourly_rate", 1200.0) if isinstance(m_obj, dict) else getattr(m_obj, 'hourly_rate', 1200.0))
                cands_info.append({
                    "machine_id": m_id,
                    "duration_min": dur,
                    "processing_time_min": pred_proc,
                    "setup_time_min": setup,
                    "cost_per_hour": rate,
                    "is_original": False,
                    "candidate_data": cand
                })

            if not cands_info:
                chosen_m = machine_repo.find_by_process(proc_id)
                m_id = chosen_m[0]["id"] if chosen_m else f"M-{proc_id}"
                cands_info.append({
                    "machine_id": m_id,
                    "duration_min": 75,
                    "processing_time_min": 60.0,
                    "setup_time_min": 15.0,
                    "cost_per_hour": 1200.0,
                    "is_original": False,
                    "candidate_data": {}
                })

            op_candidates_map[seq] = {
                "proc": proc,
                "candidates": candidates,
                "cands_info": cands_info
            }

            builder.add_operation(
                order_id=order_id,
                op_seq=seq,
                candidate_machines_info=cands_info
            )
            if seq > 1:
                builder.add_precedence(order_id, seq - 1, seq)

        # Add order deadline constraint to CP-SAT builder
        due_min = max(60, int((deadline_dt - now).total_seconds() / 60.0))
        builder.add_order_deadline(order_id, len(all_processes), due_min, priority_weight=prio_weights.get(priority, 1.0))
        builder.finalize_no_overlap()

        # Build multi-objective and solve with OR-Tools CP-SAT
        from backend.optimization.objective import build_multi_objective
        from ortools.sat.python import cp_model
        build_multi_objective(builder)

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 5.0
        cp_status = solver.Solve(builder.model)
        is_cp_success = cp_status in [cp_model.OPTIMAL, cp_model.FEASIBLE]

        # 2. Build final operations from CP-SAT optimal solution
        plan_ops = []
        total_cost = 0.0
        total_proc_min = 0.0
        total_setup_min = 0.0
        max_end_min = 0.0

        for seq in range(1, len(all_processes) + 1):
            info = op_candidates_map[seq]
            proc = info["proc"]
            cands_info = info["cands_info"]
            all_cands = info["candidates"]

            chosen_cand_info = None
            op_data = builder.operation_vars.get((order_id, seq))
            if is_cp_success and op_data:
                for c in cands_info:
                    pres_var = op_data["presence_vars"].get(c["machine_id"])
                    if pres_var is not None and solver.Value(pres_var) == 1:
                        chosen_cand_info = c
                        break

            if not chosen_cand_info:
                chosen_cand_info = cands_info[0]

            chosen_m_id = chosen_cand_info["machine_id"]
            proc_time = chosen_cand_info["processing_time_min"]
            setup_time = chosen_cand_info["setup_time_min"]
            rate = chosen_cand_info["cost_per_hour"]
            machine_obj = all_machines.get(chosen_m_id, {})
            m_name = machine_obj.get("name", chosen_m_id) if isinstance(machine_obj, dict) else getattr(machine_obj, "name", chosen_m_id)

            if is_cp_success and op_data:
                s_start = float(solver.Value(op_data["start"]))
                s_end = float(solver.Value(op_data["end"]))
            else:
                s_start = max_end_min
                s_end = s_start + proc_time + setup_time

            max_end_min = max(max_end_min, s_end)
            op_cost = ((proc_time + setup_time) / 60.0) * rate
            total_proc_min += proc_time
            total_setup_min += setup_time
            total_cost += op_cost

            assigned_worker = all_workers[(seq - 1) % len(all_workers)] if all_workers else {"name": "Senior Operator", "id": "WRK-001"}

            plan_ops.append({
                "id": f"{order_id}-OP-{seq:02d}",
                "order_id": order_id,
                "sequence": seq,
                "process_id": proc["id"],
                "process_name": proc.get("name", proc["id"]),
                "machine_id": chosen_m_id,
                "assigned_machine_id": chosen_m_id,
                "machine_name": m_name,
                "lane_id": machine_obj.get("lane_id", "L01") if isinstance(machine_obj, dict) else getattr(machine_obj, "lane_id", "L01"),
                "predicted_time_min": round(proc_time, 1),
                "processing_time_min": round(proc_time, 1),
                "setup_time_min": round(setup_time, 1),
                "scheduled_start_min": round(s_start, 1),
                "scheduled_end_min": round(s_end, 1),
                "worker_id": assigned_worker.get("id"),
                "worker_name": assigned_worker.get("name"),
                "material_status": "AVAILABLE",
                "operation_cost": round(op_cost, 2),
                "candidates": all_cands[:3]
            })

        total_hours = max_end_min / 60.0
        hours_to_deadline = (deadline_dt - now).total_seconds() / 3600.0
        deadline_risk = "LOW" if total_hours < hours_to_deadline else ("MEDIUM" if total_hours < hours_to_deadline * 1.15 else "HIGH")

        plan_data = {
            "id": plan_id,
            "order_id": order_id,
            "product_name": product_name,
            "product_code": product_code,
            "quantity": quantity,
            "priority": priority,
            "customer": customer,
            "deadline": deadline_dt.isoformat(),
            "status": "PENDING_SUPERVISOR_REVIEW",
            "estimated_duration_hours": round(total_hours, 1),
            "estimated_cost": round(total_cost, 2),
            "deadline_risk": deadline_risk,
            "bottleneck_risk": "MEDIUM (Cutting Station)" if quantity > 10000 else "LOW",
            "operations": plan_ops,
            "created_by": username,
            "created_at": now.isoformat()
        }

        # Store in MongoDB planning collection
        from backend.database.mongo import get_collection
        get_collection("planning_plans").insert_one(dict(plan_data))

        # Audit
        audit_repo.record_event(
            action="PLAN_PROPOSED",
            actor=username,
            role="MANAGER",
            entity="PLAN",
            entity_id=plan_id,
            metadata={"order_id": order_id, "quantity": quantity, "priority": priority}
        )

        websocket_service.broadcast("plan.created", plan_data)
        websocket_service.notify_schedule_updated()
        return plan_data

    @staticmethod
    def approve_plan(
        plan_id: str,
        operations: List[Dict[str, Any]] = None,
        notes: str = "",
        username: str = "supervisor",
        user_id: str = None,
        override_operations: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.database.mongo import get_collection
        plan_coll = get_collection("planning_plans")
        plan = plan_coll.find_one({"id": plan_id})
        if not plan:
            raise ResourceNotFoundError("Plan", plan_id)

        curr_status = plan.get("status", "PENDING_SUPERVISOR_REVIEW")
        StateTransitionService.validate_transition(
            entity_type="PLAN",
            current_state=curr_status,
            target_state="SUPERVISOR_APPROVED",
            role="SUPERVISOR"
        )

        # Validate with OR-Tools constraint checker
        effective_ops = override_operations if override_operations is not None else operations
        ops_to_validate = effective_ops or plan.get("operations", [])
        validation = production_scheduler.validate_plan(ops_to_validate)
        if not validation.get("is_valid"):
            raise ValidationError(f"Plan validation failed: {validation.get('violated_constraint')}")

        # Update or Commit Order Document in MongoDB
        order_id = plan["order_id"]
        existing_order = order_repo.get_by_id(order_id)
        if existing_order:
            order_repo.update_status(order_id, "ACTIVE")
            get_collection("orders").update_one(
                {"id": order_id},
                {"$set": {"production_status": "ACTIVE", "erp_status": "IN_PRODUCTION", "operations": ops_to_validate}}
            )
            op_coll = get_collection("order_operations")
            op_coll.delete_many({"order_id": order_id})
            for op in ops_to_validate:
                op_doc = dict(op)
                op_doc["order_id"] = order_id
                op_doc["status"] = "QUEUED"
                op_doc["created_at"] = datetime.utcnow().isoformat()
                op_coll.insert_one(op_doc)
        else:
            order_data = {
                "id": order_id,
                "order_id": order_id,
                "product": plan["product_name"],
                "product_name": plan["product_name"],
                "product_code": plan["product_code"],
                "quantity": plan["quantity"],
                "priority": plan["priority"],
                "customer": plan.get("customer", "Retail Customer"),
                "status": "ACTIVE",
                "production_status": "ACTIVE",
                "erp_status": "IN_PRODUCTION",
                "deadline": plan["deadline"]
            }
            order_repo.create_order(order_data, operations=ops_to_validate)

        # Create Baseline Schedule Version
        schedule_repo.save_schedule_version(
            schedule_id=f"SCHED-{order_id}-v1",
            version=1,
            schedule_type=ScheduleType.BASELINE.value,
            reason="Initial Supervisor Approval",
            created_by=username,
            operations=ops_to_validate,
            status=ScheduleStatus.ACTIVE.value
        )

        # Update Plan status: PENDING_SUPERVISOR_REVIEW -> SUPERVISOR_APPROVED -> ACTIVE
        plan_coll.update_one({"id": plan_id}, {"$set": {
            "status": "ACTIVE",
            "lifecycle_status": "SUPERVISOR_APPROVED",
            "approval_role": "SUPERVISOR",
            "approval_notes": notes,
            "approved_by": username,
            "approved_at": datetime.utcnow().isoformat(),
            "schedule_version": 1
        }})

        audit_repo.record_event(
            action="SCHEDULE_APPROVED",
            actor=username,
            role="SUPERVISOR",
            entity="ORDER",
            entity_id=order_id,
            metadata={"plan_id": plan_id}
        )

        websocket_service.broadcast("order.updated", {"order_id": order_id, "status": "ACTIVE"})
        websocket_service.notify_schedule_updated()
        return {"approved": True, "order_id": order_id, "status": "APPROVED", "lifecycle_status": "SUPERVISOR_APPROVED"}

    @staticmethod
    def reject_plan(
        plan_id: str,
        reason: str = "Rejected by Supervisor",
        username: str = "supervisor",
        user_id: str = None
    ) -> Dict[str, Any]:
        from backend.database.mongo import get_collection
        plan_coll = get_collection("planning_plans")
        plan = plan_coll.find_one({"id": plan_id})
        if not plan:
            raise ResourceNotFoundError("Plan", plan_id)

        curr_status = plan.get("status", "PENDING_SUPERVISOR_REVIEW")
        StateTransitionService.validate_transition(
            entity_type="PLAN",
            current_state=curr_status,
            target_state="REJECTED",
            role="SUPERVISOR"
        )

        plan_coll.update_one(
            {"id": plan_id},
            {"$set": {
                "status": "REJECTED",
                "rejection_reason": reason,
                "rejected_at": datetime.utcnow().isoformat(),
                "rejected_by": username
            }}
        )

        order_id = plan.get("order_id")
        if order_id:
            get_collection("orders").update_one(
                {"id": order_id},
                {"$set": {"status": "REJECTED", "rejection_reason": reason}}
            )

        audit_repo.record_event(
            action="PLAN_REJECTED",
            actor=username,
            role="SUPERVISOR",
            entity="PLAN",
            entity_id=plan_id,
            metadata={"reason": reason}
        )

        websocket_service.broadcast("plan.rejected", {"plan_id": plan_id, "order_id": order_id, "status": "REJECTED"})
        return {"rejected": True, "plan_id": plan_id, "status": "REJECTED", "reason": reason}

order_planning_service = OrderPlanningService()
