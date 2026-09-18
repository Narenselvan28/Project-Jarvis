"""
Order & Planning Schemas
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

class OperationInputSchema(BaseModel):
    sequence: int = Field(..., ge=1)
    process_id: str = Field(..., min_length=1)
    assigned_machine_id: Optional[str] = None
    processing_time_min: Optional[float] = Field(default=60.0, gt=0)
    setup_time_min: Optional[float] = Field(default=15.0, ge=0)

class OrderCreateSchema(BaseModel):
    order_id: Optional[str] = None
    customer: Optional[str] = Field(default="Global Apparel Brands Ltd", min_length=2)
    product: Optional[str] = Field(default="Classic Crew Neck T-Shirt", min_length=2)
    product_code: Optional[str] = Field(default="PRD-TSHIRT-01")
    quantity: int = Field(..., gt=0, description="Order quantity in pieces/units")
    priority: str = Field(default="NORMAL")
    deadline: Optional[str] = None
    operations: Optional[List[OperationInputSchema]] = None
    material_requirements: Optional[Dict[str, Any]] = None
    special_requirements: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in ["LOW", "NORMAL", "HIGH", "URGENT"]:
            raise ValueError("Priority must be one of: LOW, NORMAL, HIGH, URGENT")
        return v_upper

class PlanGenerationRequestSchema(BaseModel):
    product_name: str = Field(default="Classic Crew Neck T-Shirt")
    product_code: str = Field(default="PRD-TSHIRT-01")
    quantity: int = Field(default=12000, gt=0)
    priority: str = Field(default="URGENT")
    deadline: Optional[str] = None
    customer: Optional[str] = Field(default="Retail Partner A")

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in ["LOW", "NORMAL", "HIGH", "URGENT"]:
            raise ValueError("Priority must be one of: LOW, NORMAL, HIGH, URGENT")
        return v_upper

class PlanApprovalSchema(BaseModel):
    notes: Optional[str] = Field(default="Approved by Supervisor")
    operations: Optional[List[Dict[str, Any]]] = None

class PlanRejectSchema(BaseModel):
    reason: str = Field(..., min_length=3, description="Mandatory rejection reason")
