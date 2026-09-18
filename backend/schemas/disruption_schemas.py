"""
Disruption & Recovery Schemas
"""

from typing import Optional
from pydantic import BaseModel, Field

class DisruptionTriggerSchema(BaseModel):
    machine_id: str = Field(..., min_length=1, description="Machine ID e.g. CUT-02 or M04")
    order_id: Optional[str] = Field(default="ORD-1042", description="Target impacted order")
    failure_type: str = Field(default="MECHANICAL_FAILURE", description="Categorized failure reason")
    duration_hours: float = Field(default=6.0, gt=0, description="Expected downtime duration in hours")

class DisruptionApprovalSchema(BaseModel):
    option_id: str = Field(..., description="Recovery option: OPT-A, OPT-B, OPTION_A, or OPTION_B")
    notes: Optional[str] = Field(default="Approved by Manager")
