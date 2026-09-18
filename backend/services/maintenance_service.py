"""
Maintenance Work Order Service (Pure MongoDB)
"""

from typing import Dict, Any, Optional, List
from backend.repositories.maintenance_repository import maintenance_repo
from backend.services.machine_service import machine_service
from backend.services.websocket_service import websocket_service
from backend.domain.maintenance_workflow import MaintenanceWorkflow
from backend.domain.errors import ResourceNotFoundError

class MaintenanceService:
    @staticmethod
    def create_work_order(
        machine_id: str,
        disruption_id: Optional[str] = None,
        fault_type: str = "Mechanical Breakdown",
        priority: str = "HIGH",
        estimated_hours: float = 4.0,
        assigned_to: Optional[str] = None
    ) -> Dict[str, Any]:
        wo = maintenance_repo.create_work_order(
            machine_id=machine_id,
            fault_type=fault_type,
            priority=priority,
            estimated_hours=estimated_hours,
            disruption_id=disruption_id,
            assigned_to=assigned_to
        )
        websocket_service.notify_maintenance_created(wo)
        return wo

    @staticmethod
    def update_work_order_status(
        work_order_id: str,
        new_status: str,
        notes: Optional[str] = None,
        assigned_to: Optional[str] = None,
        actual_hours: Optional[float] = None,
        user: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        wo = maintenance_repo.get_by_id(work_order_id)
        if not wo:
            raise ResourceNotFoundError("Maintenance Work Order", work_order_id)

        user_role = (user.get("role") if user else "SERVICE PERSON") or "SERVICE PERSON"
        current_status = wo.get("status", "OPEN")
        validated_status = MaintenanceWorkflow.validate_transition(current_status, new_status, role=user_role)

        existing_notes = wo.get("notes", "")
        updated_notes = f"{existing_notes}\n{notes}".strip() if notes else existing_notes

        maintenance_repo.update_workflow(
            wo_id=work_order_id,
            new_status=validated_status,
            notes=updated_notes,
            assigned_to=assigned_to,
            actual_hours=actual_hours
        )

        machine_id = wo.get("machine_id")

        # Synchronize Machine state transitions based on maintenance steps
        if validated_status == "IN_PROGRESS":
            try:
                machine_service.update_machine_status(
                    machine_id=machine_id,
                    new_status="MAINTENANCE",
                    user_role=user_role,
                    reason=f"Repair started on {work_order_id}"
                )
            except Exception:
                pass
        elif validated_status == "REPAIRED":
            try:
                machine_service.update_machine_status(
                    machine_id=machine_id,
                    new_status="REPAIRED",
                    user_role=user_role,
                    reason=f"Repair completed on {work_order_id}"
                )
            except Exception:
                pass
        elif validated_status == "VERIFIED":
            try:
                # First transition to VERIFIED, then back to AVAILABLE
                machine_service.update_machine_status(
                    machine_id=machine_id,
                    new_status="VERIFIED",
                    user_role=user_role,
                    reason=f"Maintenance verified on {work_order_id}"
                )
                machine_service.update_machine_status(
                    machine_id=machine_id,
                    new_status="AVAILABLE",
                    user_role="MANAGER",
                    reason="Machine returned to operational pool after maintenance signoff"
                )
            except Exception:
                pass

        updated_wo = maintenance_repo.get_by_id(work_order_id)
        websocket_service.notify_maintenance_updated(updated_wo)
        return updated_wo

maintenance_service = MaintenanceService()
