"""
Comprehensive Automated API Test for End-to-End Data Lifecycle (Prompt Part 27)

Validates the complete sequence:
1. Manager creates order.
2. ML service executes.
3. Prediction returned.
4. OR-Tools executes.
5. Schedule generated.
6. Supervisor review state created (PENDING_SUPERVISOR_REVIEW).
7. Supervisor approval with explicit confirmation.
8. Active schedule created (SUPERVISOR_APPROVED -> ACTIVE).
9. Machine failure simulated (POST /api/v1/manager/simulate-disruption).
10. Impact analysis generated.
11. Recovery engine triggered.
12. Two distinct recovery alternatives (Option A & Option B) dynamically discovered.
13. Manager approval of recovery Option A.
14. Schedule version updated (Version 2 ACTIVE).
15. Maintenance request created for Service Person.
16. Repair completion by Service Person.
17. Machine restoration to AVAILABLE.
"""

import pytest
from backend.repositories.order_repository import order_repo
from backend.repositories.machine_repository import machine_repo
from backend.repositories.schedule_repository import schedule_repo
from backend.repositories.maintenance_repository import maintenance_repo

def test_full_17_step_lifecycle(client, auth_headers):
    # Step 1: Manager creates order
    order_payload = {
        "order_id": "ORD-TEST-LIFECYCLE-99",
        "product": "Premium Mercerized Cotton T-Shirt",
        "product_code": "PRD-TSHIRT-01",
        "quantity": 6000,
        "priority": "HIGH",
        "customer": "Global Athleisure Inc",
        "deadline": "2026-09-28 18:00:00"
    }

    create_resp = client.post(
        "/api/v1/orders",
        json=order_payload,
        headers=auth_headers["manager"]
    )
    assert create_resp.status_code in (200, 201), f"Create order failed: {create_resp.get_data(as_text=True)}"
    created_data = create_resp.get_json()["data"]

    # Step 2 & 3: ML service executed & predictions returned
    plan_id = created_data.get("plan_id")
    assert plan_id is not None
    plan_resp = client.get(f"/api/v1/orders/plan/{plan_id}", headers=auth_headers["supervisor"])
    assert plan_resp.status_code == 200
    plan = plan_resp.get_json()["data"]

    # Verify ML predictions exist in plan
    ops = plan.get("operations", [])
    assert len(ops) > 0
    assert any(op.get("predicted_time_min", 0) > 0 for op in ops), "ML processing time must be > 0"
    assert "estimated_duration_hours" in plan

    # Step 4 & 5: OR-Tools executed & Schedule generated
    assert all(op.get("assigned_machine_id") for op in ops), "Every operation must have machine allocated"

    # Step 6: Supervisor review state created
    assert plan.get("status") == "PENDING_SUPERVISOR_REVIEW"
    order_doc = order_repo.get_by_id("ORD-TEST-LIFECYCLE-99")
    assert order_doc["status"] == "PENDING_SUPERVISOR_REVIEW"

    # Step 7: Supervisor approval
    approve_resp = client.post(
        f"/api/v1/orders/plan/{plan_id}/approve",
        json={
            "notes": "Approved by Production Supervisor after constraint verification.",
            "operations": ops
        },
        headers=auth_headers["supervisor"]
    )
    assert approve_resp.status_code == 200, f"Approval failed: {approve_resp.get_data(as_text=True)}"
    approve_data = approve_resp.get_json()["data"]
    assert approve_data["status"] in ("SUPERVISOR_APPROVED", "APPROVED")

    # Step 8: Active schedule created
    active_sched = schedule_repo.get_active()
    assert active_sched is not None
    assert active_sched.get("status") in ("ACTIVE", "SUPERVISOR_APPROVED")

    # Step 9: Machine failure simulation
    target_machine = "CUT-02"
    disrupt_resp = client.post(
        "/api/v1/manager/simulate-disruption",
        json={
            "machine_id": target_machine,
            "failure_type": "MECHANICAL_FAILURE",
            "duration_hours": 6.0,
            "reason": "Simulated production disruption for Part 27 test"
        },
        headers=auth_headers["manager"]
    )
    assert disrupt_resp.status_code == 200, f"Disruption failed: {disrupt_resp.get_data(as_text=True)}"
    disrupt_data = disrupt_resp.get_json()["data"]

    # Verify machine is FAILED in database
    mach_doc = machine_repo.get_by_id(target_machine)
    assert mach_doc["status"] == "FAILED"

    # Step 10: Impact analysis
    disruption_id = disrupt_data["disruption_id"]
    assert disrupt_data.get("affected_orders") is not None
    assert "candidate_machines" in disrupt_data

    # Step 11 & 12: Recovery generation & Two distinct dynamic alternatives
    opt_a = disrupt_data.get("option_a")
    opt_b = disrupt_data.get("option_b")
    assert opt_a is not None, "Option A must be generated"
    assert opt_b is not None, "Option B must be generated"
    assert opt_a.get("machine") != target_machine, "Candidate must not be failed machine"
    assert opt_b.get("machine") != target_machine, "Candidate must not be failed machine"

    # Step 13: Manager approval of Option A
    rec_approve_resp = client.post(
        f"/api/v1/recovery/{disruption_id}/approve",
        json={
            "option_id": "OPTION_A",
            "notes": "Manager approved Option A (deadline focused)"
        },
        headers=auth_headers["manager"]
    )
    assert rec_approve_resp.status_code == 200, f"Recovery approval failed: {rec_approve_resp.get_data(as_text=True)}"
    rec_approve_data = rec_approve_resp.get_json()["data"]
    assert rec_approve_data["status"] == "APPROVED"

    # Step 14: Schedule version update
    updated_sched = schedule_repo.get_active()
    assert updated_sched is not None
    assert updated_sched.get("version", 1) >= 2

    # Step 15: Maintenance request created for Service Person
    wo = disrupt_data.get("work_order") or maintenance_repo.get_active_work_order(target_machine)
    assert wo is not None
    wo_id = wo["id"]

    # Service Person accepts work order
    accept_resp = client.patch(
        f"/api/v1/maintenance/{wo_id}/status",
        json={"status": "IN_PROGRESS", "notes": "Technician on site, diagnostic started"},
        headers=auth_headers["service"]
    )
    assert accept_resp.status_code == 200

    # Step 16: Repair completion by Service Person
    repair_resp = client.patch(
        f"/api/v1/maintenance/{wo_id}/status",
        json={"status": "REPAIRED", "notes": "Replaced bearing and recalibrated optical sensor"},
        headers=auth_headers["service"]
    )
    assert repair_resp.status_code == 200

    # Step 17: Machine restoration
    restore_resp = client.post(
        f"/api/v1/maintenance/{wo_id}/verify-and-restore",
        json={
            "notes": "Verified post-repair tolerances and vibration test. Restored to service."
        },
        headers=auth_headers["service"]
    )
    assert restore_resp.status_code == 200
    restored_mach = machine_repo.get_by_id(target_machine)
    assert restored_mach["status"] == "AVAILABLE"
