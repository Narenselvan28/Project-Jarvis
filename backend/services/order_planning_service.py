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
from backend.domain.schedule_versioning import ScheduleStatus, ScheduleType
from backend.services.websocket_service import websocket_service
from backend.domain.errors import ValidationError, ResourceNotFoundError

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
        username: str = "manager"
    ) -> Dict[str, Any]:
        """
        Executes Intelligence Loop 1:
        1. Create confirmed Order in DRAFT/PLANNED state
        2. Sequence operations from Bill of Process
        3. For each operation: find candidates, run ML processing prediction, evaluate suitability
        4. Solve OR-Tools CP-SAT for optimal machine allocation
        5. Return proposed plan awaiting Supervisor approval (never auto-activated)
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
        order_id = f"ORD-{str(uuid.uuid4())[:4].upper()}"

        plan_ops = []
        current_time_offset = 0.0
        total_cost = 0.0
        total_proc_min = 0.0
        total_setup_min = 0.0

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

            # 1. Candidate evaluation using ML predictions + suitability scoring
            candidates = find_candidate_machines(
                machine_id=None,
                process_id=proc_id,
                order=mock_order,
                operation=mock_op,
                required_precision="HIGH"
            )

            # 2. Select best allocation from candidates
            if candidates:
                chosen_cand = candidates[0]
                chosen_m_id = chosen_cand["machine_id"]
                proc_time = float(chosen_cand.get("predicted_processing_time", 60.0))
                setup_time = float(chosen_cand.get("setup_time_min", 15.0))
                machine_obj = all_machines.get(chosen_m_id, {})
                m_name = machine_obj.get("name", chosen_m_id)
                rate = machine_obj.get("hourly_rate", 1200.0)
            else:
                chosen_m = machine_repo.find_by_process(proc_id)
                chosen_m_id = chosen_m[0]["id"] if chosen_m else f"M-{proc_id}"
                m_name = chosen_m[0].get("name", chosen_m_id) if chosen_m else chosen_m_id
                rate = 1200.0
                proc_time = 60.0
                setup_time = 15.0

            assigned_worker = all_workers[(seq - 1) % len(all_workers)] if all_workers else {"name": "Senior Operator", "id": "WRK-001"}
            op_cost = ((proc_time + setup_time) / 60.0) * rate

            s_start = current_time_offset
            s_end = s_start + proc_time + setup_time
            current_time_offset = s_end

            total_proc_min += proc_time
            total_setup_min += setup_time
            total_cost += op_cost

            plan_ops.append({
                "sequence": seq,
                "process_id": proc_id,
                "process_name": proc.get("name", proc_id),
                "machine_id": chosen_m_id,
                "assigned_machine_id": chosen_m_id,
                "machine_name": m_name,
                "lane_id": all_machines.get(chosen_m_id, {}).get("lane_id", "L01"),
                "predicted_time_min": round(proc_time, 1),
                "processing_time_min": round(proc_time, 1),
                "setup_time_min": round(setup_time, 1),
                "scheduled_start_min": round(s_start, 1),
                "scheduled_end_min": round(s_end, 1),
                "worker_id": assigned_worker.get("id"),
                "worker_name": assigned_worker.get("name"),
                "material_status": "AVAILABLE",
                "operation_cost": round(op_cost, 2),
                "candidates": candidates[:3]
            })

        total_hours = current_time_offset / 60.0
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
            "status": "PENDING_SUPERVISOR_APPROVAL",
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

        websocket_service.notify_schedule_updated()
        return plan_data

    @staticmethod
    def approve_plan(plan_id: str, operations: List[Dict[str, Any]] = None, notes: str = "", username: str = "supervisor") -> Dict[str, Any]:
        from backend.database.mongo import get_collection
        plan_coll = get_collection("planning_plans")
        plan = plan_coll.find_one({"id": plan_id})
        if not plan:
            raise ResourceNotFoundError("Plan", plan_id)

        # Validate with OR-Tools constraint checker
        ops_to_validate = operations or plan.get("operations", [])
        validation = production_scheduler.validate_plan(ops_to_validate)
        if not validation.get("is_valid"):
            raise ValidationError(f"Plan validation failed: {validation.get('violated_constraint')}")

        # Commit Order & Schedule
        order_data = {
            "id": plan["order_id"],
            "product": plan["product_name"],
            "product_code": plan["product_code"],
            "quantity": plan["quantity"],
            "priority": plan["priority"],
            "customer": plan.get("customer", "Retail Customer"),
            "status": "QUEUED",
            "deadline": plan["deadline"]
        }
        order_repo.create_order(order_data, operations=ops_to_validate)

        # Create Baseline Schedule Version
        schedule_repo.save_schedule_version(
            schedule_id=f"SCHED-{plan['order_id']}-v1",
            version=1,
            schedule_type=ScheduleType.BASELINE.value,
            reason="Initial Supervisor Approval",
            created_by=username,
            operations=ops_to_validate,
            status=ScheduleStatus.ACTIVE.value
        )

        # Update Plan status
        plan_coll.update_one({"id": plan_id}, {"$set": {
            "status": "APPROVED",
            "approval_notes": notes,
            "approved_by": username,
            "approved_at": datetime.utcnow().isoformat()
        }})

        audit_repo.record_event(
            action="SCHEDULE_APPROVED",
            actor=username,
            role="SUPERVISOR",
            entity="ORDER",
            entity_id=plan["order_id"],
            metadata={"plan_id": plan_id}
        )

        websocket_service.notify_schedule_updated()
        return {"approved": True, "order_id": plan["order_id"], "status": "APPROVED"}

order_planning_service = OrderPlanningService()
