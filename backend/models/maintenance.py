from datetime import datetime
from enum import Enum
from backend.domain.maintenance_workflow import MaintenanceStatus

class MaintenanceWorkOrder:
    def __init__(self, id, machine_id, fault_type="Mechanical Breakdown", priority="HIGH",
                 status=MaintenanceStatus.OPEN.value, estimated_hours=4.0, **kwargs):
        self.id = id
        self.work_order_number = id
        self.machine_id = machine_id
        self.fault_type = fault_type
        self.priority = priority
        self.status = status.value if hasattr(status, 'value') else status
        self.estimated_hours = estimated_hours
        self.extra = kwargs

    def to_dict(self):
        d = {
            "id": self.id,
            "work_order_number": self.work_order_number,
            "machine_id": self.machine_id,
            "fault_type": self.fault_type,
            "priority": self.priority,
            "status": self.status,
            "estimated_hours": self.estimated_hours
        }
        d.update(self.extra)
        return d
