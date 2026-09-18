"""
What-If Simulation Schemas
"""

from pydantic import BaseModel, Field

class WhatIfSimulationSchema(BaseModel):
    machine_id: str = Field(default="CUT-02", description="Target machine for hypothetical failure")
    failure_type: str = Field(default="Mechanical Breakdown", description="Hypothetical failure mode")
    duration_hours: float = Field(default=6.0, gt=0, description="Downtime window in hours")
