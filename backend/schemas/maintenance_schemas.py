"""
Maintenance Work Order Schemas
"""

from typing import Optional
from pydantic import BaseModel, Field

class WorkOrderCreateSchema(BaseModel):
    machine_id: str = Field(..., min_length=1)
    fault_type: str = Field(default="Mechanical Failure")
    priority: str = Field(default="HIGH")
    estimated_hours: float = Field(default=4.0, gt=0)
    disruption_id: Optional[str] = None
    assigned_to: Optional[str] = None

class WorkOrderUpdateSchema(BaseModel):
    status: str = Field(..., description="Target status: ASSIGNED, IN_PROGRESS, REPAIRED, VERIFIED, CLOSED")
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    actual_hours: Optional[float] = None
