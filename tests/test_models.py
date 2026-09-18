import pytest
from backend.models.machine import Machine, MachineState
from backend.models.order import Order, OrderState

def test_machine_states(isolated_db):
    m = Machine.query.get("M01")
    assert m is not None
    assert m.status in [s.value for s in MachineState]

def test_order_ord1042_exists(isolated_db):
    order = Order.query.get("ORD-1042")
    assert order is not None
    assert order.priority == "URGENT"
    assert len(order.operations) == 5
    op4 = order.operations[3]
    assert op4.assigned_machine_id == "M04"
    assert op4.process_id == "P04"
