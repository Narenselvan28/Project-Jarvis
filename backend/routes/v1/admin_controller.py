"""
V1 Admin Controller
Provides comprehensive administration APIs: System Overview, Machine Management,
User Management, and System Activity Audit Trail.
"""

from datetime import datetime
import uuid
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from werkzeug.security import generate_password_hash

from backend.repositories.user_repository import user_repo
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.schedule_repository import schedule_repo
from backend.repositories.maintenance_repository import maintenance_repo
from backend.repositories.audit_repository import audit_repo
from backend.services.disruption_service import disruption_service
from backend.database.mongo import get_collection
from backend.schemas.common import make_success, make_error
from backend.schemas.disruption_schemas import DisruptionTriggerSchema
from backend.domain.auth_decorators import role_required

admin_v1_bp = Blueprint("admin_v1", __name__, url_prefix="/api/v1")

# ============================================================
# 1. SYSTEM OVERVIEW / DASHBOARD
# ============================================================

@admin_v1_bp.route("/admin/dashboard", methods=["GET"])
@role_required("ADMIN", "MANAGER")
def get_admin_dashboard():
    """
    GET /api/v1/admin/dashboard
    Aggregated operational counts across Users, Machines, Orders, Schedules, and Maintenance.
    """
    users = user_repo.find_all()
    roles_count = {}
    for u in users:
        r = u.get("role", "SUPERVISOR").upper()
        roles_count[r] = roles_count.get(r, 0) + 1

    machines = machine_repo.get_all_machines()
    machine_status_count = {"AVAILABLE": 0, "RUNNING": 0, "FAILED": 0, "MAINTENANCE": 0, "IDLE": 0}
    for m in machines:
        st = m.get("status", "AVAILABLE").upper()
        machine_status_count[st] = machine_status_count.get(st, 0) + 1

    orders = order_repo.get_all_orders()
    active_orders = sum(1 for o in orders if o.get("production_status") == "ACTIVE" or o.get("status") == "ACTIVE")
    
    # Pending supervisor approvals from planning_plans collection
    planning_coll = get_collection("planning_plans")
    pending_approvals = planning_coll.count_documents({
        "status": {"$in": ["PENDING_SUPERVISOR_REVIEW", "PENDING_SUPERVISOR_APPROVAL", "PENDING"]}
    })

    schedules = schedule_repo.find_all()
    active_schedules = sum(1 for s in schedules if s.get("status") == "ACTIVE" or s.get("is_active"))

    work_orders = maintenance_repo.get_all()
    open_maintenance = sum(1 for wo in work_orders if wo.get("status") in ["OPEN", "ASSIGNED"])
    in_progress_maintenance = sum(1 for wo in work_orders if wo.get("status") == "IN_PROGRESS")

    return make_success({
        "total_users": len(users),
        "users_by_role": roles_count,
        "total_machines": len(machines),
        "machines_by_status": machine_status_count,
        "total_active_orders": active_orders,
        "total_pending_supervisor_approvals": pending_approvals,
        "total_active_schedules": active_schedules,
        "open_maintenance_requests": open_maintenance,
        "in_progress_maintenance": in_progress_maintenance
    })

# ============================================================
# 2. USER MANAGEMENT
# ============================================================

@admin_v1_bp.route("/admin/users", methods=["GET"])
@role_required("ADMIN", "MANAGER")
def list_admin_users():
    """
    GET /api/v1/admin/users
    Lists all users with safe sanitization.
    """
    role_filter = request.args.get("role")
    query = {}
    if role_filter:
        query["role"] = role_filter.upper()
    users = user_repo.find_all(query, projection={"_id": 0, "password_hash": 0})
    for u in users:
        if "is_active" not in u:
            u["is_active"] = True
        u["status"] = "Active" if u.get("is_active", True) else "Disabled"
    return make_success(users, meta={"count": len(users)})

