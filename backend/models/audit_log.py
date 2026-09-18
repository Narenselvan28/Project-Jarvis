import json
from datetime import datetime
from backend.extensions import db

class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    username = db.Column(db.String(80), nullable=True)
    action = db.Column(db.String(100), nullable=False) # e.g., 'DISRUPTION_TRIGGERED', 'MACHINE_REASSIGNED', 'SCHEDULE_OPTIMIZED'
    entity_type = db.Column(db.String(50), nullable=False) # 'MACHINE', 'ORDER', 'SCHEDULE', 'MAINTENANCE'
    entity_id = db.Column(db.String(50), nullable=False)
    details_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        details = {}
        if self.details_json:
            try:
                details = json.loads(self.details_json)
            except Exception:
                details = {"raw": self.details_json}
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.username or "SYSTEM",
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": details,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
