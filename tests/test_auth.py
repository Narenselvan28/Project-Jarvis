import pytest

def test_login_success(client):
    res = client.post("/api/v1/auth/login", json={
        "username": "manager",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role"] == "MANAGER"

def test_login_invalid_credentials(client):
    res = client.post("/api/v1/auth/login", json={
        "username": "manager",
        "password": "wrongpassword"
    })
    assert res.status_code == 401
    data = res.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_CREDENTIALS"

def test_me_endpoint_with_jwt(client, supervisor_token):
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {supervisor_token}"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["data"]["user"]["username"] == "supervisor"
    assert data["data"]["user"]["role"] == "SUPERVISOR"
