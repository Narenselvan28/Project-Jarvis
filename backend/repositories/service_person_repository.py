"""
Service Person & Field Engineer Repository
Manages specialized technicians, repair certifications, active service dispatches, and hours.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.repositories.base_repository import BaseRepository

logger = logging.getLogger("repositories.service_person")

class ServicePersonRepository(BaseRepository):
    def __init__(self):
        super().__init__("service_persons")

    def get_all(self, availability: Optional[str] = None) -> List[Dict[str, Any]]:
        query = {}
        if availability and availability != "All":
            query["availability"] = availability
        return self.find_all(query, sort=[("id", 1)])

    def get_by_id(self, sp_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"id": sp_id})

    def get_by_specialization(self, spec: str) -> List[Dict[str, Any]]:
        return self.find_all({"specialization": {"$regex": f"^{spec}", "$options": "i"}})

    def upsert(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        sp_id = doc.get("id")
        existing = self.get_by_id(sp_id) if sp_id else None
        if existing:
            self.update({"id": sp_id}, doc)
            return self.get_by_id(sp_id)
        return self.insert(doc)

    def record_repair_completed(self, sp_id: str, downtime_hours: float) -> bool:
        sp = self.get_by_id(sp_id)
        if not sp:
            return False
        active = max(0, int(sp.get("active_repairs_count", 1)) - 1)
        completed = int(sp.get("completed_repairs_count", 0)) + 1
        hours = float(sp.get("total_service_hours", 0.0)) + float(downtime_hours)
        return self.update({"id": sp_id}, {
            "active_repairs_count": active,
            "completed_repairs_count": completed,
            "total_service_hours": round(hours, 1),
            "availability": "Available",
            "updated_at": datetime.utcnow().isoformat()
        })

service_person_repo = ServicePersonRepository()
