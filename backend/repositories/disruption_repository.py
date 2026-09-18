"""
Disruption Repository for MongoDB
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.repositories.base_repository import BaseRepository

class DisruptionRepository(BaseRepository):
    def __init__(self):
        super().__init__("disruptions")

    def get_all(self) -> List[Dict[str, Any]]:
        return self.find_all(sort=[("started_at", -1)])

    def get_by_id(self, disruption_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"id": disruption_id})

    def get_active(self) -> Optional[Dict[str, Any]]:
        return self.find_one({"status": "ACTIVE"}, sort=[("started_at", -1)])

    def create_disruption(
        self,
        machine_id: str,
        failure_type: str,
        duration_hours: float,
        affected_orders_count: int = 0,
        affected_order_ids: List[str] = None
    ) -> Dict[str, Any]:
        disr_id = f"DISR-{str(uuid.uuid4())[:6].upper()}"
        doc = {
            "id": disr_id,
            "machine_id": machine_id,
            "failure_type": failure_type,
            "duration_hours": float(duration_hours),
            "affected_orders_count": affected_orders_count,
            "affected_order_ids": affected_order_ids or [],
            "status": "ACTIVE",
            "started_at": datetime.utcnow().isoformat(),
            "option_a": None,
            "option_b": None,
            "approved_option": None,
            "resolved_at": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        return self.insert(doc)

    def attach_recovery_options(self, disruption_id: str, option_a: Dict[str, Any], option_b: Dict[str, Any]) -> bool:
        return self.update(
            {"id": disruption_id},
            {
                "option_a": option_a,
                "option_b": option_b,
                "updated_at": datetime.utcnow().isoformat()
            }
        )

    def resolve_disruption(self, disruption_id: str, approved_option_id: Optional[str] = None, status: str = "RESOLVED") -> bool:
        return self.update(
            {"id": disruption_id},
            {
                "status": status,
                "approved_option": approved_option_id,
                "resolved_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
        )

disruption_repo = DisruptionRepository()
