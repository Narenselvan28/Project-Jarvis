from datetime import datetime
from enum import Enum
from backend.extensions import db

class MachineState(str, Enum):
    AVAILABLE = "AVAILABLE"
    RUNNING = "RUNNING"
    IDLE = "IDLE"
    SETUP = "SETUP"
    BLOCKED = "BLOCKED"
    FAILED = "FAILED"
    MAINTENANCE = "MAINTENANCE"
    REPAIRED = "REPAIRED"
    VERIFIED = "VERIFIED"
    REASSIGNED = "REASSIGNED"

class Machine(db.Model):
    __tablename__ = "machines"

    id = db.Column(db.String(20), primary_key=True)  # e.g., 'M01', 'M04', 'M09'
    name = db.Column(db.String(100), nullable=False)
    lane_id = db.Column(db.String(20), db.ForeignKey("lanes.id"), nullable=False, index=True)
    process_id = db.Column(db.String(20), db.ForeignKey("processes.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default=MachineState.AVAILABLE.value, index=True)
    
    precision_level = db.Column(db.String(20), default="HIGH") # 'HIGH' or 'MEDIUM'
    hourly_rate = db.Column(db.Float, default=1200.0) # Production cost per hour (e.g. INR / USD)
    base_cycle_time = db.Column(db.Float, default=60.0) # In minutes
    setup_time_min = db.Column(db.Float, default=15.0) # In minutes
    speed_factor = db.Column(db.Float, default=1.0) # Processing speed multiplier (0.8 - 1.2)
    
    # 2D SVG Factory Coordinates
    svg_x = db.Column(db.Float, nullable=False, default=100.0)
    svg_y = db.Column(db.Float, nullable=False, default=100.0)

    # Health, Telemetry & Predictive Maintenance Data
    machine_age_years = db.Column(db.Float, default=3.5)
    runtime_hours = db.Column(db.Float, default=1240.0)
    current_utilization = db.Column(db.Float, default=78.5) # Percentage
    temperature = db.Column(db.Float, default=68.2) # Celsius
    vibration = db.Column(db.Float, default=2.4) # mm/s RMS
    previous_failures = db.Column(db.Integer, default=2)
    maintenance_gap_days = db.Column(db.Integer, default=45)
    cycle_count = db.Column(db.Integer, default=8500)
    failure_risk = db.Column(db.Float, default=0.15) # ML predicted probability 0.0 - 1.0
    
    current_order_id = db.Column(db.String(50), nullable=True)
    current_worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lane = db.relationship("Lane", back_populates="machines")
    process = db.relationship("Process", back_populates="machines")
    capabilities = db.relationship("MachineCapability", back_populates="machine", cascade="all, delete-orphan")
    status_history = db.relationship("MachineStatusHistory", back_populates="machine", cascade="all, delete-orphan", order_by="desc(MachineStatusHistory.created_at)")
    maintenance_orders = db.relationship("MaintenanceWorkOrder", back_populates="machine")
    current_worker = db.relationship("Worker", foreign_keys=[current_worker_id])

    def to_dict(self, include_details=False):
        data = {
            "id": self.id,
            "name": self.name,
            "lane_id": self.lane_id,
            "lane_name": self.lane.name if self.lane else self.lane_id,
            "process_id": self.process_id,
            "process_name": self.process.name if self.process else self.process_id,
            "status": self.status,
            "precision_level": self.precision_level,
            "hourly_rate": self.hourly_rate,
            "base_cycle_time": self.base_cycle_time,
            "setup_time_min": self.setup_time_min,
            "speed_factor": self.speed_factor,
            "svg_x": self.svg_x,
            "svg_y": self.svg_y,
            "machine_age_years": self.machine_age_years,
            "runtime_hours": self.runtime_hours,
            "current_utilization": self.current_utilization,
            "temperature": self.temperature,
            "vibration": self.vibration,
            "previous_failures": self.previous_failures,
            "maintenance_gap_days": self.maintenance_gap_days,
            "failure_risk": round(self.failure_risk * 100, 1), # displayed as %
            "current_order_id": self.current_order_id,
            "current_worker": self.current_worker.to_dict() if self.current_worker else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        if include_details:
            data["capabilities"] = [c.to_dict() for c in self.capabilities]
            data["recent_history"] = [h.to_dict() for h in self.status_history[:5]]
        return data


class MachineCapability(db.Model):
    __tablename__ = "machine_capabilities"

    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.String(20), db.ForeignKey("machines.id"), nullable=False)
    process_id = db.Column(db.String(20), db.ForeignKey("processes.id"), nullable=False)
    precision_level = db.Column(db.String(20), default="HIGH")
    setup_overhead_min = db.Column(db.Float, default=10.0)

    machine = db.relationship("Machine", back_populates="capabilities")
    process = db.relationship("Process")

    def to_dict(self):
        return {
            "process_id": self.process_id,
            "process_name": self.process.name if self.process else self.process_id,
            "precision_level": self.precision_level,
            "setup_overhead_min": self.setup_overhead_min
        }


class MachineStatusHistory(db.Model):
    __tablename__ = "machine_status_history"

    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.String(20), db.ForeignKey("machines.id"), nullable=False)
    old_status = db.Column(db.String(20), nullable=True)
    new_status = db.Column(db.String(20), nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    machine = db.relationship("Machine", back_populates="status_history")

    def to_dict(self):
        return {
            "id": self.id,
            "machine_id": self.machine_id,
            "old_status": self.old_status,
            "new_status": self.new_status,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
