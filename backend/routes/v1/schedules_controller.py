"""
V1 Schedules Controller
Supports schedule versioning, active schedule retrieval, benchmark metrics,
and supervisor approval/rejection lifecycle enforcement.
"""

from datetime import datetime
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from backend.repositories.schedule_repository import schedule_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.user_repository import user_repo
from backend.repositories.audit_repository import audit_repo
from backend.services.scheduling_service import scheduling_service
from backend.services.order_planning_service import order_planning_service
from backend.services.websocket_service import websocket_service
from backend.schemas.common import make_success, make_error
from backend.domain.auth_decorators import role_required
from backend.database.mongo import get_collection

schedules_v1_bp = Blueprint("schedules_v1", __name__, url_prefix="/api/v1")

@schedules_v1_bp.route("/schedules", methods=["GET"])
def get_schedules():
    order_id = request.args.get("order_id")
    history = schedule_repo.get_version_history(order_id=order_id)
    return make_success(history, meta={"count": len(history)})

@schedules_v1_bp.route("/schedules/active", methods=["GET"])
def get_active_schedule():
    curr = scheduling_service.get_current_schedule()
    return make_success(curr)

@schedules_v1_bp.route("/schedules/benchmark", methods=["GET"])
def get_schedule_benchmarks():
    benchmarks = scheduling_service.get_baseline_comparisons()
    return make_success(benchmarks)

@schedules_v1_bp.route("/schedules/<string:schedule_id>/approve", methods=["POST"])
@role_required("SUPERVISOR", "MANAGER", "ADMIN")
def approve_schedule(schedule_id):
    """
    POST /api/v1/schedules/:id/approve
    Explicit supervisor confirmation step:
    Verifies: current_status == PENDING_SUPERVISOR_REVIEW
    Transitions: PENDING_SUPERVISOR_REVIEW -> SUPERVISOR_APPROVED -> ACTIVE
    Stores: approved_by, approved_at, approval_role, approval_notes, schedule_version
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "supervisor", "role": "SUPERVISOR"}
    data = request.get_json() or {}
    notes = data.get("notes") or data.get("approval_notes") or "Approved by Supervisor"
    operations = data.get("operations")

    # Search in planning_plans or schedules collection
    plan_coll = get_collection("planning_plans")
    target_plan = plan_coll.find_one({"$or": [{"id": schedule_id}, {"schedule_id": schedule_id}, {"order_id": schedule_id}]})

    if target_plan:
        plan_id = target_plan["id"]
        current_status = target_plan.get("status", "PENDING_SUPERVISOR_REVIEW")

        if current_status not in ["PENDING_SUPERVISOR_REVIEW", "PENDING_SUPERVISOR_APPROVAL", "PENDING"]:
            return make_error(
                "INVALID_STATE_TRANSITION",
                f"Cannot approve plan with status '{current_status}'. Status must be PENDING_SUPERVISOR_REVIEW.",
                status_code=400
            )

        # Transition to SUPERVISOR_APPROVED
        now_iso = datetime.utcnow().isoformat()
        plan_coll.update_one({"id": plan_id}, {"$set": {
            "status": "SUPERVISOR_APPROVED",
            "approval_role": user.get("role", "SUPERVISOR"),
            "approved_by": user.get("username", "supervisor"),
            "approved_at": now_iso,
            "approval_notes": notes
        }})

        # Now activate via order planning service
        result = order_planning_service.approve_plan(
            plan_id=plan_id,
            operations=operations or target_plan.get("operations"),
            notes=notes,
            username=user.get("username", "supervisor")
        )

        # Update status to ACTIVE
        plan_coll.update_one({"id": plan_id}, {"$set": {
            "status": "ACTIVE",
            "schedule_version": 1,
            "activated_at": now_iso
        }})

        return make_success({
            "schedule_id": schedule_id,
            "plan_id": plan_id,
            "status": "ACTIVE",
            "previous_status": "SUPERVISOR_APPROVED",
            "approved_by": user.get("username", "supervisor"),
            "approval_role": user.get("role", "SUPERVISOR"),
            "approved_at": now_iso,
            "approval_notes": notes,
            "schedule_version": 1
        })

    # If schedule document directly
    sched = schedule_repo.get_by_id(schedule_id)
    if not sched:
        return make_error("RESOURCE_NOT_FOUND", f"Schedule or Plan '{schedule_id}' not found.", status_code=404)

    now_iso = datetime.utcnow().isoformat()
    schedule_repo.update(
        {"id": schedule_id},
        {
            "status": "ACTIVE",
            "is_active": True,
            "approved_by": user.get("username", "supervisor"),
            "approval_role": user.get("role", "SUPERVISOR"),
            "approved_at": now_iso,
            "approval_notes": notes,
            "updated_at": now_iso
        }
    )

    websocket_service.notify_schedule_updated({"schedule_id": schedule_id, "status": "ACTIVE"})
    return make_success({
        "schedule_id": schedule_id,
        "status": "ACTIVE",
        "approved_by": user.get("username", "supervisor"),
        "approval_role": user.get("role", "SUPERVISOR"),
        "approved_at": now_iso,
        "approval_notes": notes,
        "schedule_version": sched.get("version", 1)
    })

@schedules_v1_bp.route("/schedules/<string:schedule_id>/reject", methods=["POST"])
@role_required("SUPERVISOR", "MANAGER", "ADMIN")
def reject_schedule(schedule_id):
    """
    POST /api/v1/schedules/:id/reject
    Supervisor rejects a proposed schedule.
    """
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "supervisor", "role": "SUPERVISOR"}
    data = request.get_json() or {}
    reason = data.get("reason", "Rejected by supervisor")

    plan_coll = get_collection("planning_plans")
    target_plan = plan_coll.find_one({"$or": [{"id": schedule_id}, {"schedule_id": schedule_id}, {"order_id": schedule_id}]})
    if target_plan:
        plan_coll.update_one({"id": target_plan["id"]}, {"$set": {
            "status": "REJECTED",
            "rejection_reason": reason,
            "rejected_by": user.get("username", "supervisor"),
            "rejected_at": datetime.utcnow().isoformat()
        }})
        audit_repo.record_event(
            action="SCHEDULE_REJECTED",
            actor=user.get("username", "supervisor"),
            role=user.get("role", "SUPERVISOR"),
            entity="PLAN",
            entity_id=target_plan["id"],
            metadata={"reason": reason}
        )
        return make_success({"schedule_id": schedule_id, "status": "REJECTED", "reason": reason})

    return make_error("RESOURCE_NOT_FOUND", f"Schedule or Plan '{schedule_id}' not found.", status_code=404)
