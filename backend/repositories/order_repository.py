"""
Order Repository for MongoDB
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.repositories.base_repository import BaseRepository
from backend.database.mongo import get_collection

class OrderRepository(BaseRepository):
    def __init__(self):
        super().__init__("orders")

    def get_all_orders(self) -> List[Dict[str, Any]]:
        orders = self.find_all(sort=[("created_at", -1)])
        op_coll = get_collection("order_operations")
        for o in orders:
            o["operations"] = list(op_coll.find({"order_id": o["id"]}, {"_id": 0}).sort("sequence", 1))
        return orders

    def get_by_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        order = self.find_one({"id": order_id})
        if order:
            op_coll = get_collection("order_operations")
            order["operations"] = list(op_coll.find({"order_id": order_id}, {"_id": 0}).sort("sequence", 1))
        return order

    def create_order(self, order_data: Dict[str, Any], operations: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        doc = dict(order_data)
        doc["created_at"] = doc.get("created_at") or datetime.utcnow().isoformat()
        doc["updated_at"] = datetime.utcnow().isoformat()
        saved = self.insert(doc)

        if operations:
            op_coll = get_collection("order_operations")
            for op in operations:
                op_doc = dict(op)
                op_doc["order_id"] = doc["id"]
                op_doc["created_at"] = datetime.utcnow().isoformat()
                op_coll.insert_one(op_doc)

        return self.get_by_id(doc["id"])

    def update_status(self, order_id: str, status: str) -> bool:
        return self.update(
            {"id": order_id},
            {
                "status": status,
                "updated_at": datetime.utcnow().isoformat()
            }
        )

    def update_operation_status(self, order_id: str, sequence: int, status: str, reassigned_machine_id: str = None) -> bool:
        op_coll = get_collection("order_operations")
        update_fields = {"status": status, "updated_at": datetime.utcnow().isoformat()}
        if reassigned_machine_id:
            update_fields["assigned_machine_id"] = reassigned_machine_id
            update_fields["is_reassigned"] = True
        res = op_coll.update_one({"order_id": order_id, "sequence": sequence}, {"$set": update_fields})
        return res.matched_count > 0

    def find_affected_by_machine(self, machine_id: str) -> List[Dict[str, Any]]:
        op_coll = get_collection("order_operations")
        affected_ops = list(op_coll.find({
            "assigned_machine_id": machine_id,
            "status": {"$ne": "COMPLETED"}
        }, {"_id": 0}))
        order_ids = list(set(op["order_id"] for op in affected_ops))
        return [self.get_by_id(oid) for oid in order_ids if self.get_by_id(oid)]

order_repo = OrderRepository()
