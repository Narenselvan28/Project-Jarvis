"""
Unified State Machine Governance Service for ReFlow Platform
Enforces strict transitions and role authorizations across all entity lifecycles.
"""

from enum import Enum
from typing import Dict, Set, Optional
from backend.domain.errors import InvalidStateTransitionError, AuthorizationError

class ProductionPlanState(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    PLANNING = "PLANNING"
    PENDING_SUPERVISOR_REVIEW = "PENDING_SUPERVISOR_REVIEW"
    PENDING_SUPERVISOR_APPROVAL = "PENDING_SUPERVISOR_APPROVAL"
    SUPERVISOR_EDITED = "SUPERVISOR_EDITED"
    SUPERVISOR_APPROVED = "SUPERVISOR_APPROVED"
    ACTIVE = "ACTIVE"
    IN_PRODUCTION = "IN_PRODUCTION"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"

class RecoveryState(str, Enum):
    DETECTED = "DETECTED"
    ANALYZING = "ANALYZING"
    GENERATING_OPTIONS = "GENERATING_OPTIONS"
    PENDING_MANAGER_APPROVAL = "PENDING_MANAGER_APPROVAL"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    FAILED = "FAILED"

class MachineState(str, Enum):
    AVAILABLE = "AVAILABLE"
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    SETUP = "SETUP"
    BLOCKED = "BLOCKED"
    FAILED = "FAILED"
    MAINTENANCE = "MAINTENANCE"
    REPAIRED = "REPAIRED"
    VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED"
    VERIFIED = "VERIFIED"
    REASSIGNED = "REASSIGNED"

class MaintenanceState(str, Enum):
    REQUESTED = "REQUESTED"
    MANAGER_PENDING = "MANAGER_PENDING"
    APPROVED = "APPROVED"
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    REPAIR_COMPLETED = "REPAIR_COMPLETED"
    VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED"
    VERIFIED = "VERIFIED"
    CLOSED = "CLOSED"
    OPEN = "OPEN"  # Backward compatibility for existing MongoDB seeds

PLAN_TRANSITIONS: Dict[str, Set[str]] = {
    "DRAFT": {"SUBMITTED", "PLANNING", "CANCELLED"},
    "SUBMITTED": {"PLANNING", "CANCELLED"},
    "PLANNING": {"PENDING_SUPERVISOR_REVIEW", "FAILED", "CANCELLED"},
    "PENDING_SUPERVISOR_REVIEW": {"SUPERVISOR_EDITED", "SUPERVISOR_APPROVED", "REJECTED", "CANCELLED"},
    "PENDING_SUPERVISOR_APPROVAL": {"SUPERVISOR_EDITED", "SUPERVISOR_APPROVED", "REJECTED", "CANCELLED"},
    "SUPERVISOR_EDITED": {"PENDING_SUPERVISOR_REVIEW", "SUPERVISOR_APPROVED", "REJECTED", "CANCELLED"},
    "SUPERVISOR_APPROVED": {"ACTIVE", "IN_PRODUCTION", "CANCELLED"},
    "ACTIVE": {"IN_PRODUCTION", "COMPLETED", "CANCELLED"},
    "IN_PRODUCTION": {"COMPLETED", "CANCELLED"},
    "COMPLETED": set(),
    "REJECTED": set(),
    "CANCELLED": set()
}

RECOVERY_TRANSITIONS: Dict[str, Set[str]] = {
    "DETECTED": {"ANALYZING", "FAILED"},
    "ANALYZING": {"GENERATING_OPTIONS", "FAILED"},
    "GENERATING_OPTIONS": {"PENDING_MANAGER_APPROVAL", "FAILED"},
    "PENDING_MANAGER_APPROVAL": {"APPROVED", "REJECTED", "GENERATING_OPTIONS"},
    "APPROVED": {"ACTIVE"},
    "ACTIVE": {"COMPLETED"},
    "REJECTED": {"GENERATING_OPTIONS"},
    "FAILED": {"GENERATING_OPTIONS"}
}

MACHINE_TRANSITIONS: Dict[str, Set[str]] = {
    "AVAILABLE": {"RUNNING", "SETUP", "IDLE", "MAINTENANCE", "FAILED"},
    "RUNNING": {"IDLE", "BLOCKED", "FAILED", "MAINTENANCE", "REASSIGNED"},
    "IDLE": {"RUNNING", "SETUP", "MAINTENANCE", "FAILED", "AVAILABLE"},
    "SETUP": {"RUNNING", "IDLE", "FAILED", "MAINTENANCE"},
    "BLOCKED": {"RUNNING", "REASSIGNED", "FAILED", "MAINTENANCE", "IDLE"},
    "FAILED": {"MAINTENANCE"},
    "MAINTENANCE": {"REPAIRED", "REPAIR_COMPLETED", "FAILED"},
    "REPAIRED": {"VERIFICATION_REQUIRED", "VERIFIED", "MAINTENANCE"},
    "REPAIR_COMPLETED": {"VERIFICATION_REQUIRED", "VERIFIED", "MAINTENANCE"},
    "VERIFICATION_REQUIRED": {"VERIFIED", "MAINTENANCE", "AVAILABLE"},
    "VERIFIED": {"AVAILABLE", "IDLE", "RUNNING"},
    "REASSIGNED": {"RUNNING", "IDLE", "AVAILABLE"},
}

MAINTENANCE_TRANSITIONS: Dict[str, Set[str]] = {
    "OPEN": {"ASSIGNED", "IN_PROGRESS", "CLOSED"},
    "REQUESTED": {"MANAGER_PENDING", "APPROVED", "CLOSED"},
    "MANAGER_PENDING": {"APPROVED", "CLOSED"},
    "APPROVED": {"ASSIGNED", "ACCEPTED", "IN_PROGRESS", "CLOSED"},
    "ASSIGNED": {"ACCEPTED", "IN_PROGRESS", "CLOSED"},
    "ACCEPTED": {"IN_PROGRESS", "CLOSED"},
    "IN_PROGRESS": {"REPAIR_COMPLETED", "REPAIRED", "OPEN"},
    "REPAIR_COMPLETED": {"VERIFICATION_REQUIRED", "VERIFIED", "IN_PROGRESS"},
    "REPAIRED": {"VERIFICATION_REQUIRED", "VERIFIED", "IN_PROGRESS"},
    "VERIFICATION_REQUIRED": {"VERIFIED", "IN_PROGRESS"},
    "VERIFIED": {"CLOSED"},
    "CLOSED": set()
}

ROLE_AUTHORIZATIONS = {
    "PLAN": {
        "MANAGER": {s.value for s in ProductionPlanState},
        "ADMIN": {s.value for s in ProductionPlanState},
        "SUPERVISOR": {"SUPERVISOR_EDITED", "SUPERVISOR_APPROVED", "REJECTED", "ACTIVE"}
    },
    "RECOVERY": {
        "MANAGER": {s.value for s in RecoveryState},
        "ADMIN": {s.value for s in RecoveryState},
        "SUPERVISOR": {"ANALYZING"}
    },
    "MACHINE": {
        "MANAGER": {s.value for s in MachineState},
        "ADMIN": {s.value for s in MachineState},
        "SUPERVISOR": {"AVAILABLE", "RUNNING", "IDLE", "SETUP", "BLOCKED", "REASSIGNED"},
        "SERVICE_PERSON": {"MAINTENANCE", "REPAIRED", "REPAIR_COMPLETED", "VERIFICATION_REQUIRED", "VERIFIED"}
    },
    "MAINTENANCE": {
        "MANAGER": {s.value for s in MaintenanceState},
        "ADMIN": {s.value for s in MaintenanceState},
        "SUPERVISOR": {"REQUESTED", "ASSIGNED"},
        "SERVICE_PERSON": {"ACCEPTED", "IN_PROGRESS", "REPAIR_COMPLETED", "REPAIRED", "VERIFICATION_REQUIRED", "VERIFIED"}
    }
}

class StateTransitionService:
    @staticmethod
    def validate_transition(
        entity_type: str,
        current_state: str,
        target_state: str,
        role: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> bool:
        """
        Validates entity state transition against transition graphs and role permissions.
        Raises InvalidStateTransitionError (HTTP 409) if transition is invalid.
        Raises AuthorizationError (HTTP 403) if user lacks role authority.
        """
        curr = str(current_state).upper().strip()
        target = str(target_state).upper().strip()
        active_role = user_role if user_role is not None else (role if role is not None else "MANAGER")
        norm_role = str(active_role).upper().replace(" ", "_")

        entity_type_norm = entity_type.upper().replace("_", "")

        if entity_type_norm in ["PLAN", "PRODUCTIONPLAN", "ORDERPLAN", "PRODUCTIONPLANSTATE"]:
            matrix = PLAN_TRANSITIONS
            valid_states = {s.value for s in ProductionPlanState}
            allowed_roles = ROLE_AUTHORIZATIONS["PLAN"]
        elif entity_type_norm in ["RECOVERY", "DISRUPTION", "RECOVERYSTATE"]:
            matrix = RECOVERY_TRANSITIONS
            valid_states = {s.value for s in RecoveryState}
            allowed_roles = ROLE_AUTHORIZATIONS["RECOVERY"]
        elif entity_type_norm in ["MACHINE", "MACHINESTATE"]:
            matrix = MACHINE_TRANSITIONS
            valid_states = {s.value for s in MachineState}
            allowed_roles = ROLE_AUTHORIZATIONS["MACHINE"]
        elif entity_type_norm in ["MAINTENANCE", "WORKORDER", "MAINTENANCESTATE"]:
            matrix = MAINTENANCE_TRANSITIONS
            valid_states = {s.value for s in MaintenanceState}
            allowed_roles = ROLE_AUTHORIZATIONS["MAINTENANCE"]
        else:
            raise InvalidStateTransitionError(curr, target, entity_type, f"Unknown entity type '{entity_type}'.")

        # 1. State must exist in domain
        if target not in valid_states:
            raise InvalidStateTransitionError(
                curr, target, entity_type,
                f"Target state '{target}' is not a valid state for {entity_type}."
            )

        # 2. Idempotent check (if already in target state)
        if curr == target:
            return True

        # 3. Graph transition validation
        allowed_targets = matrix.get(curr, set())
        if target not in allowed_targets:
            raise InvalidStateTransitionError(
                curr, target, entity_type,
                f"Cannot transition {entity_type} from '{curr}' to '{target}'. Allowed target states: {sorted(list(allowed_targets)) if allowed_targets else 'None (Terminal state)'}"
            )

        # 4. Role authorization check
        role_allowed = allowed_roles.get(norm_role, set())
        if norm_role not in ["MANAGER", "ADMIN"] and target not in role_allowed:
            raise AuthorizationError(
                f"User with role '{norm_role}' is not authorized to transition {entity_type} to '{target}'."
            )

        return True
