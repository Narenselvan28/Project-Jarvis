"""
Maintenance Work Order Workflow & Lifecycle
"""

from enum import Enum
from typing import Dict, Set
from backend.domain.errors import MaintenanceStateError, AuthorizationError

class MaintenanceStatus(str, Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    REPAIRED = "REPAIRED"
    VERIFIED = "VERIFIED"
    CLOSED = "CLOSED"

WORK_ORDER_TRANSITIONS: Dict[str, Set[str]] = {
    "OPEN": {"ASSIGNED", "IN_PROGRESS", "CLOSED"},
    "ASSIGNED": {"IN_PROGRESS", "CLOSED"},
    "IN_PROGRESS": {"REPAIRED", "OPEN"},
    "REPAIRED": {"VERIFIED", "IN_PROGRESS"},
    "VERIFIED": {"CLOSED"},
    "CLOSED": set()
}

class MaintenanceWorkflow:
    @staticmethod
    def validate_transition(current_status: str, target_status: str, role: str = "SERVICE PERSON") -> str:
        curr = current_status.upper()
        target = target_status.upper()
        norm_role = role.upper().replace("_", " ")

        valid_statuses = {s.value for s in MaintenanceStatus}
        if target not in valid_statuses:
            raise MaintenanceStateError(f"Invalid maintenance status '{target}'.")

        allowed_targets = WORK_ORDER_TRANSITIONS.get(curr, set())
        if target not in allowed_targets and norm_role != "MANAGER":
            raise MaintenanceStateError(
                f"Cannot transition maintenance work order from '{curr}' to '{target}'.",
                details={"allowed_transitions": list(allowed_targets)}
            )

        return target
