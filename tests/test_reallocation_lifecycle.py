import pytest
from datetime import datetime, timedelta
from backend.domain.state_machine import (
    ProductionPlanState,
    RecoveryState,
    MachineState,
    MaintenanceState,
    StateTransitionService
)
from backend.exceptions.state_transition import InvalidStateTransitionError
from backend.services.disruption_service import disruption_service
from backend.repositories import (
    machine_repo,
    order_repo,
    schedule_repo,
    disruption_repo
)
from backend.database.mongo import get_collection

def test_invalid_state_transition(client, auth_headers):
    """
    PART 2 & 3: Verify strict state machine rejects illegal transitions
    with InvalidStateTransitionError and returns HTTP 409 CONFLICT.
    """
    # 1. State machine service rejects ACTIVE -> APPROVED
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        StateTransitionService.validate_transition(
            "ProductionPlanState",
            ProductionPlanState.ACTIVE.value,
            ProductionPlanState.SUPERVISOR_APPROVED.value,
            user_role="SUPERVISOR"
        )
    assert exc_info.value.current_state == "ACTIVE"
    assert exc_info.value.requested_state == "SUPERVISOR_APPROVED"

    # 2. Supervisor cannot perform MANAGER-only transition
    from backend.domain.errors import AuthorizationError
    with pytest.raises((InvalidStateTransitionError, AuthorizationError)):
        StateTransitionService.validate_transition(
            "RecoveryState",
            RecoveryState.PENDING_MANAGER_APPROVAL.value,
            RecoveryState.APPROVED.value,
            user_role="SUPERVISOR"
        )

    # 3. HTTP endpoint returns 409 Conflict when attempting illegal transition
    # Create a plan in COMPLETED state in planning_plans collection
    get_collection("planning_plans").insert_one({
        "id": "PLAN-TEST-COMPLETED",
        "order_id": "ORD-TEST-COMPLETED",
        "product_name": "Testing Polo",
        "status": "COMPLETED",
        "quantity": 1000
    })
    res = client.post(
        "/api/v1/orders/plan/PLAN-TEST-COMPLETED/approve",
        json={"operations": []},
        headers=auth_headers["supervisor"]
    )
    assert res.status_code == 409
    data = res.get_json()
    err = data.get("error", {})
    assert err.get("code") == "INVALID_STATE_TRANSITION"
    assert err.get("current_state") == "COMPLETED"

def test_failed_machine_not_candidate(app):
    """
    PART 4 & 5: Ensure candidate machine discovery excludes FAILED machines.
    """
    with app.app_context():
        # Mark CUT-02 as FAILED
        machine_repo.update_status("CUT-02", "FAILED")
        failed_mach = machine_repo.get_by_id("CUT-02")
        assert failed_mach["status"] == "FAILED"

        candidates = disruption_service.discover_candidate_machines(
            failed_machine_id="CUT-02",
            process_id="CUT"
        )
        candidate_ids = [c["id"] for c in candidates]

        # CUT-02 must NOT be in candidates
        assert "CUT-02" not in candidate_ids
        # Other compatible cutting machines should be present
        assert len(candidate_ids) > 0
        for c in candidates:
            assert c["status"] not in ["FAILED", "MAINTENANCE", "BLOCKED"]

def test_machine_capability_filter(app):
    """
    PART 5: Ensure candidate machine satisfies process compatibility.
    """
    with app.app_context():
        candidates = disruption_service.discover_candidate_machines(
            failed_machine_id="CUT-02",
            process_id="CUT"
        )
        for c in candidates:
            proc = c.get("process") or c.get("process_name") or c.get("name") or c.get("id") or ""
            assert "CUT" in proc.upper() or "CUT" in c.get("id", "").upper()

def test_candidate_machine_availability(app):
    """
    PART 5: Exclude MAINTENANCE and BLOCKED machines from candidates.
    """
    with app.app_context():
        # Set CUT-03 to MAINTENANCE
        machine_repo.update_status("CUT-03", "MAINTENANCE")
        candidates = disruption_service.discover_candidate_machines(
            failed_machine_id="CUT-02",
            process_id="CUT"
        )
        candidate_ids = [c["id"] for c in candidates]
        assert "CUT-03" not in candidate_ids
        # Restore CUT-03
        machine_repo.update_status("CUT-03", "AVAILABLE")

def test_ml_prediction_used_by_optimizer(app):
    """
    PART 6 & 7: Verify ML prediction runs for candidates and results are stored.
    """
    with app.app_context():
        # Trigger disruption simulation for CUT-02
        res = disruption_service.simulate_machine_failure(
            machine_id="CUT-02",
            failure_type="MECHANICAL_FAILURE",
            duration_hours=6.0,
            reason="Test ML participation"
        )
        assert res is not None
        opt_a = res.get("option_a")
        assert opt_a is not None
        assert opt_a.get("predicted_processing_min", 0) > 0

        # Check ML prediction audit records
        preds = list(get_collection("ml_predictions").find({"machine_id": opt_a.get("machine")}))
        assert len(preds) > 0
        assert preds[0]["predicted_processing_time"] > 0

