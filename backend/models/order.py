from datetime import datetime
from enum import Enum

class OrderPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class OrderState(str, Enum):
    PLANNED = "PLANNED"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    BLOCKED = "BLOCKED"
    REASSIGNED = "REASSIGNED"
    COMPLETED = "COMPLETED"

class OrderOperation:
    def __init__(self, order_id, sequence, process_id, assigned_machine_id=None,
                 processing_time_min=60.0, setup_time_min=15.0, status=OrderState.PLANNED.value, **kwargs):
        self.order_id = order_id
        self.sequence = sequence
        self.process_id = process_id
        self.assigned_machine_id = assigned_machine_id
        self.processing_time_min = processing_time_min
        self.setup_time_min = setup_time_min
        self.status = status.value if hasattr(status, 'value') else status
        self.extra = kwargs

    def to_dict(self):
        d = {
            "order_id": self.order_id,
            "sequence": self.sequence,
            "process_id": self.process_id,
            "assigned_machine_id": self.assigned_machine_id,
            "processing_time_min": self.processing_time_min,
            "setup_time_min": self.setup_time_min,
            "status": self.status
        }
        d.update(self.extra)
        return d

class Order:
    def __init__(self, id, product=None, quantity=100, priority="NORMAL", status="QUEUED",
                 deadline_hours=24.0, operations=None, **kwargs):
        self.id = id
        self.product = product
        self.quantity = quantity
        self.priority = priority.value if hasattr(priority, 'value') else priority
        self.status = status.value if hasattr(status, 'value') else status
        self.deadline_hours = deadline_hours
        self.operations = operations or []
        self.extra = kwargs

    def to_dict(self, include_operations=True):
        d = {
            "id": self.id,
            "product": self.product,
            "quantity": self.quantity,
            "priority": self.priority,
            "status": self.status,
            "deadline_hours": self.deadline_hours
        }
        if include_operations:
            d["operations"] = [op.to_dict() if hasattr(op, 'to_dict') else op for op in self.operations]
        d.update(self.extra)
        return d
