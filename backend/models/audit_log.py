from datetime import datetime

class AuditLog:
    def __init__(self, action, username="SYSTEM", user_id=None, entity_type="SYSTEM",
                 entity_id=None, details_json="{}", **kwargs):
        self.action = action
        self.username = username
        self.user_id = user_id
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.details_json = details_json
        self.timestamp = datetime.utcnow()

    def to_dict(self):
        return {
            "action": self.action,
            "username": self.username,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details_json": self.details_json,
            "timestamp": self.timestamp.isoformat()
        }
