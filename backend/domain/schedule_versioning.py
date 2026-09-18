"""
Schedule Versioning and Human-in-the-Loop Lifecycle
"""

from enum import Enum
from typing import Dict, Set

class ScheduleStatus(str, Enum):
    DRAFT = "DRAFT"
    PROPOSED = "PROPOSED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"
    COMPLETED = "COMPLETED"

class ScheduleType(str, Enum):
    BASELINE = "BASELINE"
    OPTIMIZED = "OPTIMIZED"
    RECOVERY = "RECOVERY"

SCHEDULE_STATUS_TRANSITIONS: Dict[str, Set[str]] = {
    "DRAFT": {"PROPOSED", "REJECTED"},
    "PROPOSED": {"UNDER_REVIEW", "APPROVED", "REJECTED"},
    "UNDER_REVIEW": {"APPROVED", "REJECTED", "PROPOSED"},
    "APPROVED": {"ACTIVE", "SUPERSEDED"},
    "REJECTED": set(),
    "ACTIVE": {"SUPERSEDED", "COMPLETED"},
    "SUPERSEDED": set(),
    "COMPLETED": set()
}

class ScheduleVersioning:
    @staticmethod
    def create_version_record(
        schedule_id: str,
        version: int,
        schedule_type: ScheduleType,
        reason: str,
        created_by: str,
        parent_schedule_id: str = None,
        status: ScheduleStatus = ScheduleStatus.PROPOSED
    ) -> dict:
        return {
            "schedule_id": schedule_id,
            "version": version,
            "schedule_type": schedule_type.value if hasattr(schedule_type, 'value') else str(schedule_type),
            "reason": reason,
            "created_by": created_by,
            "parent_schedule_id": parent_schedule_id,
            "status": status.value if hasattr(status, 'value') else str(status)
        }
