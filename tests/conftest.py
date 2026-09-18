import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from backend.app import create_app
from backend.config import Config
from backend.extensions import db
from backend.seed.seed_database import seed

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

@pytest.fixture(autouse=True)
def isolated_db():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        # Seed test data
        from backend.seed import seed_database
        # Run seed in this app context
        seed_database.db = db
        # Call seeding logic directly
        from backend.models import (
            User, Role, Lane, Process, Machine, MachineState, MachineCapability,
            Product, Material, Worker, WorkerSkill, Order, OrderOperation,
            OrderPriority, OrderState, Schedule
        )

        u_mgr = User(username="manager", email="mgr@test.com", full_name="Manager", role=Role.MANAGER.value)
        u_mgr.set_password("password123")
        u_sup = User(username="supervisor", email="sup@test.com", full_name="Supervisor", role=Role.SUPERVISOR.value)
        u_sup.set_password("password123")
        u_srv = User(username="service", email="srv@test.com", full_name="Service Person", role=Role.SERVICE_PERSON.value)
        u_srv.set_password("password123")
        db.session.add_all([u_mgr, u_sup, u_srv])

        # Lane & Processes
        l1 = Lane(id="L01", name="Lane 1", sequence=1)
        l2 = Lane(id="L02", name="Lane 2", sequence=2)
        l3 = Lane(id="L03", name="Lane 3", sequence=3)
        db.session.add_all([l1, l2, l3])

        p1 = Process(id="P01", name="Cutting", sequence_index=1)
        p2 = Process(id="P02", name="Forming", sequence_index=2)
        p3 = Process(id="P03", name="Machining", sequence_index=3)
        p4 = Process(id="P04", name="Finishing", sequence_index=4)
        p5 = Process(id="P05", name="Inspection", sequence_index=5)
        db.session.add_all([p1, p2, p3, p4, p5])

        # Machines
        m01 = Machine(id="M01", name="Machine 1", lane_id="L01", process_id="P01", status="RUNNING", precision_level="HIGH", hourly_rate=1200, svg_x=100, svg_y=100)
        m02 = Machine(id="M02", name="Machine 2", lane_id="L01", process_id="P02", status="RUNNING", precision_level="HIGH", hourly_rate=1200, svg_x=200, svg_y=100)
        m03 = Machine(id="M03", name="Machine 3", lane_id="L01", process_id="P03", status="RUNNING", precision_level="HIGH", hourly_rate=1200, svg_x=300, svg_y=100)
        m04 = Machine(id="M04", name="Machine 4", lane_id="L01", process_id="P04", status="RUNNING", precision_level="HIGH", hourly_rate=1200, svg_x=400, svg_y=100)
        m05 = Machine(id="M05", name="Machine 5", lane_id="L01", process_id="P05", status="AVAILABLE", precision_level="HIGH", hourly_rate=1200, svg_x=500, svg_y=100)
        m09 = Machine(id="M09", name="Machine 9", lane_id="L02", process_id="P04", status="AVAILABLE", precision_level="HIGH", hourly_rate=1200, svg_x=400, svg_y=200)
        m14 = Machine(id="M14", name="Machine 14", lane_id="L03", process_id="P04", status="AVAILABLE", precision_level="HIGH", hourly_rate=1200, svg_x=400, svg_y=300)
        db.session.add_all([m01, m02, m03, m04, m05, m09, m14])

        cap4_9 = MachineCapability(machine_id="M09", process_id="P04", precision_level="HIGH", setup_overhead_min=10)
        cap4_14 = MachineCapability(machine_id="M14", process_id="P04", precision_level="HIGH", setup_overhead_min=15)
        db.session.add_all([cap4_9, cap4_14])

        # Product & Order
        prd = Product(code="PRD-TURBINE-BLADE", name="Turbine Blade", required_precision="HIGH")
        db.session.add(prd)
        db.session.flush()

        order = Order(id="ORD-1042", product_id=prd.id, quantity=50, priority="URGENT", status="RUNNING", deadline_hours=12.0, assigned_lane_id="L01")
        db.session.add(order)
        db.session.flush()

        op1 = OrderOperation(order_id="ORD-1042", sequence=1, process_id="P01", assigned_machine_id="M01", status="COMPLETED", scheduled_start_min=0, scheduled_end_min=50, processing_time_min=50)
        op2 = OrderOperation(order_id="ORD-1042", sequence=2, process_id="P02", assigned_machine_id="M02", status="COMPLETED", scheduled_start_min=50, scheduled_end_min=100, processing_time_min=50)
        op3 = OrderOperation(order_id="ORD-1042", sequence=3, process_id="P03", assigned_machine_id="M03", status="COMPLETED", scheduled_start_min=100, scheduled_end_min=150, processing_time_min=50)
        op4 = OrderOperation(order_id="ORD-1042", sequence=4, process_id="P04", assigned_machine_id="M04", status="RUNNING", scheduled_start_min=150, scheduled_end_min=210, processing_time_min=60)
        op5 = OrderOperation(order_id="ORD-1042", sequence=5, process_id="P05", assigned_machine_id="M05", status="QUEUED", scheduled_start_min=210, scheduled_end_min=250, processing_time_min=40)
        db.session.add_all([op1, op2, op3, op4, op5])

        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()
