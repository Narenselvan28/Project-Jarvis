"""
Contract & SLA Repository
Manages customer contracts, delivery deadlines, contract values, and SLA delay penalties.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.repositories.base_repository import BaseRepository

logger = logging.getLogger("repositories.contract")

class ContractRepository(BaseRepository):
    def __init__(self):
        super().__init__("contracts")

    def get_all(self, status: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        query = {}
        if status and status != "All":
            query["status"] = status
        contracts = self.find_all(query, sort=[("delivery_deadline", 1)])
        if limit:
            return contracts[:limit]
        return contracts

    def get_by_id(self, contract_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"id": contract_id})

    def get_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"order_id": order_id})

    def upsert(self, contract_doc: Dict[str, Any]) -> Dict[str, Any]:
        c_id = contract_doc.get("id")
        existing = self.get_by_id(c_id) if c_id else None
        if existing:
            self.update({"id": c_id}, contract_doc)
            return self.get_by_id(c_id)
        return self.insert(contract_doc)

    def update_status(self, contract_id: str, status: str) -> bool:
        return self.update({"id": contract_id}, {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        })

contract_repo = ContractRepository()