def test_operation_precedence(app):
    """
    PART 8: Recalculate downstream operations so next_op.start >= prev_op.end.
    """
    with app.app_context():
        disr = disruption_service.simulate_machine_failure(
            machine_id="CUT-02",
            failure_type="MECHANICAL_FAILURE",
            duration_hours=6.0
        )
        opt_a = disr.get("option_a")
        ops = opt_a.get("operations", [])
        assert len(ops) > 0

        # Verify strict sequence precedence
        sorted_ops = sorted(ops, key=lambda x: x.get("sequence", 0))
        for i in range(len(sorted_ops) - 1):
            curr_op = sorted_ops[i]
            next_op = sorted_ops[i + 1]
            curr_end = curr_op.get("scheduled_end_min", 0)
            next_start = next_op.get("scheduled_start_min", 0)
            assert next_start >= curr_end, f"Precedence violated between seq {curr_op['sequence']} and {next_op['sequence']}"

def test_machine_no_overlap(app):
    """
    PART 7: Verify OR-Tools enforces NoOverlap on candidate machines.
    """
    with app.app_context():
        active_sched = schedule_repo.get_active()
        assert active_sched is not None
        ops = schedule_repo.get_operations(schedule_id=active_sched["id"])
        
        # Group by machine
        by_mach = {}
        for op in ops:
            m_id = op.get("machine_id") or op.get("assigned_machine_id")
            if m_id:
                by_mach.setdefault(m_id, []).append(op)

        for m_id, m_ops in by_mach.items():
            sorted_m = sorted(m_ops, key=lambda x: x.get("scheduled_start_min", 0))
            for i in range(len(sorted_m) - 1):
                assert sorted_m[i]["scheduled_end_min"] <= sorted_m[i + 1]["scheduled_start_min"], \
                    f"Overlap detected on machine {m_id}"

def test_worker_availability(app):
    """
    PART 5 & 11: Worker availability is verified on candidate evaluation.
    """
    with app.app_context():
        evals = disruption_service.evaluate_candidate_suitability(
            candidates=list(get_collection("machines").find({"process": "Cutting"}, {"_id": 0})),
            affected_op={"process_id": "CUT", "quantity": 1000},
            order={"id": "ORD-1042", "deadline_hours": 18.0}
        )
        assert len(evals) > 0
        for ev in evals:
            assert ev["worker_available"] is True

def test_material_availability(app):
    """
    PART 5 & 11: Material availability is verified on candidate evaluation.
    """
    with app.app_context():
        evals = disruption_service.evaluate_candidate_suitability(
            candidates=list(get_collection("machines").find({"process": "Cutting"}, {"_id": 0})),
            affected_op={"process_id": "CUT", "quantity": 1000},
            order={"id": "ORD-1042", "deadline_hours": 18.0}
        )
        assert len(evals) > 0
        for ev in evals:
            assert ev["material_available"] is True

def test_recovery_option_a_feasible(app):
    """
    PART 10 & 11: Option A emphasizes deadline adherence and is feasible.
    """
    with app.app_context():
        disr = disruption_service.simulate_machine_failure(
            machine_id="CUT-02",
            failure_type="MECHANICAL_FAILURE",
            duration_hours=6.0
        )
        opt_a = disr.get("option_a")
        assert opt_a is not None
        assert opt_a.get("status") == "PENDING_APPROVAL"
        assert opt_a.get("machine") != "CUT-02"
        assert opt_a.get("is_feasible") is True
        assert opt_a.get("deadline_impact_min") is not None

def test_recovery_option_b_feasible(app):
    """
    PART 10 & 11: Option B emphasizes cost/stability and is feasible.
    """
    with app.app_context():
        disr = disruption_service.simulate_machine_failure(
            machine_id="CUT-02",
            failure_type="MECHANICAL_FAILURE",
            duration_hours=6.0
        )
        opt_b = disr.get("option_b")
        assert opt_b is not None
        assert opt_b.get("status") == "PENDING_APPROVAL"
        assert opt_b.get("machine") != "CUT-02"
        assert opt_b.get("is_feasible") is True

def test_recovery_does_not_activate_on_selection(client, auth_headers):
    """
    PART 13: Merely viewing/selecting Option A or B must NOT activate it.
    """
    # 1. Trigger failure
    res = client.post(
        "/api/v1/manager/simulate-disruption",
        json={"machine_id": "CUT-02", "failure_type": "MECHANICAL_FAILURE", "duration_hours": 6.0},
        headers=auth_headers["manager"]
    )
    disr_id = res.get_json()["data"]["disruption_id"]

    # 2. View/select details via GET /api/v1/recovery/:id
    res2 = client.get(f"/api/v1/recovery/{disr_id}", headers=auth_headers["manager"])
    assert res2.status_code == 200
    data = res2.get_json()["data"]
    assert data["status"] in ["DETECTED", "PENDING_MANAGER_APPROVAL"]

    # Active schedule must still be version 1 (not activated yet!)
    active_sched = schedule_repo.get_active()
    assert active_sched is not None
    assert active_sched.get("version", 1) == 1

