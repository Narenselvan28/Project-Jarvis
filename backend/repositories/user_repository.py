"""
User Repository for MongoDB
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from werkzeug.security import generate_password_hash, check_password_hash
from backend.repositories.base_repository import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")

    def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"username": username})

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"id": str(user_id)})

    def create_or_update(self, username: str, password: str, role: str = "MANAGER", email: str = None, full_name: str = None) -> Dict[str, Any]:
        existing = self.get_by_username(username)
        pwd_hash = generate_password_hash(password)
        now_iso = datetime.utcnow().isoformat()
        if existing:
            self.update(
                {"username": username},
                {
                    "password_hash": pwd_hash,
                    "role": role.upper(),
                    "email": email or f"{username}@factory.io",
                    "full_name": full_name or username.capitalize(),
                    "updated_at": now_iso
                }
            )
            return self.get_by_username(username)

        doc = {
            "id": str(uuid.uuid4())[:8],
            "username": username,
            "password_hash": pwd_hash,
            "role": role.upper(),
            "email": email or f"{username}@factory.io",
            "full_name": full_name or username.capitalize(),
            "created_at": now_iso,
            "updated_at": now_iso
        }
        return self.insert(doc)

    def verify_password(self, user_doc: Dict[str, Any], password: str) -> bool:
        if not user_doc or "password_hash" not in user_doc:
            return False
        return check_password_hash(user_doc["password_hash"], password)

    def get_all_safe(self) -> List[Dict[str, Any]]:
        return self.find_all(projection={"_id": 0, "password_hash": 0})

user_repo = UserRepository()
