"""
ReFlow Application-Level AES-256-GCM Encryption Service

Provides authenticated encryption for sensitive operational data (e.g. proprietary customer specs,
technician personal notes, confidential batch formulations) using AES-256-GCM.
The key is strictly retrieved from the AES_ENCRYPTION_KEY environment variable.
"""

import os
import base64
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ENCRYPTION_PREFIX = "reflow_enc_v1:"

class EncryptionService:
    def __init__(self, key: Optional[str] = None):
        raw_key = key or os.getenv("AES_ENCRYPTION_KEY")
        if not raw_key:
            # Fallback default for development environment if env not set
            raw_key = "reflow-dev-default-key-32bytes!!"
        
        # Ensure key is exactly 32 bytes (256 bits) for AES-256
        if isinstance(raw_key, str):
            key_bytes = raw_key.encode("utf-8")
        else:
            key_bytes = raw_key

        if len(key_bytes) != 32:
            # Use SHA-256 to deterministically derive a strict 32-byte key
            key_bytes = hashlib.sha256(key_bytes).digest()

        self._key = key_bytes
        self._aesgcm = AESGCM(self._key)

    def encrypt_sensitive_data(self, plaintext: str) -> str:
        """
        Encrypts plaintext string using AES-256-GCM with a random 12-byte IV/nonce.
        Returns prefixed base64 string: reflow_enc_v1:<base64(iv + ciphertext + tag)>
        """
        if not plaintext or not isinstance(plaintext, str):
            return plaintext

        # 12-byte nonce standard for GCM
        nonce = os.urandom(12)
        ciphertext = self._aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        combined = nonce + ciphertext
        encoded = base64.b64encode(combined).decode("utf-8")
        return f"{ENCRYPTION_PREFIX}{encoded}"

    def decrypt_sensitive_data(self, encrypted_str: str) -> str:
        """
        Decrypts an AES-256-GCM encrypted string.
        Verifies authentication tag to ensure data integrity and prevent tampering.
        """
        if not encrypted_str or not isinstance(encrypted_str, str):
            return encrypted_str

        if not encrypted_str.startswith(ENCRYPTION_PREFIX):
            # Not encrypted with this service, return as-is
            return encrypted_str

        try:
            payload = encrypted_str[len(ENCRYPTION_PREFIX):]
            raw_bytes = base64.b64decode(payload.encode("utf-8"))
            if len(raw_bytes) < 28: # 12 bytes nonce + 16 bytes tag minimum
                return encrypted_str

            nonce = raw_bytes[:12]
            ciphertext = raw_bytes[12:]
            decrypted_bytes = self._aesgcm.decrypt(nonce, ciphertext, None)
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            raise ValueError(f"AES-256-GCM Decryption failed: invalid key or tampered payload ({str(e)})")

    def is_encrypted(self, data: str) -> bool:
        """Checks if a string is encrypted with the ReFlow AES-256 scheme."""
        return isinstance(data, str) and data.startswith(ENCRYPTION_PREFIX)


# Global singleton instance
encryption_service = EncryptionService()

def encrypt_sensitive_data(plaintext: str) -> str:
    return encryption_service.encrypt_sensitive_data(plaintext)

def decrypt_sensitive_data(encrypted_str: str) -> str:
    return encryption_service.decrypt_sensitive_data(encrypted_str)
