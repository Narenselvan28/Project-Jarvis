"""
Machine State Machine Domain Logic & Transition Verification
"""

from enum import Enum
from typing import Dict, List, Set
from backend.domain.errors import InvalidStateTransitionError, AuthorizationError

class MachineState(str, Enum):
    AVAILABLE = "AVAILABLE"
    RUNNING = "RUNNING"
    IDLE = "IDLE"
    SETUP = "SETUP"
    BLOCKED = "BLOCKED"
    FAILED = "FAILED"
    MAINTENANCE = "MAINTENANCE"
    REPAIRED = "REPAIRED"
    VERIFIED = "VERIFIED"
    REASSIGNED = "REASSIGNED"

# Standard Industrial State Machine Transition Matrix
VALID_TRANSITIONS: Dict[str, Set[str]] = {
    "AVAILABLE": {"RUNNING", "SETUP", "IDLE", "MAINTENANCE", "FAILED"},
    "RUNNING": {"IDLE", "BLOCKED", "FAILED", "MAINTENANCE", "REASSIGNED"},
    "IDLE": {"RUNNING", "SETUP", "MAINTENANCE", "FAILED", "AVAILABLE"},
    "SETUP": {"RUNNING", "IDLE", "FAILED", "MAINTENANCE"},
    "BLOCKED": {"RUNNING", "REASSIGNED", "FAILED", "MAINTENANCE", "IDLE"},
    "FAILED": {"MAINTENANCE"},
    "MAINTENANCE": {"REPAIRED", "FAILED"},
    "REPAIRED": {"VERIFIED", "MAINTENANCE"},
    "VERIFIED": {"AVAILABLE", "IDLE", "RUNNING"},
    "REASSIGNED": {"RUNNING", "IDLE", "AVAILABLE"},
}

# Role-specific authorized target states
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "MANAGER": {s.value for s in MachineState},
    "SUPERVISOR": {"AVAILABLE", "RUNNING", "IDLE", "SETUP", "BLOCKED", "REASSIGNED"},
    "SERVICE PERSON": {"MAINTENANCE", "REPAIRED", "VERIFIED"},
    "SERVICE_PERSON": {"MAINTENANCE", "REPAIRED", "VERIFIED"},
    "SERVICE": {"MAINTENANCE", "REPAIRED", "VERIFIED"}
}

class MachineStateMachine:
    @staticmethod
    def is_valid_transition(current_state: str, target_state: str, role: str = "MANAGER") -> bool:
        """
        Validates whether transitioning from current_state to target_state is allowed.
        """
        curr = current_state.upper()
        target = target_state.upper()
        norm_role = role.upper().replace("_", " ")

        # 1. Check if states are valid
        valid_states = {s.value for s in MachineState}
        if curr not in valid_states or target not in valid_states:
            return False

        # 2. Check role authorization
        allowed_for_role = ROLE_PERMISSIONS.get(norm_role, set())
        if target not in allowed_for_role and norm_role != "MANAGER":
            return False

        # 3. Manager can perform administrative transitions, but illegal transitions should be rejected
        allowed_targets = VALID_TRANSITIONS.get(curr, set())
        return target in allowed_targets

    @staticmethod
    def validate_and_transition(current_state: str, target_state: str, role: str = "MANAGER") -> str:
        """
        Validates transition and returns target_state, or raises DomainError.
        """
        curr = current_state.upper()
        target = target_state.upper()
        norm_role = role.upper().replace("_", " ")

        valid_states = {s.value for s in MachineState}
        if target not in valid_states:
            raise InvalidStateTransitionError(curr, target, details={"reason": f"Unknown state '{target}'"})

        allowed_for_role = ROLE_PERMISSIONS.get(norm_role, set())
        if norm_role != "MANAGER" and target not in allowed_for_role:
            raise AuthorizationError(
                f"Role '{role}' is not authorized to transition machine to '{target}'.",
                details={"allowed_states": list(allowed_for_role)}
            )

        allowed_targets = VALID_TRANSITIONS.get(curr, set())
        if target not in allowed_targets and norm_role != "MANAGER":
            raise InvalidStateTransitionError(
                curr, target,
                details={
                    "current_state": curr,
                    "target_state": target,
                    "valid_transitions_from_current": list(allowed_targets)
                }
            )

        return target