@admin_v1_bp.route("/admin/users", methods=["POST"])
@role_required("ADMIN", "MANAGER")
def create_admin_user():
    """
    POST /api/v1/admin/users
    Create a new user with specified role (MANAGER, SUPERVISOR, SERVICE_PERSON, ADMIN).
    """
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    role = data.get("role", "SUPERVISOR").upper().strip()
    full_name = data.get("full_name", username.capitalize()).strip()
    email = data.get("email", f"{username}@reflow.io").strip()

    if not username or not password:
        return make_error("VALIDATION_ERROR", "Username and password are required.", status_code=400)

    if role not in ["MANAGER", "SUPERVISOR", "SERVICE_PERSON", "ADMIN"]:
        return make_error("VALIDATION_ERROR", f"Invalid role '{role}'. Allowed: MANAGER, SUPERVISOR, SERVICE_PERSON, ADMIN.", status_code=400)

    existing = user_repo.get_by_username(username)
    if existing:
        return make_error("CONFLICT", f"Username '{username}' already exists.", status_code=409)

    new_user = {
        "id": f"USR-{uuid.uuid4().hex[:6].upper()}",
        "username": username,
        "password_hash": generate_password_hash(password),
        "role": role,
        "full_name": full_name,
        "email": email,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    user_repo.insert(new_user)

    audit_repo.record_event(
        action="USER_CREATED",
        actor="admin",
        role="ADMIN",
        entity="USER",
        entity_id=new_user["id"],
        metadata={"username": username, "assigned_role": role}
    )

    safe_user = dict(new_user)
    safe_user.pop("password_hash", None)
    safe_user.pop("_id", None)
    return make_success(safe_user, status_code=201)

@admin_v1_bp.route("/admin/users/<string:user_id>", methods=["PATCH"])
@role_required("ADMIN", "MANAGER")
def update_admin_user(user_id):
    """
    PATCH /api/v1/admin/users/<id>
    Update user role, active status, or details.
    """
    data = request.get_json() or {}
    user = user_repo.get_by_id(user_id)
    if not user:
        return make_error("RESOURCE_NOT_FOUND", f"User '{user_id}' not found.", status_code=404)

    update_fields = {"updated_at": datetime.utcnow().isoformat()}
    if "role" in data:
        new_role = data["role"].upper().strip()
        if new_role not in ["MANAGER", "SUPERVISOR", "SERVICE_PERSON", "ADMIN"]:
            return make_error("VALIDATION_ERROR", f"Invalid role '{new_role}'.", status_code=400)
        update_fields["role"] = new_role

    if "is_active" in data:
        update_fields["is_active"] = bool(data["is_active"])

    if "full_name" in data:
        update_fields["full_name"] = str(data["full_name"]).strip()

    if "email" in data:
        update_fields["email"] = str(data["email"]).strip()

    user_repo.update({"id": user_id}, update_fields)

    audit_repo.record_event(
        action="USER_UPDATED",
        actor="admin",
        role="ADMIN",
        entity="USER",
        entity_id=user_id,
        metadata=update_fields
    )

    updated = user_repo.get_by_id(user_id)
    updated.pop("password_hash", None)
    updated.pop("_id", None)
    return make_success(updated)

# ============================================================
# 3. MACHINE MANAGEMENT
# ============================================================

@admin_v1_bp.route("/admin/machines", methods=["GET"])
@role_required("ADMIN", "MANAGER")
def list_admin_machines():
    """
    GET /api/v1/admin/machines
    Returns all 50 machines enriched with operation, utilization %, failure risk, and maintenance date.
    """
    machines = machine_repo.get_all_machines()
    from backend.ml.prediction import predict_machine_risk

    enriched = []
    for m in machines:
        risk_res = predict_machine_risk(m)
        enriched.append({
            "id": m.get("id"),
            "machine_id": m.get("id"),
            "name": m.get("name", m.get("id")),
            "process": m.get("process_name", m.get("process_id", "General")),
            "process_id": m.get("process_id"),
            "lane_id": m.get("lane_id", "L01"),
            "status": m.get("status", "AVAILABLE"),
            "capacity": m.get("capacity", 100),
            "current_order": m.get("current_order_id") or m.get("current_order") or "None",
            "current_operation": m.get("current_operation") or "Idle",
            "utilization_pct": m.get("utilization", m.get("utilization_pct", 78.5)),
            "last_maintenance_date": m.get("last_maintenance_date", "2026-09-10"),
            "failure_risk_pct": risk_res.get("risk_percentage", 12.5),
            "hourly_rate": m.get("hourly_rate", 1200.0)
        })

    return make_success(enriched, meta={"count": len(enriched)})

@admin_v1_bp.route("/admin/machines/<string:machine_id>", methods=["PATCH"])
@role_required("ADMIN", "MANAGER")
def update_admin_machine(machine_id):
    """
    PATCH /api/v1/admin/machines/<id>
    Admin override for machine status, hourly rate, or configuration.
    """
    data = request.get_json() or {}
    mach = machine_repo.get_by_id(machine_id)
    if not mach:
        return make_error("RESOURCE_NOT_FOUND", f"Machine '{machine_id}' not found.", status_code=404)

    update_fields = {"updated_at": datetime.utcnow().isoformat()}
    if "status" in data:
        update_fields["status"] = data["status"].upper()
    if "hourly_rate" in data:
        update_fields["hourly_rate"] = float(data["hourly_rate"])
    if "name" in data:
        update_fields["name"] = str(data["name"])

    machine_repo.update({"id": machine_id}, update_fields)

    audit_repo.record_event(
        action="MACHINE_OVERRIDE",
        actor="admin",
        role="ADMIN",
        entity="MACHINE",
        entity_id=machine_id,
        metadata=update_fields
    )

    updated = machine_repo.get_by_id(machine_id)
    return make_success(updated)

# ============================================================
# 4. SYSTEM ACTIVITY / AUDIT LOG
# ============================================================

@admin_v1_bp.route("/admin/audit-logs", methods=["GET"])
@role_required("ADMIN", "MANAGER")
def get_admin_audit_logs():
    """
    GET /api/v1/admin/audit-logs
    Returns system activity event logs.
    """
    limit = int(request.args.get("limit", 100))
    action = request.args.get("action")
    logs = audit_repo.get_recent(limit=limit, action=action)
    return make_success(logs, meta={"count": len(logs)})

# ============================================================
# 5. DISRUPTIONS & FACTORY RESET
# ============================================================

@admin_v1_bp.route("/admin/disruptions", methods=["POST"])
def trigger_admin_disruption():
    """
    POST /api/v1/admin/disruptions
    Admin/Postman endpoint that executes the genuine production recovery pipeline.
    """
    raw_data = request.get_json() or {}
    try:
        req = DisruptionTriggerSchema(**raw_data)
    except Exception as e:
        return make_error("VALIDATION_ERROR", str(e), status_code=400)

    try:
        result = disruption_service.simulate_disruption(
            machine_id=req.machine_id,
            failure_type=req.failure_type,
            duration_hours=req.duration_hours,
            user={"id": "USR-ADM-01", "username": "admin", "role": "MANAGER"}
        )
        return make_success(result)
    except Exception as e:
        return make_error("PIPELINE_EXECUTION_ERROR", str(e), status_code=400)

@admin_v1_bp.route("/admin/reset", methods=["POST"])
def admin_reset_factory():
    """
    Resets the demo factory environment into deterministic known state.
    """
    from backend.seed.seed_mongo import seed_mongo
    seed_mongo()
    return make_success({"status": "FACTORY_RESET_SUCCESS", "message": "Demo scenario re-seeded successfully."})
