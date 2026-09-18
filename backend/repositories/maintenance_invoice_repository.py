"""
Maintenance Invoice & Billing Repository
Manages maintenance repair invoices, parts replacement costs, labor billing, and repair history.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.repositories.base_repository import BaseRepository

logger = logging.getLogger("repositories.maintenance_invoice")

class MaintenanceInvoiceRepository(BaseRepository):
    def __init__(self):
        super().__init__("maintenance_invoices")

    def get_all(self, service_person_id: Optional[str] = None, machine_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = {}
        if service_person_id and service_person_id != "All":
            query["service_person_id"] = service_person_id
        if machine_id:
            query["machine_id"] = machine_id
        return self.find_all(query, sort=[("created_at", -1)])

    def get_by_id(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"id": invoice_id})

    def create_invoice(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        count = self.count() + 231
        inv_id = payload.get("id") or f"INV-{count:05d}"
        today_str = datetime.now().strftime("%Y-%m-%d")

        labour = float(payload.get("labour_cost", 2000.0))
        parts = float(payload.get("parts_cost", 4500.0))
        addn = float(payload.get("additional_cost", 500.0))
        total = labour + parts + addn

        doc = {
            "id": inv_id,
            "work_order_id": payload.get("work_order_id") or payload.get("service_request_id"),
            "machine_id": payload.get("machine_id"),
            "service_person_id": payload.get("service_person_id", "SP-01"),
            "service_person_name": payload.get("service_person_name", "Vikram Patel"),
            "date": payload.get("date", today_str),
            "problem_summary": payload.get("problem_summary", "Diagnostic & component service"),
            "action_taken": payload.get("action_taken", "Component replacement and calibration"),
            "labour_cost": labour,
            "parts_cost": parts,
            "additional_cost": addn,
            "total_cost": total,
            "downtime_hours": float(payload.get("downtime_hours", 2.5)),
            "parts_used": payload.get("parts_used", "Heavy Duty Motor Bearing / Drive Sensor Cable"),
            "remarks": payload.get("remarks", "Calibrated and verified under 100% test load."),
            "created_at": datetime.utcnow().isoformat()
        }
        return self.insert(doc)

    def get_total_cost(self) -> float:
        invoices = self.find_all()
        return sum(float(i.get("total_cost", 0.0)) for i in invoices)

maintenance_invoice_repo = MaintenanceInvoiceRepository()
