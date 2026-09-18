from datetime import datetime
from backend.extensions import db

class Lane(db.Model):
    __tablename__ = "lanes"

    id = db.Column(db.String(20), primary_key=True)  # e.g., 'L01', 'L02', 'L03'
    name = db.Column(db.String(100), nullable=False)
    sequence = db.Column(db.Integer, nullable=False, default=1)
    description = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    machines = db.relationship("Machine", back_populates="lane", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sequence": self.sequence,
            "description": self.description,
            "is_active": self.is_active,
            "machine_count": len(self.machines) if self.machines else 0
        }
