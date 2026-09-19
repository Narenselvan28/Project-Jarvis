"""
Domain Exception Definitions for ARIVON Platform
"""

class DomainError(Exception):
    """Base domain exception"""
    def __init__(self, message: str, code: str = "DOMAIN_ERROR", status_code: int = 400, details: dict = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self):
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details
        }

class ValidationError(DomainError):
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, code="VALIDATION_ERROR", status_code=400, details=details)

class AuthorizationError(DomainError):
    def __init__(self, message: str = "Unauthorized to perform this action", details: dict = None):
        super().__init__(message, code="AUTHORIZATION_ERROR", status_code=403, details=details)

class MachineUnavailableError(DomainError):
    def __init__(self, machine_id: str, status: str, details: dict = None):
        msg = f"Machine '{machine_id}' is currently unavailable (Status: {status})."
        super().__init__(msg, code="MACHINE_UNAVAILABLE", status_code=409, details=details)

class InvalidStateTransitionError(DomainError):
    def __init__(self, current_state: str, target_state: str, entity_type: str = "Entity", details: dict = None, message: str = None):
        self.current_state = str(current_state)
        self.target_state = str(target_state)
        self.requested_state = str(target_state)
        self.entity_type = entity_type
        default_msg = f"Illegal {entity_type} state transition from '{self.current_state}' to '{self.target_state}'."
        msg = message or default_msg
        all_details = details.copy() if isinstance(details, dict) else {}
        all_details.setdefault("current_state", self.current_state)
        all_details.setdefault("requested_state", self.target_state)
        all_details.setdefault("entity_type", self.entity_type)
        super().__init__(msg, code="INVALID_STATE_TRANSITION", status_code=409, details=all_details)

    def to_dict(self):
        d = super().to_dict()
        d["current_state"] = self.current_state
        d["requested_state"] = self.target_state
        d["entity_type"] = self.entity_type
        return d

class ScheduleInfeasibleError(DomainError):
    def __init__(self, message: str = "Unable to compute feasible production schedule under given constraints.", details: dict = None):
        super().__init__(message, code="SCHEDULE_INFEASIBLE", status_code=422, details=details)

class OptimizationTimeoutError(DomainError):
    def __init__(self, message: str = "CP-SAT solver timed out before finding an optimal solution.", details: dict = None):
        super().__init__(message, code="OPTIMIZATION_TIMEOUT", status_code=504, details=details)

class ModelUnavailableError(DomainError):
    def __init__(self, model_name: str, details: dict = None):
        msg = f"Predictive model '{model_name}' is not loaded or unavailable."
        super().__init__(msg, code="MODEL_UNAVAILABLE", status_code=503, details=details)

class DisruptionConflictError(DomainError):
    def __init__(self, machine_id: str, details: dict = None):
        msg = f"Machine '{machine_id}' already has an active disruption or maintenance order."
        super().__init__(msg, code="DISRUPTION_CONFLICT", status_code=409, details=details)

class MaintenanceStateError(DomainError):
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, code="MAINTENANCE_STATE_ERROR", status_code=400, details=details)

class ResourceNotFoundError(DomainError):
    def __init__(self, resource_type: str, resource_id: str):
        msg = f"{resource_type} '{resource_id}' not found."
        super().__init__(msg, code="RESOURCE_NOT_FOUND", status_code=404)
