import pytest
from backend.models.machine import Machine, MachineState
from backend.models.order import Order, OrderOperation, OrderState
from backend.models.maintenance import MaintenanceWorkOrder, MaintenanceStatus
from backend.models.user import User
from backend.services.disruption_service import disruption_service
from backend.services.maintenance_service import maintenance_service
from backend.services.scheduling_service import scheduling_service

def test_full_disruption_recovery_pipeline(isolated_db):
    manager = User.query.filter_by(username="manager").first()
    service_user = User.query.filter_by(username="service").first()

    # Step 1: Trigger disruption on M04
    res = disruption_service.simulate_disruption(
        machine_id="M04",
        failure_type="Mechanical Breakdown",
        duration_hours=6.0,
        user=manager,
        auto_optimize=True
    )

    assert res["status"] == "completed"
    assert res["machine_id"] == "M04"

    # Step 2: Verify M04 is FAILED
    m04 = Machine.query.get("M04")
    assert m04.status == MachineState.FAILED.value

    # Step 3: Verify ORD-1042 was detected and reassigned
    ord1042 = Order.query.get("ORD-1042")
    assert ord1042 is not None
    op4 = ord1042.operations[3]
    assert op4.process_id == "P04"
    assert op4.assigned_machine_id in ["M09", "M14"]
    assert op4.original_machine_id == "M04"
    assert op4.status == OrderState.REASSIGNED.value

    # Step 4: Verify Maintenance Work Order was created
    wo = MaintenanceWorkOrder.query.filter_by(machine_id="M04").first()
    assert wo is not None
    assert wo.status == MaintenanceStatus.OPEN.value

    # Step 5: Service Person accepts and completes repair
    wo = maintenance_service.update_work_order_status(
        work_order_id=wo.id,
        new_status=MaintenanceStatus.IN_PROGRESS.value,
        notes="Diagnosed hydraulic pump seal failure; replacing valve cartridge.",
        assigned_to_id=service_user.id,
        user=service_user
    )
    assert wo.status == MaintenanceStatus.IN_PROGRESS.value
    assert m04.status == MachineState.MAINTENANCE.value

    # Step 6: Mark REPAIRED then VERIFIED
    wo = maintenance_service.update_work_order_status(
        work_order_id=wo.id,
        new_status=MaintenanceStatus.REPAIRED.value,
        notes="Component replaced; pressure tested at 250 bar.",
        user=service_user
    )
    assert m04.status == MachineState.REPAIRED.value

    wo = maintenance_service.update_work_order_status(
        work_order_id=wo.id,
        new_status=MaintenanceStatus.VERIFIED.value,
        notes="Metrology test piece completed with 0.002mm tolerance. Ready for production.",
        user=service_user
    )
    assert m04.status == MachineState.AVAILABLE.value

    # Step 7: Manager triggers Re-optimization
    reopt_res = scheduling_service.reoptimize_after_recovery()
    assert reopt_res["is_feasible"] is True
