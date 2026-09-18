from datetime import datetime
from backend.extensions import db

class Worker(db.Model):
    __tablename__ = "workers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    employee_code = db.Column(db.String(20), unique=True, nullable=False)
    shift = db.Column(db.String(20), default="SHIFT_1") # SHIFT_1 (Morning), SHIFT_2 (Evening), SHIFT_3 (Night)
    is_available = db.Column(db.Boolean, default=True, index=True)
    hourly_rate = db.Column(db.Float, default=350.0)
    experience_years = db.Column(db.Float, default=4.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    skills = db.relationship("WorkerSkill", back_populates="worker", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "employee_code": self.employee_code,
            "shift": self.shift,
            "is_available": self.is_available,
            "hourly_rate": self.hourly_rate,
            "experience_years": self.experience_years,
            "skills": [s.to_dict() for s in self.skills]
        }

class WorkerSkill(db.Model):
    __tablename__ = "worker_skills"

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id"), nullable=False)
    process_id = db.Column(db.String(20), db.ForeignKey("processes.id"), nullable=False)
    skill_level = db.Column(db.Integer, default=3) # 1 to 5 scale

    worker = db.relationship("Worker", back_populates="skills")
    process = db.relationship("Process")

    def to_dict(self):
        return {
            "process_id": self.process_id,
            "process_name": self.process.name if self.process else self.process_id,
            "skill_level": self.skill_level
        }
