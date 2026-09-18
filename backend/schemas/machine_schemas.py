"""
Machine Schemas
"""

from typing import Optional
from pydantic import BaseModel, Field

class MachineStatusUpdateSchema(BaseModel):
    status: str = Field(..., min_length=2, description="Target machine status")
    reason: Optional[str] = Field(default="Manual status update")

class MachineTelemetryUpdateSchema(BaseModel):
    temperature: Optional[float] = None
    vibration: Optional[float] = None
    runtime_hours: Optional[float] = None
    utilization: Optional[float] = None
    cycle_count: Optional[int] = None
