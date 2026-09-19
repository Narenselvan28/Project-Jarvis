"""
Section 10 Verification Test: NEW ORDER -> ML -> OR-TOOLS -> SUPERVISOR FLOW
Automated 29-Step End-to-End Test Suite
"""

import pytest
from datetime import datetime, timedelta
from backend.repositories.order_repository import order_repo
from backend.repositories.schedule_repository import schedule_repo
from backend.repositories.machine_repository import machine_repo
from backend.database.mongo import get_collection

def test_new_order_to_supervisor_approval_29_steps(client, app):
    # =========================================================================
    # STEP 1: Login as Manager
    # =========================================================================
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "manager",
        "password": "password123"
    })
    assert login_resp.status_code == 200, f"Manager login failed: {login_resp.data}"
    mgr_data = login_resp.get_json()["data"]
    mgr_token = mgr_data["access_token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    assert mgr_data["user"]["role"] == "MANAGER"

    # =========================================================================
    # STEPS 2-6: Manager Creates Test Order Parameters and Submits
    # =========================================================================
    now = datetime.utcnow()
    deadline_iso = (now + timedelta(hours=36)).strftime("%Y-%m-%d %H:%M:%S")
    order_id = "ORD-TEST-AUTOPLAN-01"

    order_payload = {
        "order_id": order_id,
        "id": order_id,
        "customer": "Nordic Sports Global",
        "customer_name": "Nordic Sports Global",
        "product": "Technical Performance Polo",
        "product_name": "Technical Performance Polo",
        "product_code": "PRD-POLO-02",
        "quantity": 6000,                                      # Step 3
        "priority": "URGENT",                                   # Step 4
        "deadline": deadline_iso,                               # Step 5
        "delivery_deadline": deadline_iso,
        "required_material": "100% Combed Cotton Single Jersey 180 GSM",
        "estimated_production_cost": 72000.0
    }

    # Step 6: Submit order
    submit_resp = client.post("/api/v1/orders", json=order_payload, headers=mgr_headers)
    assert submit_resp.status_code == 201, f"Order submission failed: {submit_resp.data}"
    submit_json = submit_resp.get_json()
    assert submit_json["success"] is True

    created_order = submit_json["data"]
    plan = submit_json.get("meta", {}).get("plan")
    assert plan is not None, "Production plan was not generated in order response meta"

    # =========================================================================
    # STEPS 7-14: Backend Generation, ML Predictions, OR-Tools, and Pending State
    # =========================================================================
    # Step 7: Production operations generated
    plan_ops = plan.get("operations", [])
    assert len(plan_ops) >= 10, f"Expected at least 10 manufacturing operations, found {len(plan_ops)}"

    # Step 8: Backend executes ML processing-time prediction
    for op in plan_ops:
        assert "predicted_time_min" in op or "processing_time_min" in op
        pred_time = op.get("predicted_time_min") or op.get("processing_time_min")
        assert pred_time > 0, "ML processing time prediction must be strictly positive"

    # Step 9: Backend executes failure-risk prediction and suitability evaluation
    # Step 10: Backend evaluates candidate machines
    for op in plan_ops:
        cands = op.get("candidates", [])
        assert len(cands) > 0, f"Operation {op.get('sequence')} has no candidate machines"
        for cand in cands:
            assert "suitability_score" in cand
            assert "failure_risk_pct" in cand or "failure_risk" in cand
            assert "predicted_processing_time" in cand

    # Step 11: Backend executes OR-Tools CP-SAT
    # Step 12: Schedule is generated with coherent monotonic start/end times
    prev_end = 0.0
    for op in plan_ops:
        s_start = op.get("scheduled_start_min", 0.0)
        s_end = op.get("scheduled_end_min", 0.0)
        assert s_end > s_start, "Operation end time must exceed start time"
        assert s_start >= prev_end - 0.001, "Precedence constraint violated: operation starts before prior finishes"
        prev_end = s_end

    # Step 13: Schedule/Plan is stored in MongoDB
    plan_doc = get_collection("planning_plans").find_one({"id": plan["id"]}, {"_id": 0})
    assert plan_doc is not None, f"Plan {plan['id']} was not persisted in planning_plans collection"

    # Step 14: Status becomes PENDING_SUPERVISOR_REVIEW
    assert plan_doc["status"] in ["PENDING_SUPERVISOR_REVIEW", "PENDING_SUPERVISOR_APPROVAL"]
    persisted_order = order_repo.get_by_id(order_id)
    assert persisted_order is not None
    assert persisted_order["status"] in ["PENDING_SUPERVISOR_REVIEW", "PENDING_SUPERVISOR_APPROVAL"]

    # =========================================================================
    # STEP 15: Login as Supervisor
    # =========================================================================
    sup_login = client.post("/api/v1/auth/login", json={
        "username": "supervisor",
        "password": "password123"
    })
    assert sup_login.status_code == 200
    sup_data = sup_login.get_json()["data"]
    sup_token = sup_data["access_token"]
    sup_headers = {"Authorization": f"Bearer {sup_token}"}
    assert sup_data["user"]["role"] == "SUPERVISOR"

    # =========================================================================
    # STEPS 16-22: Supervisor Opens Plans and Confirms AI Metrics
    # =========================================================================
    # Step 16: Open Production Plans
    plans_resp = client.get("/api/v1/orders/plans", headers=sup_headers)
    assert plans_resp.status_code == 200
    all_plans = plans_resp.get_json()["data"]

    # Step 17: Confirm generated plan is visible
    target_plan = next((p for p in all_plans if p["id"] == plan["id"]), None)
    assert target_plan is not None, f"Plan {plan['id']} not found in supervisor pending plans queue"

    # Step 18: Confirm ML prediction is visible
    first_op = target_plan["operations"][0]
    assert first_op.get("predicted_time_min") is not None

    # Step 19: Confirm machine allocation is visible
    for op in target_plan["operations"]:
        assert op.get("machine_id") or op.get("assigned_machine_id")

    # Step 20: Confirm predicted duration is visible
    assert target_plan.get("estimated_duration_hours") is not None
    assert target_plan["estimated_duration_hours"] > 0

    # Step 21: Confirm deadline impact/risk is visible
    assert target_plan.get("deadline_risk") in ["LOW", "MEDIUM", "HIGH", "Safe"]

    # Step 22: Confirm worker/material constraints are visible
    for op in target_plan["operations"]:
        assert "worker_name" in op or "worker_id" in op
        assert op.get("material_status") is not None

    # =========================================================================
    # STEPS 23-25: Supervisor Edits Allowed Field, Backend Validates & Recalculates
    # =========================================================================
    # Step 23: Supervisor edits an allowed field (re-allocates a compatible machine)
    modified_ops = list(target_plan["operations"])
    # If candidate machines exist for op 0, switch to second candidate if available
    cand_0 = modified_ops[0].get("candidates", [])
    if len(cand_0) > 1:
        new_cand_mach = cand_0[1]["machine_id"]
        modified_ops[0]["machine_id"] = new_cand_mach
        modified_ops[0]["assigned_machine_id"] = new_cand_mach

    # Step 24: Backend validates edit with OR-Tools constraint checker
    val_resp = client.post(f"/api/v1/orders/plan/{target_plan['id']}/validate", json={
        "operations": modified_ops
    }, headers=sup_headers)
    assert val_resp.status_code == 200
    val_json = val_resp.get_json()["data"]
    # Step 25: Validates that constraints are satisfied
    assert val_json.get("is_valid") is True, f"Plan validation failed: {val_json}"

    # =========================================================================
    # STEPS 26-27: Supervisor Approves -> Schedule Becomes ACTIVE
    # =========================================================================
    # Step 26: Supervisor approves
    approve_resp = client.post(f"/api/v1/orders/plan/{target_plan['id']}/approve", json={
        "operations": modified_ops,
        "notes": "Verified against shopfloor line 01 tooling and workforce roster."
    }, headers=sup_headers)
    assert approve_resp.status_code == 200
    appr_json = approve_resp.get_json()["data"]
    assert appr_json["approved"] is True
    assert appr_json["status"] == "APPROVED"

    # Step 27: Schedule becomes ACTIVE
    approved_order = order_repo.get_by_id(order_id)
    assert approved_order["status"] in ["ACTIVE", "QUEUED", "SCHEDULED"]
    active_sched = schedule_repo.get_active()
    assert active_sched is not None
    assert active_sched["status"] == "ACTIVE"

    # Verify operations stored in schedule_operations
    sched_ops = schedule_repo.get_operations(order_id=order_id)
    assert len(sched_ops) >= 10, f"Expected schedule_operations for {order_id}, found {len(sched_ops)}"

    # =========================================================================
    # STEP 28: Factory View Updates
    # =========================================================================
    mach_resp = client.get("/api/v1/machines", headers=mgr_headers)
    assert mach_resp.status_code == 200
    factory_machines = mach_resp.get_json()["data"]
    assert len(factory_machines) >= 15

    # =========================================================================
    # STEP 29: Gantt Updates with Real Data
    # =========================================================================
    gantt_resp = client.get(f"/api/v1/gantt/orders/{order_id}", headers=mgr_headers)
    assert gantt_resp.status_code == 200
    gantt_data = gantt_resp.get_json()["data"]
    assert gantt_data["order_id"] == order_id
    assert len(gantt_data["operations"]) == len(modified_ops)
