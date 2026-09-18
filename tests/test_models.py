import pytest
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.domain.machine_state import MachineState

def test_machine_states(app):
    machines = machine_repo.get_all_machines()
    assert len(machines) >= 50
    valid_states = {s.value for s in MachineState}
    for m in machines:
        assert m["status"] in valid_states

def test_order_ord1042_exists(app):
    order = order_repo.get_by_id("ORD-1042")
    assert order is not None
    assert order["priority"] == "URGENT"
    assert len(order.get("operations", [])) >= 5
