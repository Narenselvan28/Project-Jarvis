"""
Audit Log Repository for MongoDB
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.repositories.base_repository import BaseRepository

class AuditRepository(BaseRepository):
    def __init__(self):
        super().__init__("audit_logs")

    def record_event(
        self,
        action: str,
        actor: str,
        role: str,
        entity: str,
        entity_id: str,
        before: Optional[Any] = None,
        after: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        doc = {
            "id": f"AUD-{str(uuid.uuid4())[:8].upper()}",
            "action": action.upper(),
            "actor": actor,
            "role": role.upper(),
            "entity": entity,
            "entity_id": entity_id,
            "before": before,
            "after": after,
            "metadata": metadata or {},
            "request_id": request_id or str(uuid.uuid4())[:8],
            "timestamp": datetime.utcnow().isoformat()
        }
        return self.insert(doc)

    def get_recent_logs(self, limit: int = 50, entity: Optional[str] = None, action: Optional[str] = None) -> List[Dict[str, Any]]:
        query = {}
        if entity:
            query["entity"] = entity
        if action:
            query["action"] = action.upper()
        return self.find_all(query, sort=[("timestamp", -1)])[:limit]

audit_repo = AuditRepository()
