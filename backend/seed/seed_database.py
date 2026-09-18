import os
import sys
from datetime import datetime

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.extensions import db
from backend.models import (
    User, Role, Lane, Process, Machine, MachineState, MachineCapability,
    Product, Material, Worker, WorkerSkill, Order, OrderOperation,
    OrderPriority, OrderState, Schedule
)

def seed():
    app = create_app()
    with app.app_context():
        print("[Seed] Resetting and seeding database with realistic factory demonstration data...")
        db.drop_all()
        db.create_all()

        # 1. Seed Users (Roles: MANAGER, SUPERVISOR, SERVICE_PERSON)
        users = [
            User(username="manager", email="manager@antigravity.io", full_name="Elena Vance (Plant Director)", role=Role.MANAGER.value),
            User(username="supervisor", email="supervisor@antigravity.io", full_name="Marcus Vance (Shift Lead)", role=Role.SUPERVISOR.value),
            User(username="service", email="service@antigravity.io", full_name="Viktor Stone (Senior Technician)", role=Role.SERVICE_PERSON.value)
        ]
        for u in users:
            u.set_password("password123")
            db.session.add(u)
        db.session.flush()

        # 2. Seed 3 Lanes
        lanes = [
            Lane(id="L01", name="Lane 01 - Heavy Aero Components", sequence=1, description="Dedicated aerospace titanium & superalloy flow"),
            Lane(id="L02", name="Lane 02 - Automotive Precision", sequence=2, description="High-throughput flexible automotive machining"),
            Lane(id="L03", name="Lane 03 - Multi-Axis Rapid Cell", sequence=3, description="Adaptive cellular flow with modular interchangeability")
        ]
        for l in lanes:
            db.session.add(l)
        db.session.flush()

        # 3. Seed 5 Sequential Processes
        processes = [
            Process(id="P01", name="Cutting & Blanking", sequence_index=1, standard_duration_minutes=45.0, description="Laser / waterjet stock sizing"),
            Process(id="P02", name="Hydraulic Forming", sequence_index=2, standard_duration_minutes=55.0, description="Hot isostatic pressing & stamping"),
            Process(id="P03", name="5-Axis CNC Machining", sequence_index=3, standard_duration_minutes=75.0, description="Precision contour milling & turning"),
            Process(id="P04", name="Surface Finishing", sequence_index=4, standard_duration_minutes=65.0, description="Electropolishing, deburring & coating"),
            Process(id="P05", name="CMM Coordinate Inspection", sequence_index=5, standard_duration_minutes=40.0, description="Laser optical and touch-probe metrology")
        ]
        for p in processes:
            db.session.add(p)
        db.session.flush()

        # 4. Seed 20+ Workers with Skills
        worker_names = [
            ("Vikram Rao", "SHIFT_1", 8.5), ("Aarav Patel", "SHIFT_1", 5.0), ("Neha Sharma", "SHIFT_1", 6.2),
            ("Devika Nair", "SHIFT_1", 4.0), ("Karan Mehta", "SHIFT_1", 7.1), ("Pooja Joshi", "SHIFT_1", 3.5),
            ("Rohan Das", "SHIFT_1", 9.0), ("Ananya Sen", "SHIFT_1", 4.5), ("Sanjay Dutt", "SHIFT_2", 6.0),
            ("Gita Pillai", "SHIFT_2", 5.5), ("Amit Saxena", "SHIFT_2", 4.8), ("Preeti Roy", "SHIFT_2", 3.0),
            ("Kavita Rao", "SHIFT_2", 7.2), ("Manoj Bajpai", "SHIFT_2", 8.0), ("Sunil Varma", "SHIFT_2", 5.0),
            ("Deepa Menon", "SHIFT_2", 4.2), ("Rajesh Khanna", "SHIFT_3", 6.5), ("Tanvi Sethi", "SHIFT_3", 3.8),
            ("Harish Iyer", "SHIFT_3", 5.9), ("Meera Kumar", "SHIFT_3", 7.5), ("Arjun Kapoor", "SHIFT_3", 4.1)
        ]
        workers = []
        for i, (wname, wshift, wexp) in enumerate(worker_names, 1):
            w = Worker(
                name=wname,
                employee_code=f"EMP-{i:03d}",
                shift=wshift,
                is_available=True,
                hourly_rate=320.0 + (wexp * 25.0),
                experience_years=wexp
            )
            db.session.add(w)
            workers.append(w)
        db.session.flush()

        # Assign skills to workers
        for i, w in enumerate(workers):
            # Each worker has 2-3 proficient processes
            proc_idxs = [((i + k) % 5) + 1 for k in range(3)]
            for p_idx in proc_idxs:
                ws = WorkerSkill(
                    worker_id=w.id,
                    process_id=f"P0{p_idx}",
                    skill_level=4 if p_idx == 4 else 3
                )
                db.session.add(ws)
        db.session.flush()

        # 5. Seed Materials
        materials = [
            Material(code="MAT-ALU-6061", name="Aerospace Aluminum 6061-T6", unit="KG", stock_quantity=1850.0, reorder_level=300.0, cost_per_unit=380.0),
            Material(code="MAT-STEEL-316", name="Marine Grade Stainless Steel 316L", unit="KG", stock_quantity=2400.0, reorder_level=500.0, cost_per_unit=280.0),
            Material(code="MAT-TITANIUM-GR5", name="Titanium Ti-6Al-4V Grade 5", unit="KG", stock_quantity=920.0, reorder_level=150.0, cost_per_unit=1650.0),
            Material(code="MAT-INCONEL-718", name="Nickel Superalloy Inconel 718", unit="KG", stock_quantity=640.0, reorder_level=100.0, cost_per_unit=2200.0),
            Material(code="MAT-BRASS-C360", name="High Machinability Brass C360", unit="KG", stock_quantity=1200.0, reorder_level=200.0, cost_per_unit=420.0)
        ]
        for m in materials:
            db.session.add(m)
        db.session.flush()

        # 6. Seed 10 Products
        products = [
            Product(code="PRD-TURBINE-BLADE", name="High-Pressure Turbine Rotor Blade", required_precision="HIGH", material_code="MAT-TITANIUM-GR5", material_qty_per_unit=1.8, standard_batch_size=50),
            Product(code="PRD-HYDRAULIC-VALVE", name="Proportional Hydraulic Spool Valve", required_precision="HIGH", material_code="MAT-STEEL-316", material_qty_per_unit=2.4, standard_batch_size=80),
            Product(code="PRD-TRANSMISSION-GEAR", name="Helical Planetary Sun Gear", required_precision="MEDIUM", material_code="MAT-STEEL-316", material_qty_per_unit=3.2, standard_batch_size=100),
            Product(code="PRD-COMPRESSOR-SHAFT", name="Gas Compressor Stepped Shaft", required_precision="HIGH", material_code="MAT-INCONEL-718", material_qty_per_unit=4.5, standard_batch_size=40),
            Product(code="PRD-INJECTOR-NOZZLE", name="Fuel Direct Injector Micro-Nozzle", required_precision="HIGH", material_code="MAT-STEEL-316", material_qty_per_unit=0.8, standard_batch_size=200),
            Product(code="PRD-PRECISION-BEARING", name="Angular Contact Ceramic Hybrid Bearing", required_precision="HIGH", material_code="MAT-STEEL-316", material_qty_per_unit=1.2, standard_batch_size=120),
            Product(code="PRD-ROTOR-ASSEMBLY", name="Induction Motor Balanced Rotor", required_precision="MEDIUM", material_code="MAT-ALU-6061", material_qty_per_unit=5.0, standard_batch_size=60),
            Product(code="PRD-ELECTRONIC-HOUSING", name="Avionics EMI-Shielded Chassis", required_precision="MEDIUM", material_code="MAT-ALU-6061", material_qty_per_unit=3.8, standard_batch_size=75),
            Product(code="PRD-ACTUATOR-CYLINDER", name="Pneumatic Dual-Stroke Ram Cylinder", required_precision="MEDIUM", material_code="MAT-ALU-6061", material_qty_per_unit=2.8, standard_batch_size=90),
            Product(code="PRD-FASTENER-CLUSTER", name="Titanium High-Torque Airframe Bolts", required_precision="HIGH", material_code="MAT-TITANIUM-GR5", material_qty_per_unit=0.4, standard_batch_size=500)
        ]
        for prd in products:
            db.session.add(prd)
        db.session.flush()

        # 7. Seed 15 Machines (5 machines per lane, with dynamic SVG 2D coordinates)
        # Note the slight natural curve in coordinates to create an organic, beautiful factory flow
        machine_specs = [
            # Lane 1 (Heavy Aero)
            ("M01", "Laser Profiler Alpha", "L01", "P01", "RUNNING", "HIGH", 1400.0, 48.0, 15.0, 140, 150, 78.0, 64.0, 1.8, 1, 0.12, 1),
            ("M02", "Hydro-Form Press 1000T", "L01", "P02", "RUNNING", "HIGH", 1600.0, 58.0, 20.0, 340, 120, 82.0, 68.5, 2.2, 2, 0.18, 2),
            ("M03", "5-Axis Gantry Mill 01", "L01", "P03", "RUNNING", "HIGH", 1850.0, 72.0, 25.0, 540, 175, 85.0, 72.0, 2.7, 3, 0.22, 3),
            ("M04", "Surface Finisher Aero-A", "L01", "P04", "RUNNING", "HIGH", 1350.0, 62.0, 15.0, 740, 135, 91.0, 86.4, 4.8, 5, 0.82, 4), # Demonstration failure machine!
            ("M05", "Zeiss Metrotom CMM 01", "L01", "P05", "AVAILABLE", "HIGH", 1100.0, 38.0, 10.0, 940, 160, 65.0, 24.0, 0.9, 0, 0.05, 5),

            # Lane 2 (Automotive Precision)
            ("M06", "Fiber Laser Cutter Beta", "L02", "P01", "RUNNING", "MEDIUM", 1150.0, 44.0, 12.0, 140, 340, 75.0, 60.0, 1.5, 1, 0.09, 6),
            ("M07", "Servo Crank Press 600T", "L02", "P02", "AVAILABLE", "MEDIUM", 1300.0, 52.0, 15.0, 340, 380, 62.0, 62.0, 1.9, 1, 0.14, 7),
            ("M08", "Horizontal CNC Cell 02", "L02", "P03", "RUNNING", "MEDIUM", 1550.0, 68.0, 18.0, 540, 330, 80.0, 69.0, 2.4, 2, 0.19, 8),
            ("M09", "Surface Finisher Auto-B", "L02", "P04", "AVAILABLE", "HIGH", 1200.0, 71.0, 10.0, 740, 375, 58.0, 63.5, 1.6, 1, 0.16, 8), # Prime candidate!
            ("M10", "Optical Scanner Cell 02", "L02", "P05", "RUNNING", "MEDIUM", 950.0, 35.0, 8.0, 940, 335, 70.0, 23.5, 0.8, 0, 0.06, 9),

            # Lane 3 (Rapid Flexible Line)
            ("M11", "Micro-Waterjet Flex-C", "L03", "P01", "IDLE", "HIGH", 1300.0, 46.0, 10.0, 140, 530, 50.0, 58.0, 1.4, 0, 0.08, 10),
            ("M12", "Cold Chamber Diecaster", "L03", "P02", "RUNNING", "MEDIUM", 1450.0, 60.0, 25.0, 340, 495, 76.0, 70.0, 2.5, 2, 0.24, 11),
            ("M13", "Multi-Spindle Mill 03", "L03", "P03", "RUNNING", "HIGH", 1750.0, 70.0, 20.0, 540, 550, 84.0, 74.0, 2.8, 3, 0.28, 12),
            ("M14", "Surface Finisher Flex-C", "L03", "P04", "AVAILABLE", "HIGH", 1350.0, 65.0, 20.0, 740, 510, 54.0, 61.2, 1.7, 1, 0.15, 13), # Secondary alternative!
            ("M15", "Laser Metrology Arm 03", "L03", "P05", "AVAILABLE", "HIGH", 1050.0, 40.0, 10.0, 940, 545, 60.0, 22.0, 0.7, 0, 0.04, 14)
        ]

        machines = []
        for m_id, m_name, l_id, p_id, status, prec, rate, b_time, setup, sx, sy, util, temp, vib, prev_f, f_risk, w_idx in machine_specs:
            m = Machine(
                id=m_id,
                name=m_name,
                lane_id=l_id,
                process_id=p_id,
                status=status,
                precision_level=prec,
                hourly_rate=rate,
                base_cycle_time=b_time,
                setup_time_min=setup,
                svg_x=float(sx),
                svg_y=float(sy),
                current_utilization=util,
                temperature=temp,
                vibration=vib,
                previous_failures=prev_f,
                maintenance_gap_days=45 if m_id != "M04" else 75,
                failure_risk=f_risk,
                current_worker_id=workers[w_idx - 1].id if w_idx <= len(workers) else None
            )
            db.session.add(m)
            machines.append(m)
        db.session.flush()

        # Add cross-lane capabilities for Finishing (Process 4) so M04, M09, M14 can interchange
        finishing_caps = [
            ("M04", "P04", "HIGH", 15.0),
            ("M09", "P04", "HIGH", 10.0), # Capable of finishing high precision with 10 min setup
            ("M14", "P04", "HIGH", 20.0)  # Capable of finishing high precision with 20 min setup
        ]
        for mid, pid, prec, overhead in finishing_caps:
            cap = MachineCapability(machine_id=mid, process_id=pid, precision_level=prec, setup_overhead_min=overhead)
            db.session.add(cap)
        db.session.flush()

        # 8. Seed Orders (including the guaranteed demonstration order ORD-1042)
        # ORD-1042: URGENT, 12h deadline, Product: PRD-TURBINE-BLADE, assigned to Lane 1
        demo_order = Order(
            id="ORD-1042",
            product_id=products[0].id,
            quantity=50,
            priority=OrderPriority.URGENT.value,
            status=OrderState.RUNNING.value,
            deadline_hours=12.0,
            assigned_lane_id="L01"
        )
        db.session.add(demo_order)
        db.session.flush()

        # Route for ORD-1042: M01 -> M02 -> M03 -> M04 -> M05
        # M01, M02, M03 are completed, M04 is actively RUNNING!
        demo_ops = [
            OrderOperation(order_id=demo_order.id, sequence=1, process_id="P01", assigned_machine_id="M01", status="COMPLETED", scheduled_start_min=0, scheduled_end_min=48, processing_time_min=48, progress_percentage=100.0),
            OrderOperation(order_id=demo_order.id, sequence=2, process_id="P02", assigned_machine_id="M02", status="COMPLETED", scheduled_start_min=48, scheduled_end_min=106, processing_time_min=58, progress_percentage=100.0),
            OrderOperation(order_id=demo_order.id, sequence=3, process_id="P03", assigned_machine_id="M03", status="COMPLETED", scheduled_start_min=106, scheduled_end_min=178, processing_time_min=72, progress_percentage=100.0),
            OrderOperation(order_id=demo_order.id, sequence=4, process_id="P04", assigned_machine_id="M04", status="RUNNING", scheduled_start_min=178, scheduled_end_min=240, processing_time_min=62, progress_percentage=45.0),
            OrderOperation(order_id=demo_order.id, sequence=5, process_id="P05", assigned_machine_id="M05", status="QUEUED", scheduled_start_min=240, scheduled_end_min=278, processing_time_min=38, progress_percentage=0.0)
        ]
        for op in demo_ops:
            db.session.add(op)

        # Link M04's current order to ORD-1042
        m04 = Machine.query.get("M04")
        if m04:
            m04.current_order_id = demo_order.id

        # Seed 30 additional realistic factory orders
        other_orders_config = [
            ("ORD-1043", products[1], 80, OrderPriority.HIGH, "L02", 18.0, ["M06", "M07", "M08", "M09", "M10"]),
            ("ORD-1044", products[2], 100, OrderPriority.MEDIUM, "L02", 24.0, ["M06", "M07", "M08", "M09", "M10"]),
            ("ORD-1045", products[3], 40, OrderPriority.HIGH, "L03", 20.0, ["M11", "M12", "M13", "M14", "M15"]),
            ("ORD-1046", products[4], 150, OrderPriority.URGENT, "L01", 14.0, ["M01", "M02", "M03", "M04", "M05"]),
            ("ORD-1047", products[5], 60, OrderPriority.LOW, "L03", 36.0, ["M11", "M12", "M13", "M14", "M15"]),
            ("ORD-1048", products[6], 75, OrderPriority.MEDIUM, "L02", 28.0, ["M06", "M07", "M08", "M09", "M10"]),
            ("ORD-1049", products[7], 50, OrderPriority.HIGH, "L01", 16.0, ["M01", "M02", "M03", "M04", "M05"]),
            ("ORD-1050", products[8], 90, OrderPriority.LOW, "L03", 42.0, ["M11", "M12", "M13", "M14", "M15"]),
        ]

        # Generate 22 more programmatically to reach 30+ orders
        for idx in range(1051, 1073):
            prd = products[idx % len(products)]
            prio = OrderPriority.URGENT if idx % 7 == 0 else (OrderPriority.HIGH if idx % 3 == 0 else OrderPriority.MEDIUM)
            lane_id = f"L0{(idx % 3) + 1}"
            m_list = [f"M{((int(lane_id[-1]) - 1) * 5 + k):02d}" for k in range(1, 6)]
            other_orders_config.append((f"ORD-{idx}", prd, 50 + (idx % 5) * 15, prio, lane_id, 24.0 + (idx % 12) * 2, m_list))

        for o_id, prd, qty, prio, lane_id, deadline, m_seq in other_orders_config:
            ord_obj = Order(
                id=o_id,
                product_id=prd.id,
                quantity=qty,
                priority=prio.value if hasattr(prio, 'value') else prio,
                status=OrderState.QUEUED.value,
                deadline_hours=deadline,
                assigned_lane_id=lane_id
            )
            db.session.add(ord_obj)
            db.session.flush()

            base_time = (int(o_id.split("-")[1]) - 1040) * 25.0
            for seq_num, m_id in enumerate(m_seq, 1):
                p_id = f"P0{seq_num}"
                dur = 45.0 + (seq_num * 6.0)
                op = OrderOperation(
                    order_id=ord_obj.id,
                    sequence=seq_num,
                    process_id=p_id,
                    assigned_machine_id=m_id,
                    status=OrderState.QUEUED.value,
                    scheduled_start_min=base_time + (seq_num - 1) * 50.0,
                    scheduled_end_min=base_time + seq_num * 50.0,
                    processing_time_min=dur,
                    progress_percentage=0.0
                )
                db.session.add(op)

        # 9. Seed Active Schedule
        active_sched = Schedule(
            name="Baseline Production Schedule - Day Shift Alpha",
            schedule_type="ADAPTIVE_CP_SAT",
            is_active=True,
            makespan_minutes=780.0,
            total_tardiness_minutes=15.0,
            late_orders_count=1,
            total_production_cost=84500.0,
            average_utilization=78.4,
            schedule_changes_count=0,
            stability_score=100.0,
            solver_status="OPTIMAL",
            solve_time_ms=145.2
        )
        db.session.add(active_sched)

        db.session.commit()
        print("[Seed] Successfully populated database with:")
        print(f"       - 3 Users (manager, supervisor, service)")
        print(f"       - 3 Lanes, 5 Processes, 15 Machines")
        print(f"       - {len(workers)} Workers, {len(materials)} Materials, {len(products)} Products")
        print(f"       - {len(other_orders_config) + 1} Orders (including guaranteed ORD-1042 on M04)")
        print(f"       - Active baseline production schedule")

if __name__ == "__main__":
    seed()
