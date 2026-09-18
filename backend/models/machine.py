from datetime import datetime
from enum import Enum
from backend.domain.machine_state import MachineState

class MachineCapability:
    def __init__(self, machine_id, process_id, efficiency=1.0, quality_rating=1.0):
        self.machine_id = machine_id
        self.process_id = process_id
        self.efficiency = efficiency
        self.quality_rating = quality_rating

class MachineStatusHistory:
    def __init__(self, machine_id, old_status, new_status, reason=""):
        self.machine_id = machine_id
        self.old_status = old_status
        self.new_status = new_status
        self.reason = reason
        self.created_at = datetime.utcnow()

class Machine:
    def __init__(self, id, name, lane_id, process_id, status=MachineState.AVAILABLE.value,
                 precision_level="HIGH", hourly_rate=1200.0, base_cycle_time=60.0,
                 setup_time_min=15.0, svg_x=100.0, svg_y=100.0, **kwargs):
        self.id = id
        self.name = name
        self.lane_id = lane_id
        self.process_id = process_id
        self.status = status.value if hasattr(status, 'value') else status
        self.precision_level = precision_level
        self.hourly_rate = hourly_rate
        self.base_cycle_time = base_cycle_time
        self.setup_time_min = setup_time_min
        self.svg_x = svg_x
        self.svg_y = svg_y
        self.extra = kwargs

    def to_dict(self, include_details=True):
        d = {
            "id": self.id,
            "name": self.name,
            "lane_id": self.lane_id,
            "process_id": self.process_id,
            "status": self.status,
            "precision_level": self.precision_level,
            "hourly_rate": self.hourly_rate,
            "base_cycle_time": self.base_cycle_time,
            "setup_time_min": self.setup_time_min,
            "svg_x": self.svg_x,
            "svg_y": self.svg_y,
            "x_position": self.svg_x,
            "y_position": self.svg_y
        }
        d.update(self.extra)
        return d
