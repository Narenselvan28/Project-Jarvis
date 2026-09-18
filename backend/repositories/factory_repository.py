"""
Factory Configuration Repository for MongoDB
"""

from typing import List, Dict, Any, Optional
from backend.repositories.base_repository import BaseRepository
from backend.database.mongo import get_collection

class FactoryRepository:
    def get_lanes(self) -> List[Dict[str, Any]]:
        return list(get_collection("lanes").find({}, {"_id": 0}).sort("sequence", 1))

    def get_processes(self) -> List[Dict[str, Any]]:
        return list(get_collection("processes").find({}, {"_id": 0}).sort("sequence_index", 1))

    def get_workers(self, available_only: bool = False) -> List[Dict[str, Any]]:
        query = {"is_available": True} if available_only else {}
        return list(get_collection("workers").find(query, {"_id": 0}))

    def get_materials(self) -> List[Dict[str, Any]]:
        return list(get_collection("materials").find({}, {"_id": 0}))

    def get_material_inventory(self) -> List[Dict[str, Any]]:
        return list(get_collection("material_inventory").find({}, {"_id": 0}))

    def get_products(self) -> List[Dict[str, Any]]:
        return list(get_collection("products").find({}, {"_id": 0}))

factory_repo = FactoryRepository()
