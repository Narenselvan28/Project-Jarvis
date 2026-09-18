from backend.schemas.common import ErrorDetail, ErrorResponse, SuccessResponse, make_success, make_error
from backend.schemas.auth_schemas import LoginRequestSchema
from backend.schemas.order_schemas import OrderCreateSchema, PlanGenerationRequestSchema, PlanApprovalSchema, PlanRejectSchema
from backend.schemas.disruption_schemas import DisruptionTriggerSchema, DisruptionApprovalSchema
from backend.schemas.machine_schemas import MachineStatusUpdateSchema, MachineTelemetryUpdateSchema
from backend.schemas.maintenance_schemas import WorkOrderCreateSchema, WorkOrderUpdateSchema
from backend.schemas.simulation_schemas import WhatIfSimulationSchema

__all__ = [
    "ErrorDetail", "ErrorResponse", "SuccessResponse", "make_success", "make_error",
    "LoginRequestSchema",
    "OrderCreateSchema", "PlanGenerationRequestSchema", "PlanApprovalSchema", "PlanRejectSchema",
    "DisruptionTriggerSchema", "DisruptionApprovalSchema",
    "MachineStatusUpdateSchema", "MachineTelemetryUpdateSchema",
    "WorkOrderCreateSchema", "WorkOrderUpdateSchema",
    "WhatIfSimulationSchema"
]
