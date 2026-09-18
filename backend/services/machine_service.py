from datetime import datetime
from backend.extensions import db
from backend.models.machine import Machine, MachineState, MachineStatusHistory
from backend.models.audit_log import AuditLog
from backend.services.websocket_service import websocket_service

ALLOWED_TRANSITIONS = {
    MachineState.AVAILABLE.value: [MachineState.SETUP.value, MachineState.RUNNING.value, MachineState.IDLE.value, MachineState.FAILED.value],
    MachineState.SETUP.value: [MachineState.RUNNING.value, MachineState.IDLE.value, MachineState.FAILED.value],
    MachineState.RUNNING.value: [MachineState.IDLE.value, MachineState.AVAILABLE.value, MachineState.FAILED.value],
    MachineState.IDLE.value: [MachineState.SETUP.value, MachineState.RUNNING.value, MachineState.AVAILABLE.value, MachineState.FAILED.value],
    MachineState.FAILED.value: [MachineState.MAINTENANCE.value, MachineState.REPAIRED.value],
    MachineState.MAINTENANCE.value: [MachineState.REPAIRED.value, MachineState.FAILED.value],
    MachineState.REPAIRED.value: [MachineState.VERIFIED.value, MachineState.MAINTENANCE.value],
    MachineState.VERIFIED.value: [MachineState.AVAILABLE.value, MachineState.RUNNING.value],
    MachineState.REASSIGNED.value: [MachineState.AVAILABLE.value, MachineState.RUNNING.value]
}

class MachineService:
    @staticmethod
    def update_machine_status(machine_id, new_status, reason=None, user_id=None, username=None):
        machine = Machine.query.get(machine_id)
        if not machine:
            raise ValueError(f"Machine {machine_id} not found")

        old_status = machine.status

        # Validate transition if not an emergency override
        valid_next = ALLOWED_TRANSITIONS.get(old_status, [])
        if new_status not in valid_next and new_status != MachineState.FAILED.value:
            # Allow admin overrides with logging
            print(f"[MachineService] Non-standard transition {old_status} -> {new_status} allowed with override")

        machine.status = new_status
        machine.updated_at = datetime.utcnow()

        # Record status history
        history = MachineStatusHistory(
            machine_id=machine.id,
            old_status=old_status,
            new_status=new_status,
            reason=reason or f"Status changed to {new_status}"
        )
        db.session.add(history)

        # Record audit log
        audit = AuditLog(
            user_id=user_id,
            username=username or "SYSTEM",
            action="MACHINE_STATUS_CHANGED",
            entity_type="MACHINE",
            entity_id=machine_id,
            details_json=f'{{"old_status": "{old_status}", "new_status": "{new_status}", "reason": "{reason or ""}"}}'
        )
        db.session.add(audit)
        db.session.commit()

        # Emit websocket
        websocket_service.notify_machine_status_changed(machine.to_dict())
        return machine

machine_service = MachineService()
