"""
Tests for ReFlow Signup, RBAC Backend Enforcement, and AES-256-GCM Encryption
"""

import pytest
from flask_jwt_extended import create_access_token
from backend.services.encryption_service import encrypt_sensitive_data, decrypt_sensitive_data, encryption_service

def test_aes_encryption_decryption_flow():
    secret_note = "Confidential Batch Recipe #804: Organic Indigo Dye formula"
    encrypted = encrypt_sensitive_data(secret_note)
    assert encrypted != secret_note
    assert encrypted.startswith("reflow_enc_v1:")
    
    decrypted = decrypt_sensitive_data(encrypted)
    assert decrypted == secret_note

def test_aes_tampering_rejection():
    secret = "Test Secret Note"
    encrypted = encrypt_sensitive_data(secret)
    # Tamper with the base64 ciphertext
    tampered = encrypted[:-4] + "AAAA"
    with pytest.raises(ValueError):
        decrypt_sensitive_data(tampered)

def test_signup_supervisor_success(client):
    res = client.post("/api/v1/auth/signup", json={
        "full_name": "Test Supervisor",
        "username": "new_supervisor",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "SUPERVISOR",
        "email": "supervisor_new@reflow.io"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role"] == "SUPERVISOR"

def test_signup_manager_restriction(client):
    # Attempting to self-register as MANAGER without admin code must be rejected
    res = client.post("/api/v1/auth/signup", json={
        "full_name": "Unauthorized Manager",
        "username": "rogue_manager",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "MANAGER",
        "email": "rogue@reflow.io"
    })
    assert res.status_code == 403
    data = res.get_json()
    assert data["success"] is False

def test_signup_weak_password_rejected(client):
    res = client.post("/api/v1/auth/signup", json={
        "full_name": "Weak Pass User",
        "username": "weak_user",
        "password": "123",
        "confirm_password": "123",
        "role": "SERVICE_PERSON"
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False

def test_rbac_service_person_cannot_approve_disruption(client):
    # Login as service person
    srv_login = client.post("/api/v1/auth/login", json={
        "username": "service",
        "password": "password123"
    })
    assert srv_login.status_code == 200
    srv_token = srv_login.get_json()["data"]["access_token"]

    # Attempt to approve disruption recovery (requires MANAGER role)
    res = client.post(
        "/api/v1/disruptions/DISR-TEST/approve",
        headers={"Authorization": f"Bearer {srv_token}"},
        json={"option_id": "OPT-A"}
    )
    # Must return 403 Forbidden
    assert res.status_code == 403
    data = res.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"
