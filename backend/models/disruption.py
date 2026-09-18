from datetime import datetime
from enum import Enum
from backend.extensions import db

class DisruptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"

class Disruption(db.Model):
    __tablename__ = "disruptions"

    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.String(20), db.ForeignKey("machines.id"), nullable=False, index=True)
    failure_type = db.Column(db.String(100), nullable=False) # e.g., 'Mechanical Failure', 'Overheating', 'Tool Wear'
    duration_hours = db.Column(db.Float, default=6.0)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default=DisruptionStatus.ACTIVE.value, index=True)
    affected_orders_count = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text, nullable=True)

    machine = db.relationship("Machine")
    maintenance_order = db.relationship("MaintenanceWorkOrder", back_populates="disruption", uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "machine_id": self.machine_id,
            "machine_name": self.machine.name if self.machine else self.machine_id,
            "failure_type": self.failure_type,
            "duration_hours": self.duration_hours,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "status": self.status,
            "affected_orders_count": self.affected_orders_count,
            "notes": self.notes
        }
