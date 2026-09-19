"""
Common API Request & Response Schemas
"""

from typing import Generic, TypeVar, Optional, Any, Dict
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")

class ErrorDetail(BaseModel):
    code: str = Field(..., description="Standardized error code")
    message: str = Field(..., description="User-friendly error message")
    details: Optional[Any] = Field(None, description="Optional debug or parameter error context")

class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail

class SuccessResponse(BaseModel, Generic[DataT]):
    success: bool = True
    data: DataT
    meta: Dict[str, Any] = Field(default_factory=dict)

def make_success(data: Any, meta: Dict[str, Any] = None, status_code: int = 200):
    from flask import jsonify
    payload = {
        "success": True,
        "data": data,
        "meta": meta or {}
    }
    return jsonify(payload), status_code

def make_error(code: str, message: str, details: Any = None, status_code: int = 400):
    from flask import jsonify
    err_obj = {
        "code": code,
        "error": code,
        "message": message,
        "details": details
    }
    if isinstance(details, dict):
        if "current_state" in details:
            err_obj["current_state"] = details["current_state"]
        if "requested_state" in details:
            err_obj["requested_state"] = details["requested_state"]
        elif "target_state" in details:
            err_obj["requested_state"] = details["target_state"]
    payload = {
        "success": False,
        "error": err_obj
    }
    return jsonify(payload), status_code
