from datetime import datetime
from backend.extensions import db
from backend.models.maintenance import MaintenanceWorkOrder, MaintenanceStatus
from backend.models.machine import Machine, MachineState
from backend.models.audit_log import AuditLog
from backend.services.machine_service import machine_service
from backend.services.websocket_service import websocket_service

class MaintenanceService:
    @staticmethod
    def create_work_order(machine_id, disruption_id=None, fault_type="Mechanical Breakdown", priority="HIGH", estimated_hours=4.0):
        # Generate WO Number
        count = MaintenanceWorkOrder.query.count() + 1
        wo_number = f"WO-{count:05d}"

        work_order = MaintenanceWorkOrder(
            work_order_number=wo_number,
            machine_id=machine_id,
            disruption_id=disruption_id,
            fault_type=fault_type,
            priority=priority,
            status=MaintenanceStatus.OPEN.value,
            estimated_repair_hours=estimated_hours,
            created_at=datetime.utcnow()
        )
        db.session.add(work_order)
        db.session.commit()

        websocket_service.notify_maintenance_created(work_order.to_dict())
        return work_order

    @staticmethod
    def update_work_order_status(work_order_id, new_status, notes=None, assigned_to_id=None, user=None):
        wo = MaintenanceWorkOrder.query.get(work_order_id)
        if not wo:
            raise ValueError(f"Work order {work_order_id} not found")

        old_status = wo.status
        wo.status = new_status
        if notes:
            wo.notes = f"{wo.notes}\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {notes}" if wo.notes else notes
        if assigned_to_id:
            wo.assigned_to_id = assigned_to_id

        if new_status == MaintenanceStatus.IN_PROGRESS.value and not wo.started_at:
            wo.started_at = datetime.utcnow()
            # Transition machine to MAINTENANCE
            machine_service.update_machine_status(wo.machine_id, MachineState.MAINTENANCE.value, reason=f"Repair started on {wo.work_order_number}")

        elif new_status == MaintenanceStatus.REPAIRED.value:
            wo.repaired_at = datetime.utcnow()
            machine_service.update_machine_status(wo.machine_id, MachineState.REPAIRED.value, reason=f"Repair completed on {wo.work_order_number}")

        elif new_status == MaintenanceStatus.VERIFIED.value:
            wo.verified_at = datetime.utcnow()
            machine_service.update_machine_status(wo.machine_id, MachineState.VERIFIED.value, reason="Maintenance verified by Service Person")
            # Return to AVAILABLE
            machine_service.update_machine_status(wo.machine_id, MachineState.AVAILABLE.value, reason="Machine returned to production service")

        elif new_status == MaintenanceStatus.CLOSED.value:
            if not wo.verified_at:
                wo.verified_at = datetime.utcnow()
            machine_service.update_machine_status(wo.machine_id, MachineState.AVAILABLE.value, reason="Work order closed")

        db.session.commit()
        websocket_service.notify_maintenance_updated(wo.to_dict())

        # Audit log
        username = user.username if user else "SERVICE_PERSON"
        audit = AuditLog(
            user_id=user.id if user else None,
            username=username,
            action="MAINTENANCE_STATUS_UPDATED",
            entity_type="MAINTENANCE",
            entity_id=str(wo.id),
            details_json=f'{{"wo_number": "{wo.work_order_number}", "old_status": "{old_status}", "new_status": "{new_status}"}}'
        )
        db.session.add(audit)
        db.session.commit()

        return wo

maintenance_service = MaintenanceService()
