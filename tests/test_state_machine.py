import pytest
from backend.domain.machine_state import MachineStateMachine, MachineState
from backend.domain.maintenance_workflow import MaintenanceWorkflow, MaintenanceStatus
from backend.domain.errors import InvalidStateTransitionError, AuthorizationError, MaintenanceStateError

def test_machine_valid_transitions():
    assert MachineStateMachine.is_valid_transition("AVAILABLE", "RUNNING", "MANAGER") is True
    assert MachineStateMachine.is_valid_transition("RUNNING", "FAILED", "MANAGER") is True
    assert MachineStateMachine.is_valid_transition("FAILED", "MAINTENANCE", "MANAGER") is True
    assert MachineStateMachine.is_valid_transition("MAINTENANCE", "REPAIRED", "SERVICE_PERSON") is True
    assert MachineStateMachine.is_valid_transition("REPAIRED", "VERIFIED", "SERVICE_PERSON") is True
    assert MachineStateMachine.is_valid_transition("VERIFIED", "AVAILABLE", "MANAGER") is True

def test_machine_illegal_transition_rejected():
    # Direct transition from FAILED to AVAILABLE without repair/verification is illegal
    assert MachineStateMachine.is_valid_transition("FAILED", "AVAILABLE", "SUPERVISOR") is False
    with pytest.raises(InvalidStateTransitionError):
        MachineStateMachine.validate_and_transition("FAILED", "AVAILABLE", role="SUPERVISOR")

def test_role_transition_restrictions():
    # Service Person cannot put a machine into RUNNING
    with pytest.raises(AuthorizationError):
        MachineStateMachine.validate_and_transition("AVAILABLE", "RUNNING", role="SERVICE_PERSON")

def test_maintenance_workflow_lifecycle():
    assert MaintenanceWorkflow.validate_transition("OPEN", "IN_PROGRESS", "SERVICE PERSON") == "IN_PROGRESS"
    assert MaintenanceWorkflow.validate_transition("IN_PROGRESS", "REPAIRED", "SERVICE PERSON") == "REPAIRED"
    assert MaintenanceWorkflow.validate_transition("REPAIRED", "VERIFIED", "SERVICE PERSON") == "VERIFIED"
    assert MaintenanceWorkflow.validate_transition("VERIFIED", "CLOSED", "SERVICE PERSON") == "CLOSED"

    # Illegal jump: OPEN directly to VERIFIED
    with pytest.raises(MaintenanceStateError):
        MaintenanceWorkflow.validate_transition("OPEN", "VERIFIED", "SERVICE PERSON")
