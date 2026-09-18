import uuid
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.database.mongo import get_collection
from backend.database.models import UserDB, PlanningDB, OrderDB, AuditLogDB
from backend.routes.auth import supervisor_or_manager_required
from backend.optimization.scheduler import production_scheduler
from backend.ml.processing_time_model import processing_time_predictor
from backend.services.websocket_service import websocket_service

planning_bp = Blueprint("planning", __name__, url_prefix="/api/planning")

@planning_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate_plan():
    """
    INTELLIGENCE LOOP 1: AUTOMATIC PRODUCTION PLANNING
    Manager confirms order requirements -> AI/ML calculates:
    - Processing times per operation (ML XGBoost)
    - Setup time & expected downtime
    - Working days & completion estimate
    - Recommended machines & worker allocations
    - Material requirements & cost calculation
    - Bottleneck risk & deadline feasibility
    Generates plan with status: PENDING_SUPERVISOR_APPROVAL.
    """
    user_id = get_jwt_identity()
    user = UserDB.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}

    data = request.get_json() or {}
    product_name = data.get("product_name", "Classic Crew Neck T-Shirt")
    product_code = data.get("product_code", "PRD-TSHIRT-01")
    quantity = int(data.get("quantity", 12000))
    priority = data.get("priority", "URGENT").upper()
    deadline_str = data.get("deadline")
    
    now = datetime.utcnow()
    if not deadline_str:
        deadline_dt = now + timedelta(hours=24)
        deadline_str = deadline_dt.isoformat()
    else:
        try:
            deadline_dt = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
        except Exception:
            deadline_dt = now + timedelta(hours=24)

    # 1. Fetch Garment Processes
    proc_coll = get_collection("processes")
    mach_coll = get_collection("machines")
    worker_coll = get_collection("workers")
    all_processes = list(proc_coll.find({}, {"_id": 0}).sort("sequence_index", 1))

    # 2. Plan Operations & ML Processing Predictions
    plan_ops = []
    total_processing_min = 0.0
    total_setup_min = 0.0
    total_cost = 0.0
    current_time_offset = 0.0

    all_workers = list(worker_coll.find({"is_available": True}, {"_id": 0}))

    for seq, proc in enumerate(all_processes, 1):
        proc_id = proc["id"]
        # Find compatible candidate machines
        compat_machs = list(mach_coll.find({
            "status": {"$in": ["RUNNING", "IDLE", "AVAILABLE"]},
            "$or": [{"process_id": proc_id}, {"compatible_processes": proc_id}]
        }, {"_id": 0}))

        # Best candidate by capacity
        if compat_machs:
            chosen_m = max(compat_machs, key=lambda m: m.get("capacity", 500))
        else:
            chosen_m = mach_coll.find_one({"process_id": proc_id}, {"_id": 0}) or {"id": f"M-{proc_id}", "name": proc["name"], "capacity": 600, "hourly_rate": 450}

        # ML Prediction for operation processing time
        mock_order = {"product_code": product_code, "quantity": quantity, "priority": priority}
        mock_op = {"process_id": proc_id, "sequence": seq}
        pred_res = processing_time_predictor.predict(chosen_m, mock_order, mock_op)
        proc_time = pred_res["predicted_processing_time"]
        setup_time = chosen_m.get("setup_time", 15.0)

        # Worker matching
        assigned_worker = all_workers[(seq - 1) % len(all_workers)] if all_workers else {"name": "Senior Operator", "id": "WRK-001"}

        op_cost = ((proc_time + setup_time) / 60.0) * chosen_m.get("production_cost_per_hour", 500.0)
        total_cost += op_cost
        total_processing_min += proc_time
        total_setup_min += setup_time

        s_start = current_time_offset
        s_end = s_start + proc_time + setup_time
        current_time_offset = s_end

        plan_ops.append({
            "sequence": seq,
            "process_id": proc_id,
            "process_name": proc["name"],
            "machine_id": chosen_m["id"],
            "machine_name": chosen_m.get("name", chosen_m["id"]),
            "lane_id": chosen_m.get("lane_id", "L01"),
            "predicted_time_min": round(proc_time, 1),
            "setup_time_min": round(setup_time, 1),
            "scheduled_start_min": round(s_start, 1),
            "scheduled_end_min": round(s_end, 1),
            "worker_id": assigned_worker.get("id"),
            "worker_name": assigned_worker.get("name"),
            "material_status": "AVAILABLE",
            "operation_cost": round(op_cost, 2)
        })

    # Total duration & working days
    total_hours = (current_time_offset) / 60.0
    working_days = round(total_hours / 8.0, 1)
    
    # Deadline & bottleneck risk
    hours_to_deadline = (deadline_dt - now).total_seconds() / 3600.0 if hasattr(deadline_dt, 'total_seconds') else 24.0
    deadline_risk = "LOW" if total_hours < hours_to_deadline else ("MEDIUM" if total_hours < hours_to_deadline * 1.15 else "HIGH")
    bottleneck_risk = "MEDIUM (Cutting Gerber/Lectra)" if quantity > 10000 else "LOW"

    # Create Order ID & Plan ID
    count = get_collection("orders").count_documents({}) + 1
    order_id = f"ORD-{1040 + count}"

    metrics = {
        "estimated_duration_hours": round(total_hours, 2),
        "estimated_working_days": working_days,
        "machine_count": len(plan_ops),
        "worker_count": len(plan_ops),
        "estimated_cost": round(total_cost, 2),
        "bottleneck_risk": bottleneck_risk,
        "deadline_risk": deadline_risk
    }

    plan_doc = PlanningDB.create_plan(
        order_id=order_id,
        product_name=product_name,
        quantity=quantity,
        priority=priority,
        deadline=deadline_str,
        operations=plan_ops,
        metrics=metrics
    )

    # Broadcast socket notification
    websocket_service.emit("plan_created", plan_doc)

    AuditLogDB.create(
        user_id=user.get("id", "USR-MGR-01"),
        username=user.get("username", "manager"),
        role="MANAGER",
        machine_id="PLANNING",
        old_status="NEW_ORDER",
        new_status="PENDING_SUPERVISOR_APPROVAL",
        reason=f"Generated AI production plan {plan_doc['id']} for {order_id} ({quantity} pcs, {priority})."
    )

    return jsonify(plan_doc), 201

