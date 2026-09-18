"""
Base MongoDB Repository
"""

import logging
from typing import Dict, Any, List, Optional
from pymongo.collection import Collection
from backend.database.mongo import get_collection

logger = logging.getLogger("repositories")

class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self) -> Collection:
        return get_collection(self.collection_name)

    def find_all(self, query: Dict[str, Any] = None, projection: Dict[str, int] = None, sort: List = None) -> List[Dict[str, Any]]:
        query = query or {}
        proj = projection if projection is not None else {"_id": 0}
        cursor = self.collection.find(query, proj)
        if sort:
            cursor = cursor.sort(sort)
        return list(cursor)

    def find_one(self, query: Dict[str, Any], projection: Dict[str, int] = None) -> Optional[Dict[str, Any]]:
        proj = projection if projection is not None else {"_id": 0}
        return self.collection.find_one(query, proj)

    def insert(self, document: Dict[str, Any]) -> Dict[str, Any]:
        doc = dict(document)
        self.collection.insert_one(doc)
        doc.pop("_id", None)
        return doc

    def update(self, query: Dict[str, Any], update_fields: Dict[str, Any]) -> bool:
        result = self.collection.update_one(query, {"$set": update_fields})
        return result.modified_count > 0 or result.matched_count > 0

    def delete(self, query: Dict[str, Any]) -> bool:
        result = self.collection.delete_one(query)
        return result.deleted_count > 0

    def count(self, query: Dict[str, Any] = None) -> int:
        return self.collection.count_documents(query or {})
