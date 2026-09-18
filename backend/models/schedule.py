from datetime import datetime
from backend.domain.schedule_versioning import ScheduleStatus, ScheduleType

class Schedule:
    def __init__(self, id, is_active=True, makespan_minutes=1200.0, total_tardiness_minutes=0.0,
                 late_orders_count=0, total_production_cost=15000.0, average_utilization=82.0,
                 stability_score=95.0, status=ScheduleStatus.ACTIVE.value, **kwargs):
        self.id = id
        self.is_active = is_active
        self.makespan_minutes = makespan_minutes
        self.total_tardiness_minutes = total_tardiness_minutes
        self.late_orders_count = late_orders_count
        self.total_production_cost = total_production_cost
        self.average_utilization = average_utilization
        self.stability_score = stability_score
        self.status = status
        self.extra = kwargs

    def to_dict(self):
        d = {
            "id": self.id,
            "is_active": self.is_active,
            "makespan_minutes": self.makespan_minutes,
            "total_tardiness_minutes": self.total_tardiness_minutes,
            "late_orders_count": self.late_orders_count,
            "total_production_cost": self.total_production_cost,
            "average_utilization": self.average_utilization,
            "stability_score": self.stability_score,
            "status": self.status
        }
        d.update(self.extra)
        return d
