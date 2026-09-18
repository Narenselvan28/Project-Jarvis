"""
Machine Domain Service (Pure MongoDB & State Machine)
"""

from typing import Dict, Any, Tuple
from backend.repositories.machine_repository import machine_repo
from backend.repositories.audit_repository import audit_repo
from backend.domain.machine_state import MachineStateMachine
from backend.domain.errors import InvalidStateTransitionError, MachineUnavailableError, ResourceNotFoundError
from backend.services.websocket_service import websocket_service

class MachineService:
    @staticmethod
    def update_machine_status(
        machine_id: str,
        new_status: str,
        user_role: str = "MANAGER",
        reason: str = "Manual status update",
        user_id: str = "SYSTEM",
        username: str = "System"
    ) -> Tuple[bool, Dict[str, Any]]:
        machine = machine_repo.get_by_id(machine_id)
        if not machine:
            raise ResourceNotFoundError("Machine", machine_id)

        old_status = machine.get("status", "AVAILABLE")
        validated_target = MachineStateMachine.validate_and_transition(old_status, new_status, role=user_role)

        # Update in MongoDB
        machine_repo.update_status(machine_id, validated_target)
        updated = machine_repo.get_by_id(machine_id)

        # Audit event
        audit_repo.record_event(
            action="MACHINE_STATUS_CHANGED",
            actor=username,
            role=user_role,
            entity="MACHINE",
            entity_id=machine_id,
            before={"status": old_status},
            after={"status": validated_target},
            metadata={"reason": reason}
        )

        # Emit WebSocket
        websocket_service.notify_machine_status_changed(updated)
        return True, updated

machine_service = MachineService()
