"""
Audit Service for ARIVON Platform
"""

from typing import Optional, Any, Dict
from backend.repositories.audit_repository import audit_repo

class AuditService:
    @staticmethod
    def log(
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
        return audit_repo.record_event(
            action=action,
            actor=actor,
            role=role,
            entity=entity,
            entity_id=entity_id,
            before=before,
            after=after,
            metadata=metadata,
            request_id=request_id
        )

audit_service = AuditService()
