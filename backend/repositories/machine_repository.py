"""
Machine Repository for MongoDB
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.repositories.base_repository import BaseRepository

class MachineRepository(BaseRepository):
    def __init__(self):
        super().__init__("machines")

    def get_all_machines(self) -> List[Dict[str, Any]]:
        machines = self.find_all()
        for m in machines:
            m["svg_x"] = m.get("x_position", m.get("svg_x", 100))
            m["svg_y"] = m.get("y_position", m.get("svg_y", 100))
            m["machine_id"] = m.get("id")
        return machines

    def get_by_id(self, machine_id: str) -> Optional[Dict[str, Any]]:
        m = self.find_one({"id": machine_id})
        if m:
            m["svg_x"] = m.get("x_position", m.get("svg_x", 100))
            m["svg_y"] = m.get("y_position", m.get("svg_y", 100))
            m["machine_id"] = m.get("id")
        return m

    def find_by_process(self, process_id: str) -> List[Dict[str, Any]]:
        return self.find_all({
            "$or": [
                {"process_id": process_id},
                {"compatible_processes": process_id}
            ]
        })

    def find_available_candidates(self, process_id: str, exclude_ids: List[str] = None) -> List[Dict[str, Any]]:
        exclude = exclude_ids or []
        query = {
            "id": {"$nin": exclude},
            "status": {"$in": ["AVAILABLE", "RUNNING", "IDLE"]},
            "$or": [
                {"process_id": process_id},
                {"compatible_processes": process_id}
            ]
        }
        return self.find_all(query)

    def update_status(self, machine_id: str, new_status: str) -> bool:
        return self.update(
            {"id": machine_id},
            {
                "status": new_status,
                "updated_at": datetime.utcnow().isoformat()
            }
        )

    def update_telemetry(self, machine_id: str, telemetry: Dict[str, Any]) -> bool:
        update_doc = dict(telemetry)
        update_doc["updated_at"] = datetime.utcnow().isoformat()
        return self.update({"id": machine_id}, update_doc)

    def set_current_order(self, machine_id: str, order_id: Optional[str], op_seq: Optional[int] = None) -> bool:
        return self.update(
            {"id": machine_id},
            {
                "current_order_id": order_id,
                "current_operation_seq": op_seq,
                "updated_at": datetime.utcnow().isoformat()
            }
        )

machine_repo = MachineRepository()
