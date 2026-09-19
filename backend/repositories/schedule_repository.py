"""
Schedule Repository for MongoDB
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.repositories.base_repository import BaseRepository
from backend.database.mongo import get_collection

class ScheduleRepository(BaseRepository):
    def __init__(self):
        super().__init__("schedules")

    def get_active(self) -> Optional[Dict[str, Any]]:
        sch = self.find_one({"status": "ACTIVE"}) or self.find_one({"is_active": True})
        if not sch:
            sch = self.find_one({}, sort=[("created_at", -1)])
        return sch

    def get_by_id(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"id": schedule_id})

    def get_version_history(self, order_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = {"order_id": order_id} if order_id else {}
        return self.find_all(query, sort=[("version", -1), ("created_at", -1)])

    def save_schedule_version(
        self,
        schedule_id: str,
        version: int,
        schedule_type: str,
        reason: str,
        created_by: str,
        operations: List[Dict[str, Any]],
        parent_schedule_id: Optional[str] = None,
        status: str = "PROPOSED",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        doc = {
            "id": schedule_id,
            "version": version,
            "schedule_type": schedule_type,
            "reason": reason,
            "created_by": created_by,
            "parent_schedule_id": parent_schedule_id,
            "status": status,
            "is_active": status == "ACTIVE",
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        # If marking this schedule active, supersede previous active versions with same parent/scope
        if status == "ACTIVE":
            self.collection.update_many(
                {"status": "ACTIVE"},
                {"$set": {"status": "SUPERSEDED", "is_active": False, "updated_at": datetime.utcnow().isoformat()}}
            )

        self.collection.update_one({"id": schedule_id}, {"$set": doc}, upsert=True)

        op_coll = get_collection("schedule_operations")
        # Upsert schedule operations
        for op in operations:
            op_doc = dict(op)
            op_doc["schedule_id"] = schedule_id
            if not op_doc.get("order_id"):
                op_doc["order_id"] = schedule_id.replace("SCHED-", "").split("-v")[0]
            op_doc["version"] = version
            op_doc["updated_at"] = datetime.utcnow().isoformat()
            op_coll.update_one(
                {"schedule_id": schedule_id, "order_id": op_doc.get("order_id"), "sequence": op.get("sequence")},
                {"$set": op_doc},
                upsert=True
            )

        return self.get_by_id(schedule_id)

    def get_operations(self, schedule_id: Optional[str] = None, order_id: Optional[str] = None, machine_id: Optional[str] = None) -> List[Dict[str, Any]]:
        op_coll = get_collection("schedule_operations")
        query = {}
        if schedule_id:
            query["schedule_id"] = schedule_id
        if order_id:
            query["order_id"] = order_id
        if machine_id:
            query["machine_id"] = machine_id

        return list(op_coll.find(query, {"_id": 0}).sort("scheduled_start_min", 1))

schedule_repo = ScheduleRepository()