@planning_bp.route("/pending", methods=["GET"])
def get_pending_plans():
    return jsonify(PlanningDB.get_pending()), 200

@planning_bp.route("/<plan_id>", methods=["GET"])
def get_plan(plan_id):
    plan = PlanningDB.get(plan_id)
    if not plan:
        return jsonify({"error": "Plan not found"}), 404
    return jsonify(plan), 200

@planning_bp.route("/<plan_id>", methods=["PATCH"])
@supervisor_or_manager_required
def edit_plan(plan_id):
    """
    Supervisor edits machine assignments, worker assignments, or timings in the AI-generated plan.
    """
    plan = PlanningDB.get(plan_id)
    if not plan:
        return jsonify({"error": "Plan not found"}), 404

    data = request.get_json() or {}
    updated_ops = data.get("operations", plan.get("operations", []))
    supervisor_notes = data.get("supervisor_notes", plan.get("supervisor_notes", ""))

    get_collection("planning_plans").update_one(
        {"id": plan_id},
        {"$set": {
            "operations": updated_ops,
            "supervisor_notes": supervisor_notes,
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    return jsonify(PlanningDB.get(plan_id)), 200

@planning_bp.route("/<plan_id>/validate", methods=["POST"])
@supervisor_or_manager_required
def validate_plan(plan_id):
    """
    Supervisor validates the edited plan against hard operational constraints:
    - Machine availability & status
    - Machine process capabilities
    - Worker availability
    - Precedence sequence
    """
    plan = PlanningDB.get(plan_id)
    if not plan:
        return jsonify({"error": "Plan not found"}), 404

    operations = plan.get("operations", [])
    val_res = production_scheduler.validate_plan(operations)
    return jsonify(val_res), 200 if val_res["is_valid"] else 422

@planning_bp.route("/<plan_id>/approve", methods=["POST"])
@supervisor_or_manager_required
def approve_plan(plan_id):
    """
    Supervisor approves plan -> Commits it as a confirmed order and active production schedule.
    """
    user_id = get_jwt_identity()
    user = UserDB.get_by_id(user_id) or {"username": "supervisor", "role": "SUPERVISOR"}

    plan = PlanningDB.get(plan_id)
    if not plan:
        return jsonify({"error": "Plan not found"}), 404

    # Validate before commit
    val_res = production_scheduler.validate_plan(plan.get("operations", []))
    if not val_res["is_valid"]:
        return jsonify({"error": "Cannot approve invalid plan", "details": val_res["violated_constraint"]}), 422

    now = datetime.utcnow()
    order_id = plan["order_id"]

    # 1. Update plan status
    get_collection("planning_plans").update_one({"id": plan_id}, {"$set": {
        "status": "APPROVED",
        "approved_by": user.get("username", "supervisor"),
        "approved_at": now.isoformat()
    }})

    # 2. Commit Order Document
    order_doc = {
        "id": order_id,
        "product_name": plan.get("product_name"),
        "product_code": "PRD-TSHIRT-01",
        "quantity": plan.get("quantity", 10000),
        "priority": plan.get("priority", "HIGH"),
        "status": "QUEUED",
        "deadline_hours": plan.get("estimated_duration_hours", 24.0) * 1.2,
        "due_date": plan.get("deadline"),
        "assigned_lane_id": "L01",
        "created_at": now.isoformat()
    }
    get_collection("orders").update_one({"id": order_id}, {"$set": order_doc}, upsert=True)

    # 3. Commit Order Operations & Schedule Operations
    for op in plan.get("operations", []):
        op_id = f"OP-{order_id.replace('ORD-', '')}-{op['sequence']:02d}"
        s_start = now + timedelta(minutes=op.get("scheduled_start_min", 0))
        s_end = now + timedelta(minutes=op.get("scheduled_end_min", 60))

        op_doc = {
            "id": op_id,
            "order_id": order_id,
            "sequence": op["sequence"],
            "process_id": op["process_id"],
            "process_name": op["process_name"],
            "assigned_machine_id": op["machine_id"],
            "original_machine_id": op["machine_id"],
            "status": "QUEUED",
            "scheduled_start_min": op.get("scheduled_start_min", 0),
            "scheduled_end_min": op.get("scheduled_end_min", 60),
            "processing_time_min": op.get("predicted_time_min", 60),
            "setup_time_min": op.get("setup_time_min", 15),
            "progress_percentage": 0.0
        }
        get_collection("order_operations").update_one({"id": op_id}, {"$set": op_doc}, upsert=True)

        sched_doc = {
            "id": f"SCHED-{op_id}",
            "order_id": order_id,
            "order_priority": plan.get("priority", "HIGH"),
            "product_name": plan.get("product_name"),
            "operation_id": op_id,
            "sequence": op["sequence"],
            "process_id": op["process_id"],
            "process_name": op["process_name"],
            "machine_id": op["machine_id"],
            "machine_name": op.get("machine_name", op["machine_id"]),
            "lane_id": op.get("lane_id", "L01"),
            "worker_id": op.get("worker_id"),
            "worker_name": op.get("worker_name"),
            "status": "QUEUED",
            "scheduled_start": s_start.isoformat(),
            "scheduled_end": s_end.isoformat(),
            "scheduled_start_min": op.get("scheduled_start_min", 0),
            "scheduled_end_min": op.get("scheduled_end_min", 60),
            "actual_start": None,
            "actual_end": None,
            "predicted_processing_time": op.get("predicted_time_min", 60),
            "setup_time": op.get("setup_time_min", 15),
            "priority": plan.get("priority", "HIGH"),
            "deadline": plan.get("deadline"),
            "is_delayed": False,
            "is_reassigned": False,
            "original_machine_id": op["machine_id"],
            "reassigned_machine_id": None,
            "production_cost": op.get("operation_cost", 1200.0)
        }
        get_collection("schedule_operations").update_one({"id": f"SCHED-{op_id}"}, {"$set": sched_doc}, upsert=True)

    # 4. Broadcast live events
    websocket_service.emit("plan_approved", {"plan_id": plan_id, "order_id": order_id})
    websocket_service.notify_schedule_updated({"order_id": order_id})

    AuditLogDB.create(
        user_id=user.get("id", "USR-SUP-01"),
        username=user.get("username", "supervisor"),
        role="SUPERVISOR",
        machine_id="PLANNING",
        old_status="PENDING_SUPERVISOR_APPROVAL",
        new_status="APPROVED",
        reason=f"Supervisor approved production plan {plan_id} for order {order_id}."
    )

    return jsonify({"status": "APPROVED", "plan_id": plan_id, "order_id": order_id}), 200

@planning_bp.route("/<plan_id>/reject", methods=["POST"])
@supervisor_or_manager_required
def reject_plan(plan_id):
    user_id = get_jwt_identity()
    user = UserDB.get_by_id(user_id) or {"username": "supervisor", "role": "SUPERVISOR"}
    data = request.get_json() or {}
    reason = data.get("reason", "Rejected by supervisor")

    get_collection("planning_plans").update_one({"id": plan_id}, {"$set": {
        "status": "REJECTED",
        "rejected_by": user.get("username", "supervisor"),
        "rejection_reason": reason,
        "rejected_at": datetime.utcnow().isoformat()
    }})

    AuditLogDB.create(
        user_id=user.get("id", "USR-SUP-01"),
        username=user.get("username", "supervisor"),
        role="SUPERVISOR",
        machine_id="PLANNING",
        old_status="PENDING_SUPERVISOR_APPROVAL",
        new_status="REJECTED",
        reason=f"Supervisor rejected plan {plan_id}: {reason}"
    )

    return jsonify({"status": "REJECTED", "plan_id": plan_id, "reason": reason}), 200
