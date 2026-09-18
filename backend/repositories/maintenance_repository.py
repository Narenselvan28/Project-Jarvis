"""
Maintenance Repository for MongoDB
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.repositories.base_repository import BaseRepository

class MaintenanceRepository(BaseRepository):
    def __init__(self):
        super().__init__("maintenance_work_orders")

    def get_all(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = {"status": status} if status else {}
        return self.find_all(query, sort=[("created_at", -1)])

    def get_by_id(self, wo_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"id": wo_id})

    def get_active_by_machine(self, machine_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({
            "machine_id": machine_id,
            "status": {"$in": ["OPEN", "ASSIGNED", "IN_PROGRESS", "REPAIRED", "VERIFIED"]}
        })

    def create_work_order(
        self,
        machine_id: str,
        fault_type: str,
        priority: str = "HIGH",
        estimated_hours: float = 4.0,
        disruption_id: Optional[str] = None,
        assigned_to: Optional[str] = None,
        assigned_service_person_name: Optional[str] = None,
        defect_description: Optional[str] = None,
        affected_order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        count = self.count() + 1
        wo_id = f"WO-{count:05d}"
        doc = {
            "id": wo_id,
            "work_order_id": wo_id,
            "machine_id": machine_id,
            "disruption_id": disruption_id,
            "fault_type": fault_type,
            "priority": priority,
            "status": "OPEN",
            "assigned_to": assigned_to,
            "assigned_worker_id": assigned_to,
            "assigned_service_person_id": assigned_to,
            "assigned_service_person_name": assigned_service_person_name or "Vikram Patel",
            "defect_description": defect_description or fault_type,
            "affected_order_id": affected_order_id,
            "invoice_id": None,
            "estimated_hours": float(estimated_hours),
            "actual_hours": 0.0,
            "notes": "",
            "created_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "repaired_at": None,
            "verified_at": None,
            "closed_at": None,
            "updated_at": datetime.utcnow().isoformat()
        }
        return self.insert(doc)

    def update_workflow(
        self,
        wo_id: str,
        new_status: str,
        notes: Optional[str] = None,
        assigned_to: Optional[str] = None,
        actual_hours: Optional[float] = None
    ) -> bool:
        update_fields = {
            "status": new_status,
            "updated_at": datetime.utcnow().isoformat()
        }
        now_iso = datetime.utcnow().isoformat()
        if notes is not None:
            update_fields["notes"] = notes
        if assigned_to:
            update_fields["assigned_to"] = assigned_to
            update_fields["assigned_worker_id"] = assigned_to
        if actual_hours is not None:
            update_fields["actual_hours"] = float(actual_hours)

        if new_status == "IN_PROGRESS":
            update_fields["started_at"] = now_iso
        elif new_status == "REPAIRED":
            update_fields["repaired_at"] = now_iso
        elif new_status == "VERIFIED":
            update_fields["verified_at"] = now_iso
        elif new_status == "CLOSED":
            update_fields["closed_at"] = now_iso

        return self.update({"id": wo_id}, update_fields)

maintenance_repo = MaintenanceRepository()
