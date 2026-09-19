"""
Test Suite for Admin Controller and Manager Controller Endpoints
"""

import pytest

def test_admin_and_manager_endpoints(client, app):
    # 1. Login as Admin / Manager
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "manager",
        "password": "password123"
    })
    assert login_resp.status_code == 200
    token = login_resp.get_json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Admin Dashboard
    dash_resp = client.get("/api/v1/admin/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.get_json()["data"]
    assert "total_users" in dash_data
    assert "total_machines" in dash_data
    assert dash_data["total_machines"] >= 50
    assert "machines_by_status" in dash_data

    # 3. Test Admin Users List
    users_resp = client.get("/api/v1/admin/users", headers=headers)
    assert users_resp.status_code == 200
    users = users_resp.get_json()["data"]
    assert len(users) >= 4

    # 4. Test Admin Create User
    new_user_payload = {
        "username": "test_supervisor_99",
        "password": "password123",
        "role": "SUPERVISOR",
        "full_name": "Test Supervisor 99",
        "email": "test99@reflow.io"
    }
    create_u_resp = client.post("/api/v1/admin/users", json=new_user_payload, headers=headers)
    assert create_u_resp.status_code in [201, 409]

    # 5. Test Admin Machines List (50 machines enriched)
    mach_resp = client.get("/api/v1/admin/machines", headers=headers)
    assert mach_resp.status_code == 200
    machines = mach_resp.get_json()["data"]
    assert len(machines) >= 50
    assert "failure_risk_pct" in machines[0]
    assert "utilization_pct" in machines[0]

    # 6. Test Admin Machine Patch Override
    patch_m_resp = client.patch(f"/api/v1/admin/machines/{machines[0]['id']}", json={"hourly_rate": 1350.0}, headers=headers)
    assert patch_m_resp.status_code == 200

    # 7. Test Admin Audit Logs
    audit_resp = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert audit_resp.status_code == 200
    assert isinstance(audit_resp.get_json()["data"], list)

    # 8. Test Manager Simulate Disruption
    sim_resp = client.post("/api/v1/manager/simulate-disruption", json={
        "machine_id": "CUT-02",
        "failure_type": "Bearing Burnout",
        "duration_hours": 4.0,
        "reason": "Test Disruption"
    }, headers=headers)
    assert sim_resp.status_code == 200
    sim_data = sim_resp.get_json()["data"]
    disruption_id = sim_data["disruption_id"]
    assert "option_a" in sim_data
    assert "option_b" in sim_data

    # 9. Test Recovery Approve Option A
    appr_resp = client.post(f"/api/v1/recovery/{disruption_id}/approve", json={
        "option": "OPTION_A",
        "notes": "Approved Option A"
    }, headers=headers)
    assert appr_resp.status_code == 200
    appr_data = appr_resp.get_json()["data"]
    assert appr_data["status"] == "APPROVED"
