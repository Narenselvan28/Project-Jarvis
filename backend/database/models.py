import uuid
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from backend.database.mongo import get_collection

# --- VALID MACHINE STATE TRANSITIONS ---
VALID_TRANSITIONS = {
    "AVAILABLE": ["RUNNING", "SETUP", "IDLE", "MAINTENANCE", "FAILED"],
    "RUNNING": ["IDLE", "BLOCKED", "FAILED", "MAINTENANCE", "REASSIGNED"],
    "IDLE": ["RUNNING", "SETUP", "MAINTENANCE", "FAILED", "AVAILABLE"],
    "SETUP": ["RUNNING", "IDLE", "FAILED", "MAINTENANCE"],
    "BLOCKED": ["RUNNING", "REASSIGNED", "FAILED", "MAINTENANCE", "IDLE"],
    "FAILED": ["MAINTENANCE"],
    "MAINTENANCE": ["REPAIRED", "FAILED"],
    "REPAIRED": ["VERIFIED", "MAINTENANCE"],
    "VERIFIED": ["AVAILABLE", "IDLE", "RUNNING"],
    "REASSIGNED": ["RUNNING", "IDLE", "AVAILABLE"]
}

# Role permissions for machine state transitions
ROLE_ALLOWED_TRANSITIONS = {
    "MANAGER": ["FAILED", "AVAILABLE", "RUNNING", "IDLE", "SETUP", "BLOCKED", "MAINTENANCE", "REASSIGNED", "REPAIRED", "VERIFIED"],
    "SUPERVISOR": ["AVAILABLE", "RUNNING", "IDLE", "SETUP", "BLOCKED", "REASSIGNED"],
    "SERVICE_PERSON": ["MAINTENANCE", "REPAIRED", "VERIFIED"]
}

class UserDB:
    @staticmethod
    def create(username, password, role="MANAGER", email=None, full_name=None):
        coll = get_collection("users")
        existing = coll.find_one({"username": username})
        if existing:
            coll.update_one({"username": username}, {"$set": {
                "password_hash": generate_password_hash(password),
                "role": role,
                "email": email or f"{username}@factory.io",
                "full_name": full_name or username.capitalize(),
                "updated_at": datetime.utcnow().isoformat()
            }})
            return coll.find_one({"username": username})

        doc = {
            "id": str(uuid.uuid4())[:8],
            "username": username,
            "password_hash": generate_password_hash(password),
            "role": role.upper(),
            "email": email or f"{username}@factory.io",
            "full_name": full_name or username.capitalize(),
            "created_at": datetime.utcnow().isoformat()
        }
        coll.insert_one(doc)
        return doc

    @staticmethod
    def get_by_username(username):
        return get_collection("users").find_one({"username": username}, {"_id": 0})

    @staticmethod
    def get_by_id(user_id):
        return get_collection("users").find_one({"id": str(user_id)}, {"_id": 0})

    @staticmethod
    def verify_password(user_doc, password):
        if not user_doc or "password_hash" not in user_doc:
            return False
        return check_password_hash(user_doc["password_hash"], password)

    @staticmethod
    def all():
        return list(get_collection("users").find({}, {"_id": 0, "password_hash": 0}))


