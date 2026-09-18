from datetime import datetime
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash

class Role(str, Enum):
    MANAGER = "MANAGER"
    SUPERVISOR = "SUPERVISOR"
    SERVICE_PERSON = "SERVICE_PERSON"

class User:
    def __init__(self, username, email, full_name, role=Role.SUPERVISOR.value, id=None, password_hash=None, is_active=True):
        self.id = id
        self.username = username
        self.email = email
        self.full_name = full_name
        self.role = role.value if hasattr(role, 'value') else role
        self.password_hash = password_hash or ""
        self.is_active = is_active
        self.created_at = datetime.utcnow()

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
