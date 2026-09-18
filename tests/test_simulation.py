import pytest
from backend.repositories.machine_repository import machine_repo
from backend.services.simulation_service import simulation_service

def test_what_if_simulation_does_not_mutate_state(app):
    initial_machine = machine_repo.get_by_id("CUT-02")
    initial_status = initial_machine["status"]

    # Run What-If simulation on CUT-02
    result = simulation_service.run_what_if(
        machine_id="CUT-02",
        failure_type="Mechanical Breakdown",
        duration_hours=6.0
    )

    assert result["simulation_mode"] == "WHAT_IF_SANDBOX"
    assert result["persisted"] is False
    assert "projected_recovery_options" in result

    # Verify machine state in MongoDB remains untouched
    post_machine = machine_repo.get_by_id("CUT-02")
    assert post_machine["status"] == initial_status, "Simulation mutated machine state in production database!"