class MachineDB:
    @staticmethod
    def all():
        machines = list(get_collection("machines").find({}, {"_id": 0}))
        for m in machines:
            m["svg_x"] = m.get("x_position", 100)
            m["svg_y"] = m.get("y_position", 100)
        return machines

    @staticmethod
    def get(machine_id):
        m = get_collection("machines").find_one({"id": machine_id}, {"_id": 0})
        if m:
            m["svg_x"] = m.get("x_position", 100)
            m["svg_y"] = m.get("y_position", 100)
        return m

    @staticmethod
    def update_status(machine_id, new_status, user_role="MANAGER", reason="Manual update", user_id=None, username="System"):
        coll = get_collection("machines")
        machine = coll.find_one({"id": machine_id})
        if not machine:
            return False, f"Machine {machine_id} not found"

        old_status = machine.get("status", "AVAILABLE")
        new_status = new_status.upper()

        # Check role permission
        allowed_for_role = ROLE_ALLOWED_TRANSITIONS.get(user_role, [])
        if user_role != "MANAGER" and new_status not in allowed_for_role:
            return False, f"Role {user_role} is not permitted to transition machine to {new_status}"

        # Check state machine transition validity (Manager can administrative override)
        if user_role != "MANAGER" and old_status in VALID_TRANSITIONS:
            if new_status not in VALID_TRANSITIONS[old_status]:
                return False, f"Invalid state transition from {old_status} to {new_status}"

        coll.update_one({"id": machine_id}, {"$set": {
            "status": new_status,
            "updated_at": datetime.utcnow().isoformat()
        }})

        try:
            from backend.models.machine import Machine
            from backend.extensions import db
            m_sql = Machine.query.get(machine_id)
            if m_sql:
                m_sql.status = new_status
                db.session.commit()
        except Exception:
            pass

        # Record audit log
        AuditLogDB.create(
            user_id=user_id or username,
            username=username,
            role=user_role,
            machine_id=machine_id,
            old_status=old_status,
            new_status=new_status,
            reason=reason
        )

        return True, coll.find_one({"id": machine_id}, {"_id": 0})

    @staticmethod
    def find_by_process(process_id):
        return list(get_collection("machines").find({
            "$or": [
                {"process_id": process_id},
                {"compatible_processes": process_id}
            ]
        }, {"_id": 0}))


class OrderDB:
    @staticmethod
    def all():
        orders = list(get_collection("orders").find({}, {"_id": 0}))
        for o in orders:
            o["operations"] = list(get_collection("order_operations").find({"order_id": o["id"]}, {"_id": 0}).sort("sequence", 1))
        return orders

    @staticmethod
    def get(order_id):
        order = get_collection("orders").find_one({"id": order_id}, {"_id": 0})
        if order:
            order["operations"] = list(get_collection("order_operations").find({"order_id": order_id}, {"_id": 0}).sort("sequence", 1))
        return order

    @staticmethod
    def update_status(order_id, status):
        get_collection("orders").update_one({"id": order_id}, {"$set": {"status": status, "updated_at": datetime.utcnow().isoformat()}})


class ScheduleDB:
    @staticmethod
    def get_active():
        sch = get_collection("schedules").find_one({"is_active": True}, {"_id": 0})
        if not sch:
            sch = get_collection("schedules").find_one({}, {"_id": 0})
        return sch

    @staticmethod
    def get_by_id(schedule_id):
        return get_collection("schedules").find_one({"id": schedule_id}, {"_id": 0})

    @staticmethod
    def get_operations(order_id=None, machine_id=None):
        query = {}
        if order_id:
            query["order_id"] = order_id
        if machine_id:
            query["machine_id"] = machine_id
        return list(get_collection("schedule_operations").find(query, {"_id": 0}).sort("scheduled_start_min", 1))


class DisruptionDB:
    @staticmethod
    def create(machine_id, failure_type, duration_hours, affected_orders_count=0):
        doc = {
            "id": f"DISR-{str(uuid.uuid4())[:6].upper()}",
            "machine_id": machine_id,
            "failure_type": failure_type,
            "duration_hours": float(duration_hours),
            "affected_orders_count": affected_orders_count,
            "status": "ACTIVE",
            "started_at": datetime.utcnow().isoformat(),
            "option_a": None,
            "option_b": None,
            "approved_option": None
        }
        get_collection("disruptions").insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    def get(disruption_id):
        return get_collection("disruptions").find_one({"id": disruption_id}, {"_id": 0})

    @staticmethod
    def get_latest_active():
        return get_collection("disruptions").find_one({"status": "ACTIVE"}, {"_id": 0}, sort=[("started_at", -1)])

    @staticmethod
    def all():
        return list(get_collection("disruptions").find({}, {"_id": 0}).sort("started_at", -1))


