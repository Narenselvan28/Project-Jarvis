import pytest
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.maintenance_repository import maintenance_repo
from backend.repositories.user_repository import user_repo
from backend.services.disruption_service import disruption_service
from backend.services.maintenance_service import maintenance_service
from backend.services.scheduling_service import scheduling_service

def test_full_disruption_recovery_pipeline(app):
    manager = user_repo.get_by_username("manager") or {"id": "USR-MGR-01", "username": "manager", "role": "MANAGER"}
    service_user = user_repo.get_by_username("service") or {"id": "USR-SRV-01", "username": "service", "role": "SERVICE PERSON"}

    # Step 1: Trigger disruption on CUT-02
    res = disruption_service.simulate_disruption(
        machine_id="CUT-02",
        failure_type="Mechanical Breakdown",
        duration_hours=6.0,
        user=manager,
        auto_optimize=True
    )

    assert res["status"] == "completed"
    assert res["machine_id"] == "CUT-02"

    # Step 2: Verify CUT-02 is FAILED
    cut02 = machine_repo.get_by_id("CUT-02")
    assert cut02["status"] == "FAILED"

    # Step 3: Verify ORD-1042 was detected and reassigned
    ord1042 = order_repo.get_by_id("ORD-1042")
    assert ord1042 is not None

    # Step 4: Verify Maintenance Work Order was created
    wo = maintenance_repo.get_active_by_machine("CUT-02")
    assert wo is not None
    assert wo["status"] == "OPEN"

    # Step 5: Service Person accepts and completes repair
    wo = maintenance_service.update_work_order_status(
        work_order_id=wo["id"],
        new_status="IN_PROGRESS",
        notes="Diagnosed cutter servo motor overheating; cooling fan replaced.",
        assigned_to="service",
        user=service_user
    )
    assert wo["status"] == "IN_PROGRESS"
    cut02 = machine_repo.get_by_id("CUT-02")
    assert cut02["status"] == "MAINTENANCE"

    # Step 6: Mark REPAIRED then VERIFIED
    wo = maintenance_service.update_work_order_status(
        work_order_id=wo["id"],
        new_status="REPAIRED",
        notes="Motor tested under no-load condition.",
        user=service_user
    )
    cut02 = machine_repo.get_by_id("CUT-02")
    assert cut02["status"] == "REPAIRED"

    wo = maintenance_service.update_work_order_status(
        work_order_id=wo["id"],
        new_status="VERIFIED",
        notes="Test cut on sample denim pass 0.05mm precision. Certified operational.",
        user=service_user
    )
    cut02 = machine_repo.get_by_id("CUT-02")
    assert cut02["status"] == "AVAILABLE"

    # Step 7: Manager triggers Re-optimization
    reopt_res = scheduling_service.reoptimize_after_recovery()
    assert reopt_res["is_feasible"] is True