def test_manager_approval_confirmation(client, auth_headers):
    """
    PART 13 & 14: Manager approval requires confirmation and commits transaction.
    """
    res = client.post(
        "/api/v1/manager/simulate-disruption",
        json={"machine_id": "CUT-02", "failure_type": "MECHANICAL_FAILURE", "duration_hours": 6.0},
        headers=auth_headers["manager"]
    )
    disr_id = res.get_json()["data"]["disruption_id"]

    # Confirm approval for OPTION_A
    appr_res = client.post(
        f"/api/v1/recovery/{disr_id}/approve",
        json={
            "option_id": "OPTION_A",
            "approved_by": "manager",
            "approval_role": "MANAGER",
            "approval_notes": "Confirmed recovery allocation"
        },
        headers=auth_headers["manager"]
    )
    assert appr_res.status_code == 200
    data = appr_res.get_json()["data"]
    assert data["recovery_state"] == "APPROVED"
    assert data["schedule_version"] == 2

def _approve_recovery_helper(client, auth_headers):
    res = client.post(
        "/api/v1/manager/simulate-disruption",
        json={"machine_id": "CUT-02", "failure_type": "MECHANICAL_FAILURE", "duration_hours": 6.0},
        headers=auth_headers["manager"]
    )
    disr_id = res.get_json()["data"]["disruption_id"]
    client.post(
        f"/api/v1/recovery/{disr_id}/approve",
        json={
            "option_id": "OPTION_A",
            "approved_by": "manager",
            "approval_role": "MANAGER",
            "approval_notes": "Confirmed recovery allocation"
        },
        headers=auth_headers["manager"]
    )
    return disr_id

def test_schedule_version_created(client, auth_headers):
    """
    PART 12 & 14: Approved recovery creates new schedule version (Version 2) with status ACTIVE.
    """
    _approve_recovery_helper(client, auth_headers)
    active_sched = schedule_repo.get_active()
    assert active_sched is not None
    assert active_sched.get("version") == 2
    assert active_sched.get("status") == "ACTIVE"

    # Previous version 1 should be SUPERSEDED
    v1 = schedule_repo.get_by_id("SCHED-V1")
    if v1:
        assert v1.get("status") == "SUPERSEDED"

def test_factory_matches_active_schedule(client, auth_headers):
    """
    PART 15, 16, 24: Factory Floor reflects the new active schedule (Version 2).
    """
    _approve_recovery_helper(client, auth_headers)
    res = client.get("/api/v1/factory", headers=auth_headers["manager"])
    assert res.status_code == 200
    data = res.get_json()["data"]

    # Active schedule is Version 2
    assert data["active_schedule"]["version"] == 2
    assert data["active_schedule"]["status"] == "ACTIVE"

    # Order routes are ordered sequentially
    routes = data.get("order_routes", {})
    assert len(routes) > 0
    for ord_id, ops in routes.items():
        for i in range(len(ops) - 1):
            assert ops[i]["sequence"] <= ops[i + 1]["sequence"]

def test_gantt_matches_active_schedule(client, auth_headers):
    """
    PART 24: Gantt chart reads the exact same active schedule version (Version 2).
    """
    _approve_recovery_helper(client, auth_headers)
    res = client.get("/api/v1/gantt/orders/ORD-1042", headers=auth_headers["manager"])
    assert res.status_code == 200
    data = res.get_json()["data"]

    # Version matches factory and active schedule version
    assert data.get("schedule_version") == 2

def test_machine_repair_restores_availability(app):
    """
    PART 3: Machine transition through MAINTENANCE -> REPAIRED -> VERIFIED -> AVAILABLE restores health.
    """
    with app.app_context():
        machine_repo.update_status("CUT-02", "MAINTENANCE")
        m = machine_repo.get_by_id("CUT-02")
        assert m["status"] == "MAINTENANCE"

        # Repair
        StateTransitionService.validate_transition(
            "MachineState",
            MachineState.MAINTENANCE.value,
            MachineState.REPAIRED.value,
            user_role="SERVICE_PERSON"
        )
        machine_repo.update_status("CUT-02", "REPAIRED")

        # Verify
        StateTransitionService.validate_transition(
            "MachineState",
            MachineState.REPAIRED.value,
            MachineState.VERIFIED.value,
            user_role="SERVICE_PERSON"
        )
        machine_repo.update_status("CUT-02", "VERIFIED")

        # Restore to AVAILABLE
        StateTransitionService.validate_transition(
            "MachineState",
            MachineState.VERIFIED.value,
            MachineState.AVAILABLE.value,
            user_role="MANAGER"
        )
        machine_repo.update_status("CUT-02", "AVAILABLE")

        restored = machine_repo.get_by_id("CUT-02")
        assert restored["status"] == "AVAILABLE"
