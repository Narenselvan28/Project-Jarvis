import pytest
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.optimization.scheduler import production_scheduler
from backend.optimization.candidate_machine_selector import find_candidate_machines

def test_two_recovery_options_generation(app):
    machines = {m["id"]: m for m in machine_repo.get_all_machines()}
    affected_order = order_repo.get_by_id("ORD-1042")
    if not affected_order:
        orders = order_repo.get_all_orders()
        affected_order = orders[0] if orders else None
    assert affected_order is not None

    candidates_map = {
        "P03": find_candidate_machines("CUT-02", "P03", affected_order, {"sequence": 3, "process_id": "P03"})
    }

    result = production_scheduler.generate_two_recovery_options(
        failed_machine_id="CUT-02",
        failure_duration_hours=6.0,
        affected_orders=[affected_order],
        compatible_candidates_map=candidates_map,
        all_machines=machines
    )

    assert "option_a" in result
    assert "option_b" in result

    opt_a = result["option_a"]
    opt_b = result["option_b"]

    assert opt_a["strategy"] == "DEADLINE_PRIORITY"
    assert opt_b["strategy"] == "COST_MINIMIZATION"

    # Both options must be feasible
    assert opt_a["is_feasible"] is True
    assert opt_b["is_feasible"] is True

    # Option A protects deadline (lower or zero deadline impact), Option B lowers additional cost
    assert opt_a["deadline_impact_min"] <= opt_b["deadline_impact_min"]
    assert opt_b["additional_cost"] <= opt_a["additional_cost"]

def test_plan_validation_hard_constraints(app):
    valid_ops = [
        {"sequence": 1, "process_id": "P01", "machine_id": "FI-01", "scheduled_start_min": 0, "scheduled_end_min": 60},
        {"sequence": 2, "process_id": "P02", "machine_id": "SP-01", "scheduled_start_min": 65, "scheduled_end_min": 120}
    ]
    res = production_scheduler.validate_plan(valid_ops)
    assert res["is_valid"] is True

    # Test precedence violation: op 2 starts before op 1 finishes
    invalid_precedence_ops = [
        {"sequence": 1, "process_id": "P01", "machine_id": "FI-01", "scheduled_start_min": 0, "scheduled_end_min": 60},
        {"sequence": 2, "process_id": "P02", "machine_id": "SP-01", "scheduled_start_min": 30, "scheduled_end_min": 90}
    ]
    res_invalid = production_scheduler.validate_plan(invalid_precedence_ops)
    assert res_invalid["is_valid"] is False
    assert "Precedence violation" in res_invalid["violated_constraint"]

def test_baseline_dispatching_heuristics(app):
    orders = order_repo.get_all_orders()[:5]
    machines = {m["id"]: m for m in machine_repo.get_all_machines()}
    baselines = production_scheduler.compute_baseline_comparisons(orders, machines)

    for rule in ["FCFS", "SPT", "EDD", "WSPT"]:
        assert rule in baselines
        metrics = baselines[rule]
        assert "makespan_minutes" in metrics
        assert "total_tardiness_minutes" in metrics
        assert "total_cost" in metrics
        assert metrics["makespan_minutes"] > 0