class MaintenanceDB:
    @staticmethod
    def create(machine_id, fault_type, priority="HIGH", estimated_hours=4.0, disruption_id=None):
        count = get_collection("maintenance_work_orders").count_documents({}) + 1
        wo_id = f"WO-{count:05d}"
        doc = {
            "id": wo_id,
            "machine_id": machine_id,
            "disruption_id": disruption_id,
            "fault_type": fault_type,
            "priority": priority,
            "status": "OPEN",
            "estimated_hours": float(estimated_hours),
            "actual_hours": 0.0,
            "notes": "",
            "assigned_worker_id": None,
            "created_at": datetime.utcnow().isoformat(),
            "repaired_at": None,
            "verified_at": None
        }
        get_collection("maintenance_work_orders").insert_one(doc)
        doc.pop("_id", None)

        try:
            from backend.models.maintenance import MaintenanceWorkOrder, MaintenanceStatus
            from backend.extensions import db
            wo_sql = MaintenanceWorkOrder(
                work_order_number=wo_id,
                machine_id=machine_id,
                fault_type=fault_type,
                priority=priority,
                status=MaintenanceStatus.OPEN.value,
                estimated_repair_hours=float(estimated_hours)
            )
            db.session.add(wo_sql)
            db.session.commit()
        except Exception:
            pass

        return doc

    @staticmethod
    def all():
        return list(get_collection("maintenance_work_orders").find({}, {"_id": 0}).sort("created_at", -1))

    @staticmethod
    def get(work_order_id):
        return get_collection("maintenance_work_orders").find_one({"id": work_order_id}, {"_id": 0})

    @staticmethod
    def update_status(work_order_id, status, notes=None, actual_hours=None):
        updates = {"status": status.upper()}
        if notes:
            updates["notes"] = notes
        if actual_hours is not None:
            updates["actual_hours"] = float(actual_hours)
        if status.upper() == "REPAIRED":
            updates["repaired_at"] = datetime.utcnow().isoformat()
        elif status.upper() in ["VERIFIED", "CLOSED"]:
            updates["verified_at"] = datetime.utcnow().isoformat()

        get_collection("maintenance_work_orders").update_one({"id": work_order_id}, {"$set": updates})

        try:
            from backend.models.maintenance import MaintenanceWorkOrder
            from backend.extensions import db
            wo_sql = MaintenanceWorkOrder.query.get(work_order_id)
            if wo_sql:
                wo_sql.status = status.upper()
                if notes:
                    wo_sql.notes = notes
                db.session.commit()
        except Exception:
            pass

        return get_collection("maintenance_work_orders").find_one({"id": work_order_id}, {"_id": 0})


class PlanningDB:
    @staticmethod
    def create_plan(order_id, product_name, quantity, priority, deadline, operations, metrics):
        plan_id = f"PLAN-{order_id.replace('ORD-', '')}"
        doc = {
            "id": plan_id,
            "order_id": order_id,
            "product_name": product_name,
            "quantity": int(quantity),
            "priority": priority,
            "deadline": str(deadline),
            "status": "PENDING_SUPERVISOR_APPROVAL",
            "estimated_duration_hours": metrics.get("estimated_duration_hours", 8.0),
            "estimated_working_days": metrics.get("estimated_working_days", 1.5),
            "machine_count": metrics.get("machine_count", len(operations)),
            "worker_count": metrics.get("worker_count", len(operations)),
            "estimated_cost": metrics.get("estimated_cost", 15000.0),
            "bottleneck_risk": metrics.get("bottleneck_risk", "LOW"),
            "deadline_risk": metrics.get("deadline_risk", "LOW"),
            "operations": operations,
            "supervisor_notes": "",
            "created_at": datetime.utcnow().isoformat()
        }
        get_collection("planning_plans").update_one({"id": plan_id}, {"$set": doc}, upsert=True)
        return doc

    @staticmethod
    def get(plan_id):
        return get_collection("planning_plans").find_one({"id": plan_id}, {"_id": 0})

    @staticmethod
    def get_pending():
        return list(get_collection("planning_plans").find({"status": "PENDING_SUPERVISOR_APPROVAL"}, {"_id": 0}).sort("created_at", -1))

    @staticmethod
    def all():
        return list(get_collection("planning_plans").find({}, {"_id": 0}).sort("created_at", -1))


class AuditLogDB:
    @staticmethod
    def create(user_id, username, role, machine_id, old_status, new_status, reason):
        doc = {
            "id": str(uuid.uuid4())[:8],
            "user_id": str(user_id),
            "username": username,
            "role": role,
            "machine_id": machine_id,
            "old_status": old_status,
            "new_status": new_status,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        }
        get_collection("audit_logs").insert_one(doc)
        return doc

    @staticmethod
    def all():
        return list(get_collection("audit_logs").find({}, {"_id": 0}).sort("timestamp", -1))
