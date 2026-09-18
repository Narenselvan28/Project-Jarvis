from datetime import datetime
from backend.extensions import db

class Process(db.Model):
    __tablename__ = "processes"

    id = db.Column(db.String(20), primary_key=True)  # e.g. 'P01', 'P02', 'P03', 'P04', 'P05'
    name = db.Column(db.String(100), nullable=False) # Cutting, Forming, Machining, Finishing, Inspection
    sequence_index = db.Column(db.Integer, nullable=False) # 1, 2, 3, 4, 5
    description = db.Column(db.String(255), nullable=True)
    standard_duration_minutes = db.Column(db.Float, default=60.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    machines = db.relationship("Machine", back_populates="process")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sequence_index": self.sequence_index,
            "description": self.description,
            "standard_duration_minutes": self.standard_duration_minutes
        }
