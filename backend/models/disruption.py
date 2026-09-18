from datetime import datetime
from enum import Enum

class DisruptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ANALYZED = "ANALYZED"
    REASSIGNED = "REASSIGNED"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"

class Disruption:
    def __init__(self, id, machine_id, failure_type, duration_hours=6.0, status=DisruptionStatus.ACTIVE.value, **kwargs):
        self.id = id
        self.machine_id = machine_id
        self.failure_type = failure_type
        self.duration_hours = duration_hours
        self.status = status.value if hasattr(status, 'value') else status
        self.extra = kwargs

    def to_dict(self):
        d = {
            "id": self.id,
            "machine_id": self.machine_id,
            "failure_type": self.failure_type,
            "duration_hours": self.duration_hours,
            "status": self.status
        }
        d.update(self.extra)
        return d
