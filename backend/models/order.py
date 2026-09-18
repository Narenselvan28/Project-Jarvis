from datetime import datetime
from enum import Enum
from backend.extensions import db

class OrderPriority(str, Enum):
    LOW = "LOW"
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

class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.String(50), primary_key=True) # e.g., 'ORD-1042'
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=100)
    priority = db.Column(db.String(20), default=OrderPriority.MEDIUM.value, index=True)
    status = db.Column(db.String(20), default=OrderState.QUEUED.value, index=True)
    
    # Deadline in hours from schedule base / absolute datetime
    deadline_hours = db.Column(db.Float, default=24.0) # Relative hours
    due_date = db.Column(db.DateTime, nullable=True)
    assigned_lane_id = db.Column(db.String(20), db.ForeignKey("lanes.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    product = db.relationship("Product", back_populates="orders")
    lane = db.relationship("Lane")
    operations = db.relationship("OrderOperation", back_populates="order", cascade="all, delete-orphan", order_by="OrderOperation.sequence")

    def to_dict(self, include_operations=True):
        data = {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "Standard Part",
            "product_code": self.product.code if self.product else "PRD-STD",
            "required_precision": self.product.required_precision if self.product else "HIGH",
            "quantity": self.quantity,
            "priority": self.priority,
            "status": self.status,
            "deadline_hours": self.deadline_hours,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "assigned_lane_id": self.assigned_lane_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
        if include_operations:
            data["operations"] = [op.to_dict() for op in self.operations]
        return data


class OrderOperation(db.Model):
    __tablename__ = "order_operations"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(50), db.ForeignKey("orders.id"), nullable=False, index=True)
    sequence = db.Column(db.Integer, nullable=False) # 1, 2, 3, 4, 5
    process_id = db.Column(db.String(20), db.ForeignKey("processes.id"), nullable=False)
    assigned_machine_id = db.Column(db.String(20), db.ForeignKey("machines.id"), nullable=True, index=True)
    original_machine_id = db.Column(db.String(20), nullable=True) # Tracks original if substituted
    status = db.Column(db.String(20), default=OrderState.QUEUED.value) # QUEUED, RUNNING, BLOCKED, REASSIGNED, COMPLETED

    # Timeline in relative minutes from schedule epoch
    scheduled_start_min = db.Column(db.Float, default=0.0)
    scheduled_end_min = db.Column(db.Float, default=60.0)
    processing_time_min = db.Column(db.Float, default=60.0)
    setup_time_min = db.Column(db.Float, default=10.0)

    # Actual progress tracking
    progress_percentage = db.Column(db.Float, default=0.0)

    order = db.relationship("Order", back_populates="operations")
    process = db.relationship("Process")
    machine = db.relationship("Machine", foreign_keys=[assigned_machine_id])

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "sequence": self.sequence,
            "process_id": self.process_id,
            "process_name": self.process.name if self.process else self.process_id,
            "assigned_machine_id": self.assigned_machine_id,
            "original_machine_id": self.original_machine_id,
            "status": self.status,
            "scheduled_start_min": self.scheduled_start_min,
            "scheduled_end_min": self.scheduled_end_min,
            "processing_time_min": self.processing_time_min,
            "setup_time_min": self.setup_time_min,
            "progress_percentage": self.progress_percentage
        }
