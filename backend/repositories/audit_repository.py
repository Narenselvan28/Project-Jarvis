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

    def create_log(
        self,
        user: Any,
        action: str,
        entity_type: str,
        entity_id: str,
        reason: str = "",
        before: Optional[Any] = None,
        after: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        meta = metadata.copy() if metadata else {}
        if reason:
            meta["reason"] = reason
        actor = user.get("username", "system") if isinstance(user, dict) else str(user)
        role = user.get("role", "SYSTEM") if isinstance(user, dict) else "SYSTEM"
        return self.record_event(
            action=action,
            actor=actor,
            role=role,
            entity=entity_type,
            entity_id=entity_id,
            before=before,
            after=after,
            metadata=meta
        )

    def get_recent_logs(self, limit: int = 50, entity: Optional[str] = None, action: Optional[str] = None) -> List[Dict[str, Any]]:
        query = {}
        if entity:
            query["entity"] = entity
        if action:
            query["action"] = action.upper()
        return self.find_all(query, sort=[("timestamp", -1)])[:limit]

    def get_recent(self, limit: int = 50, entity: Optional[str] = None, action: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.get_recent_logs(limit=limit, entity=entity, action=action)

audit_repo = AuditRepository()

