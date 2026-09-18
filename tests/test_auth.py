import pytest
from backend.models.user import User, Role

def test_login_success(isolated_db):
    client = isolated_db.test_client()
    res = client.post("/api/auth/login", json={
        "username": "manager",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert "access_token" in data
    assert data["user"]["role"] == "MANAGER"

def test_login_invalid_credentials(isolated_db):
    client = isolated_db.test_client()
    res = client.post("/api/auth/login", json={
        "username": "manager",
        "password": "wrongpassword"
    })
    assert res.status_code == 401

def test_me_endpoint_with_jwt(isolated_db):
    client = isolated_db.test_client()
    login_res = client.post("/api/auth/login", json={
        "username": "supervisor",
        "password": "password123"
    })
    token = login_res.get_json()["access_token"]

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["user"]["username"] == "supervisor"
    assert data["user"]["role"] == "SUPERVISOR"
