"""
Workforce & Departmental Shift Repository
Manages factory department staffing, shifts, operator allocations, and labor hourly rates.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.repositories.base_repository import BaseRepository

logger = logging.getLogger("repositories.workforce")

class WorkforceRepository(BaseRepository):
    def __init__(self):
        super().__init__("workforce")

    def get_all(self, department: Optional[str] = None, shift: Optional[str] = None) -> List[Dict[str, Any]]:
        query = {}
        if department and department != "All":
            query["department"] = department
        if shift and shift != "All":
            query["shift"] = shift
        return self.find_all(query, sort=[("department", 1), ("shift", 1)])

    def get_by_id(self, wf_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"id": wf_id})

    def check_capacity(self, department: str, required_count: int) -> Dict[str, Any]:
        records = self.find_all({"department": {"$regex": f"^{department}", "$options": "i"}})
        total_avail = sum(int(r.get("available_operators", 0)) for r in records) if records else 15
        is_sufficient = total_avail >= required_count
        return {
            "department": department,
            "required": required_count,
            "available": total_avail,
            "sufficient": is_sufficient,
            "status": "Feasible" if is_sufficient else "Operator Bottleneck"
        }

    def upsert(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        wf_id = doc.get("id")
        existing = self.get_by_id(wf_id) if wf_id else None
        if existing:
            self.update({"id": wf_id}, doc)
            return self.get_by_id(wf_id)
        return self.insert(doc)

    def update_counts(self, wf_id: str, available: int, active: Optional[int] = None) -> bool:
        updates = {"available_operators": int(available), "updated_at": datetime.utcnow().isoformat()}
        if active is not None:
            updates["active_operators"] = int(active)
        return self.update({"id": wf_id}, updates)

workforce_repo = WorkforceRepository()
