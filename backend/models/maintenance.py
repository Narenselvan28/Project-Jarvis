from datetime import datetime
from enum import Enum
from backend.extensions import db

class MaintenanceStatus(str, Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    REPAIRED = "REPAIRED"
    VERIFIED = "VERIFIED"
    CLOSED = "CLOSED"

class MaintenanceWorkOrder(db.Model):
    __tablename__ = "maintenance_work_orders"

    id = db.Column(db.Integer, primary_key=True)
    work_order_number = db.Column(db.String(50), unique=True, nullable=False, index=True) # e.g. 'WO-00042'
    machine_id = db.Column(db.String(20), db.ForeignKey("machines.id"), nullable=False, index=True)
    disruption_id = db.Column(db.Integer, db.ForeignKey("disruptions.id"), nullable=True)
    fault_type = db.Column(db.String(100), nullable=False)
    priority = db.Column(db.String(20), default="HIGH") # URGENT, HIGH, MEDIUM, LOW
    status = db.Column(db.String(20), default=MaintenanceStatus.OPEN.value, index=True)
    
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    estimated_repair_hours = db.Column(db.Float, default=4.0)
    actual_repair_hours = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime, nullable=True)
    repaired_at = db.Column(db.DateTime, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    machine = db.relationship("Machine", back_populates="maintenance_orders")
    disruption = db.relationship("Disruption", back_populates="maintenance_order")
    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])

    def to_dict(self):
        return {
            "id": self.id,
            "work_order_number": self.work_order_number,
            "machine_id": self.machine_id,
            "machine_name": self.machine.name if self.machine else self.machine_id,
            "lane_id": self.machine.lane_id if self.machine else None,
            "disruption_id": self.disruption_id,
            "fault_type": self.fault_type,
            "priority": self.priority,
            "status": self.status,
            "assigned_to": self.assigned_to.full_name if self.assigned_to else "Unassigned",
            "assigned_to_id": self.assigned_to_id,
            "estimated_repair_hours": self.estimated_repair_hours,
            "actual_repair_hours": self.actual_repair_hours,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "repaired_at": self.repaired_at.isoformat() if self.repaired_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None
        }
