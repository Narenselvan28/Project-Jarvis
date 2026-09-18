import os
import sys
import random
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database.mongo import mongo_manager, get_collection

def seed_mongo():
    print("[Seed] Connecting to MongoDB and resetting collections...")
    mongo_manager.reset_database()
    db = mongo_manager.get_db()

    # 1. Seed Users (Roles: MANAGER, SUPERVISOR, SERVICE_PERSON)
    users = [
        {
            "id": "USR-MGR-01",
            "username": "manager",
            "password_hash": generate_password_hash("password123"),
            "role": "MANAGER",
            "email": "manager@jarvis-factory.com",
            "full_name": "Elena Vance (Plant Director)",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": "USR-SUP-01",
            "username": "supervisor",
            "password_hash": generate_password_hash("password123"),
            "role": "SUPERVISOR",
            "email": "supervisor@jarvis-factory.com",
            "full_name": "Marcus Vance (Shift Lead)",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": "USR-SRV-01",
            "username": "service",
            "password_hash": generate_password_hash("password123"),
            "role": "SERVICE_PERSON",
            "email": "service@jarvis-factory.com",
            "full_name": "Viktor Stone (Senior Technician)",
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    db.users.insert_many(users)
    print(f"[Seed] Created {len(users)} operational users.")

    # 2. Seed Lanes
    lanes = [
        {"id": "L01", "name": "Lane 01 - High Speed Jersey Flow", "sequence": 1, "description": "Rapid automated cut-sew line for activewear"},
        {"id": "L02", "name": "Lane 02 - Structured Wovens & Blends", "sequence": 2, "description": "High precision line with integrated detailing"},
        {"id": "L03", "name": "Lane 03 - Modular Rapid Response Cell", "sequence": 3, "description": "Flexible batch cell with modular sewing workstations"}
    ]
    db.lanes.insert_many(lanes)

    # 3. Seed 13 Sequential Apparel Processes
    processes = [
        {"id": "P01", "name": "Fabric Inspection", "code": "FI", "sequence_index": 1, "unit": "kg/hr", "description": "Roll unspooling, color uniformity and defect mapping"},
        {"id": "P02", "name": "Spreading", "code": "SP", "sequence_index": 2, "unit": "layers/hr", "description": "Tensionless fabric ply spreading on vacuum table"},
        {"id": "P03", "name": "Cutting", "code": "CUT", "sequence_index": 3, "unit": "pieces/hr", "description": "CNC knife cutting of multi-ply fabric bundles"},
        {"id": "P04", "name": "Bundling", "code": "BND", "sequence_index": 4, "unit": "pieces/hr", "description": "Barcode tagging, batch sorting and part ticketing"},
        {"id": "P05", "name": "Shoulder Joining", "code": "SH", "sequence_index": 5, "unit": "pieces/hr", "description": "4-thread overlock front and back shoulder seam"},
        {"id": "P06", "name": "Collar Attaching", "code": "COL", "sequence_index": 6, "unit": "pieces/hr", "description": "Rib knit collar circular attachment"},
        {"id": "P07", "name": "Sleeve Attaching", "code": "SL", "sequence_index": 7, "unit": "pieces/hr", "description": "Sleeve insertion and double needle overlock"},
        {"id": "P08", "name": "Side Seam", "code": "SS", "sequence_index": 8, "unit": "pieces/hr", "description": "Continuous side seam from cuff to bottom hem"},
        {"id": "P09", "name": "Bottom Hemming", "code": "HM", "sequence_index": 9, "unit": "pieces/hr", "description": "Coverstitch folding and bottom hem finish"},
        {"id": "P10", "name": "Printing & Embroidery", "code": "PR_EMB", "sequence_index": 10, "unit": "pieces/hr", "description": "Screen printing and multi-head embroidery"},
        {"id": "P11", "name": "Finishing", "code": "FIN", "sequence_index": 11, "unit": "pieces/hr", "description": "Steam press formers, thread trimming and iron finish"},
        {"id": "P12", "name": "Quality Inspection", "code": "QC", "sequence_index": 12, "unit": "pieces/hr", "description": "Dimensional check, needle detection and visual AQL 1.5"},
        {"id": "P13", "name": "Packing", "code": "PK", "sequence_index": 13, "unit": "pieces/hr", "description": "Barcode polybagging, carton consolidation and dispatch pack"}
    ]
    db.processes.insert_many(processes)

    # 4. Seed 50+ Individual Machines with Exact Specifications
    # SVG Layout dimensions: canvas width ~ 1500, height ~ 750
    # X coordinates by process stage:
    # FI: 80, SP: 190, CUT: 300, BND: 410, SH: 520, COL: 630, SL: 740, SS: 850, HM: 960, PR/EMB: 1070, FIN: 1180, QC: 1290, PK: 1400
    machines_data = [
        # FABRIC INSPECTION
        {"id": "FI-01", "name": "Fabric Inspection 01", "process_id": "P01", "lane_id": "L01", "status": "RUNNING", "capacity": 500, "unit": "kg/hr", "x_position": 80, "y_position": 200, "hourly_rate": 450, "failure_risk": 0.08, "runtime_hours": 1240, "last_maintenance": "2026-08-10"},
        {"id": "FI-02", "name": "Fabric Inspection 02", "process_id": "P01", "lane_id": "L02", "status": "IDLE", "capacity": 500, "unit": "kg/hr", "x_position": 80, "y_position": 400, "hourly_rate": 450, "failure_risk": 0.05, "runtime_hours": 920, "last_maintenance": "2026-08-15"},

        # SPREADING
        {"id": "SP-01", "name": "Auto Spreader 01", "process_id": "P02", "lane_id": "L01", "status": "RUNNING", "capacity": 250, "unit": "layers/hr", "x_position": 190, "y_position": 160, "hourly_rate": 600, "failure_risk": 0.12, "runtime_hours": 2100, "last_maintenance": "2026-08-01"},
        {"id": "SP-02", "name": "Auto Spreader 02", "process_id": "P02", "lane_id": "L02", "status": "RUNNING", "capacity": 250, "unit": "layers/hr", "x_position": 190, "y_position": 320, "hourly_rate": 600, "failure_risk": 0.09, "runtime_hours": 1850, "last_maintenance": "2026-08-05"},
        {"id": "SP-03", "name": "Auto Spreader 03", "process_id": "P02", "lane_id": "L03", "status": "IDLE", "capacity": 220, "unit": "layers/hr", "x_position": 190, "y_position": 480, "hourly_rate": 550, "failure_risk": 0.14, "runtime_hours": 3200, "last_maintenance": "2026-07-20"},

        # CUTTING
        {"id": "CUT-01", "name": "Gerber Cutter 01", "process_id": "P03", "lane_id": "L01", "status": "RUNNING", "capacity": 1200, "unit": "pieces/hr", "x_position": 300, "y_position": 160, "hourly_rate": 1400, "failure_risk": 0.11, "runtime_hours": 1450, "last_maintenance": "2026-08-12"},
        {"id": "CUT-02", "name": "Lectra Cutter 02", "process_id": "P03", "lane_id": "L02", "status": "RUNNING", "capacity": 1100, "unit": "pieces/hr", "x_position": 300, "y_position": 320, "hourly_rate": 1350, "failure_risk": 0.28, "runtime_hours": 4120, "last_maintenance": "2026-06-25"},
        {"id": "CUT-03", "name": "Gerber Cutter 03", "process_id": "P03", "lane_id": "L03", "status": "MAINTENANCE", "capacity": 1200, "unit": "pieces/hr", "x_position": 300, "y_position": 480, "hourly_rate": 1400, "failure_risk": 0.85, "runtime_hours": 5800, "last_maintenance": "2026-05-10"},

        # BUNDLING
        {"id": "BND-01", "name": "Auto Bundler 01", "process_id": "P04", "lane_id": "L01", "status": "RUNNING", "capacity": 1000, "unit": "pieces/hr", "x_position": 410, "y_position": 140, "hourly_rate": 350, "failure_risk": 0.06, "runtime_hours": 1100, "last_maintenance": "2026-08-18"},
        {"id": "BND-02", "name": "Auto Bundler 02", "process_id": "P04", "lane_id": "L02", "status": "RUNNING", "capacity": 1000, "unit": "pieces/hr", "x_position": 410, "y_position": 260, "hourly_rate": 350, "failure_risk": 0.07, "runtime_hours": 1250, "last_maintenance": "2026-08-10"},
        {"id": "BND-03", "name": "Auto Bundler 03", "process_id": "P04", "lane_id": "L03", "status": "IDLE", "capacity": 900, "unit": "pieces/hr", "x_position": 410, "y_position": 380, "hourly_rate": 320, "failure_risk": 0.10, "runtime_hours": 2400, "last_maintenance": "2026-07-28"},
        {"id": "BND-04", "name": "Auto Bundler 04", "process_id": "P04", "lane_id": "L03", "status": "RUNNING", "capacity": 900, "unit": "pieces/hr", "x_position": 410, "y_position": 500, "hourly_rate": 320, "failure_risk": 0.08, "runtime_hours": 1900, "last_maintenance": "2026-08-02"},

        # SHOULDER JOINING
        {"id": "SH-01", "name": "Shoulder Overlock 01", "process_id": "P05", "lane_id": "L01", "status": "RUNNING", "capacity": 800, "unit": "pieces/hr", "x_position": 520, "y_position": 140, "hourly_rate": 400, "failure_risk": 0.08, "runtime_hours": 1600, "last_maintenance": "2026-08-04"},
        {"id": "SH-02", "name": "Shoulder Overlock 02", "process_id": "P05", "lane_id": "L01", "status": "RUNNING", "capacity": 800, "unit": "pieces/hr", "x_position": 520, "y_position": 260, "hourly_rate": 400, "failure_risk": 0.09, "runtime_hours": 1750, "last_maintenance": "2026-08-06"},
        {"id": "SH-03", "name": "Shoulder Overlock 03", "process_id": "P05", "lane_id": "L02", "status": "AVAILABLE", "capacity": 800, "unit": "pieces/hr", "x_position": 520, "y_position": 380, "hourly_rate": 400, "failure_risk": 0.06, "runtime_hours": 1100, "last_maintenance": "2026-08-16"},
        {"id": "SH-04", "name": "Shoulder Overlock 04", "process_id": "P05", "lane_id": "L03", "status": "AVAILABLE", "capacity": 800, "unit": "pieces/hr", "x_position": 520, "y_position": 500, "hourly_rate": 400, "failure_risk": 0.07, "runtime_hours": 1300, "last_maintenance": "2026-08-12"},

        # COLLAR ATTACHING
        {"id": "COL-01", "name": "Collar Station 01", "process_id": "P06", "lane_id": "L01", "status": "RUNNING", "capacity": 750, "unit": "pieces/hr", "x_position": 630, "y_position": 140, "hourly_rate": 420, "failure_risk": 0.10, "runtime_hours": 1900, "last_maintenance": "2026-08-01"},
        {"id": "COL-02", "name": "Collar Station 02", "process_id": "P06", "lane_id": "L01", "status": "RUNNING", "capacity": 750, "unit": "pieces/hr", "x_position": 630, "y_position": 260, "hourly_rate": 420, "failure_risk": 0.08, "runtime_hours": 1400, "last_maintenance": "2026-08-14"},
        {"id": "COL-03", "name": "Collar Station 03", "process_id": "P06", "lane_id": "L02", "status": "AVAILABLE", "capacity": 750, "unit": "pieces/hr", "x_position": 630, "y_position": 380, "hourly_rate": 420, "failure_risk": 0.07, "runtime_hours": 1200, "last_maintenance": "2026-08-15"},
        {"id": "COL-04", "name": "Collar Station 04", "process_id": "P06", "lane_id": "L03", "status": "AVAILABLE", "capacity": 750, "unit": "pieces/hr", "x_position": 630, "y_position": 500, "hourly_rate": 420, "failure_risk": 0.11, "runtime_hours": 2100, "last_maintenance": "2026-07-29"},

        # SLEEVE ATTACHING
        {"id": "SL-01", "name": "Sleeve Machine 01", "process_id": "P07", "lane_id": "L01", "status": "RUNNING", "capacity": 750, "unit": "pieces/hr", "x_position": 740, "y_position": 140, "hourly_rate": 420, "failure_risk": 0.09, "runtime_hours": 1650, "last_maintenance": "2026-08-08"},
        {"id": "SL-02", "name": "Sleeve Machine 02", "process_id": "P07", "lane_id": "L01", "status": "RUNNING", "capacity": 750, "unit": "pieces/hr", "x_position": 740, "y_position": 260, "hourly_rate": 420, "failure_risk": 0.08, "runtime_hours": 1450, "last_maintenance": "2026-08-09"},
        {"id": "SL-03", "name": "Sleeve Machine 03", "process_id": "P07", "lane_id": "L02", "status": "AVAILABLE", "capacity": 750, "unit": "pieces/hr", "x_position": 740, "y_position": 380, "hourly_rate": 420, "failure_risk": 0.06, "runtime_hours": 980, "last_maintenance": "2026-08-18"},
        {"id": "SL-04", "name": "Sleeve Machine 04", "process_id": "P07", "lane_id": "L03", "status": "AVAILABLE", "capacity": 750, "unit": "pieces/hr", "x_position": 740, "y_position": 500, "hourly_rate": 420, "failure_risk": 0.10, "runtime_hours": 1800, "last_maintenance": "2026-08-03"},

        # SIDE SEAM
        {"id": "SS-01", "name": "Side Seam 01", "process_id": "P08", "lane_id": "L01", "status": "RUNNING", "capacity": 700, "unit": "pieces/hr", "x_position": 850, "y_position": 140, "hourly_rate": 380, "failure_risk": 0.08, "runtime_hours": 1500, "last_maintenance": "2026-08-07"},
        {"id": "SS-02", "name": "Side Seam 02", "process_id": "P08", "lane_id": "L01", "status": "RUNNING", "capacity": 700, "unit": "pieces/hr", "x_position": 850, "y_position": 260, "hourly_rate": 380, "failure_risk": 0.07, "runtime_hours": 1350, "last_maintenance": "2026-08-11"},
        {"id": "SS-03", "name": "Side Seam 03", "process_id": "P08", "lane_id": "L02", "status": "AVAILABLE", "capacity": 700, "unit": "pieces/hr", "x_position": 850, "y_position": 380, "hourly_rate": 380, "failure_risk": 0.06, "runtime_hours": 1100, "last_maintenance": "2026-08-17"},
        {"id": "SS-04", "name": "Side Seam 04", "process_id": "P08", "lane_id": "L03", "status": "AVAILABLE", "capacity": 700, "unit": "pieces/hr", "x_position": 850, "y_position": 500, "hourly_rate": 380, "failure_risk": 0.12, "runtime_hours": 2400, "last_maintenance": "2026-07-25"},

        # BOTTOM HEMMING
        {"id": "HM-01", "name": "Bottom Hemmer 01", "process_id": "P09", "lane_id": "L01", "status": "RUNNING", "capacity": 700, "unit": "pieces/hr", "x_position": 960, "y_position": 140, "hourly_rate": 380, "failure_risk": 0.07, "runtime_hours": 1200, "last_maintenance": "2026-08-13"},
        {"id": "HM-02", "name": "Bottom Hemmer 02", "process_id": "P09", "lane_id": "L01", "status": "RUNNING", "capacity": 700, "unit": "pieces/hr", "x_position": 960, "y_position": 260, "hourly_rate": 380, "failure_risk": 0.08, "runtime_hours": 1420, "last_maintenance": "2026-08-10"},
        {"id": "HM-03", "name": "Bottom Hemmer 03", "process_id": "P09", "lane_id": "L02", "status": "AVAILABLE", "capacity": 700, "unit": "pieces/hr", "x_position": 960, "y_position": 380, "hourly_rate": 380, "failure_risk": 0.05, "runtime_hours": 890, "last_maintenance": "2026-08-20"},
        {"id": "HM-04", "name": "Bottom Hemmer 04", "process_id": "P09", "lane_id": "L03", "status": "AVAILABLE", "capacity": 700, "unit": "pieces/hr", "x_position": 960, "y_position": 500, "hourly_rate": 380, "failure_risk": 0.11, "runtime_hours": 2150, "last_maintenance": "2026-07-28"},

        # PRINTING & EMBROIDERY
        {"id": "PR-01", "name": "Carousel Printer 01", "process_id": "P10", "lane_id": "L01", "status": "RUNNING", "capacity": 600, "unit": "pieces/hr", "x_position": 1070, "y_position": 140, "hourly_rate": 850, "failure_risk": 0.12, "runtime_hours": 1900, "last_maintenance": "2026-08-02"},
        {"id": "PR-02", "name": "Carousel Printer 02", "process_id": "P10", "lane_id": "L02", "status": "IDLE", "capacity": 600, "unit": "pieces/hr", "x_position": 1070, "y_position": 260, "hourly_rate": 850, "failure_risk": 0.09, "runtime_hours": 1400, "last_maintenance": "2026-08-11"},
        {"id": "EMB-01", "name": "Tajima Embroidery 01", "process_id": "P10", "lane_id": "L02", "status": "IDLE", "capacity": 400, "unit": "pieces/hr", "x_position": 1070, "y_position": 380, "hourly_rate": 900, "failure_risk": 0.14, "runtime_hours": 2300, "last_maintenance": "2026-07-26"},
        {"id": "EMB-02", "name": "Tajima Embroidery 02", "process_id": "P10", "lane_id": "L03", "status": "IDLE", "capacity": 400, "unit": "pieces/hr", "x_position": 1070, "y_position": 500, "hourly_rate": 900, "failure_risk": 0.10, "runtime_hours": 1600, "last_maintenance": "2026-08-07"},

        # FINISHING
        {"id": "FIN-01", "name": "Steam Tunnel Finisher 01", "process_id": "P11", "lane_id": "L01", "status": "RUNNING", "capacity": 700, "unit": "pieces/hr", "x_position": 1180, "y_position": 140, "hourly_rate": 500, "failure_risk": 0.07, "runtime_hours": 1300, "last_maintenance": "2026-08-12"},
        {"id": "FIN-02", "name": "Steam Tunnel Finisher 02", "process_id": "P11", "lane_id": "L01", "status": "RUNNING", "capacity": 700, "unit": "pieces/hr", "x_position": 1180, "y_position": 260, "hourly_rate": 500, "failure_risk": 0.08, "runtime_hours": 1450, "last_maintenance": "2026-08-08"},
        {"id": "FIN-03", "name": "Steam Press Form 03", "process_id": "P11", "lane_id": "L02", "status": "AVAILABLE", "capacity": 700, "unit": "pieces/hr", "x_position": 1180, "y_position": 380, "hourly_rate": 500, "failure_risk": 0.06, "runtime_hours": 1050, "last_maintenance": "2026-08-16"},
        {"id": "FIN-04", "name": "Steam Press Form 04", "process_id": "P11", "lane_id": "L03", "status": "AVAILABLE", "capacity": 700, "unit": "pieces/hr", "x_position": 1180, "y_position": 500, "hourly_rate": 500, "failure_risk": 0.09, "runtime_hours": 1700, "last_maintenance": "2026-08-05"},

        # QUALITY INSPECTION
        {"id": "QC-01", "name": "Optical AQL Station 01", "process_id": "P12", "lane_id": "L01", "status": "RUNNING", "capacity": 650, "unit": "pieces/hr", "x_position": 1290, "y_position": 140, "hourly_rate": 450, "failure_risk": 0.05, "runtime_hours": 980, "last_maintenance": "2026-08-19"},
        {"id": "QC-02", "name": "Optical AQL Station 02", "process_id": "P12", "lane_id": "L01", "status": "RUNNING", "capacity": 650, "unit": "pieces/hr", "x_position": 1290, "y_position": 260, "hourly_rate": 450, "failure_risk": 0.06, "runtime_hours": 1150, "last_maintenance": "2026-08-14"},
        {"id": "QC-03", "name": "Manual Metrology Station 03", "process_id": "P12", "lane_id": "L02", "status": "AVAILABLE", "capacity": 650, "unit": "pieces/hr", "x_position": 1290, "y_position": 380, "hourly_rate": 450, "failure_risk": 0.04, "runtime_hours": 850, "last_maintenance": "2026-08-21"},
        {"id": "QC-04", "name": "Manual Metrology Station 04", "process_id": "P12", "lane_id": "L03", "status": "AVAILABLE", "capacity": 650, "unit": "pieces/hr", "x_position": 1290, "y_position": 500, "hourly_rate": 450, "failure_risk": 0.07, "runtime_hours": 1350, "last_maintenance": "2026-08-10"},

        # PACKING
        {"id": "PK-01", "name": "Auto Polybagger 01", "process_id": "P13", "lane_id": "L01", "status": "RUNNING", "capacity": 600, "unit": "pieces/hr", "x_position": 1400, "y_position": 100, "hourly_rate": 350, "failure_risk": 0.05, "runtime_hours": 950, "last_maintenance": "2026-08-15"},
        {"id": "PK-02", "name": "Auto Polybagger 02", "process_id": "P13", "lane_id": "L01", "status": "RUNNING", "capacity": 600, "unit": "pieces/hr", "x_position": 1400, "y_position": 190, "hourly_rate": 350, "failure_risk": 0.06, "runtime_hours": 1100, "last_maintenance": "2026-08-12"},
        {"id": "PK-03", "name": "Carton Packer 03", "process_id": "P13", "lane_id": "L02", "status": "RUNNING", "capacity": 600, "unit": "pieces/hr", "x_position": 1400, "y_position": 280, "hourly_rate": 350, "failure_risk": 0.07, "runtime_hours": 1280, "last_maintenance": "2026-08-09"},
        {"id": "PK-04", "name": "Carton Packer 04", "process_id": "P13", "lane_id": "L02", "status": "AVAILABLE", "capacity": 600, "unit": "pieces/hr", "x_position": 1400, "y_position": 370, "hourly_rate": 350, "failure_risk": 0.05, "runtime_hours": 920, "last_maintenance": "2026-08-18"},
        {"id": "PK-05", "name": "Palletizer 05", "process_id": "P13", "lane_id": "L03", "status": "AVAILABLE", "capacity": 600, "unit": "pieces/hr", "x_position": 1400, "y_position": 460, "hourly_rate": 350, "failure_risk": 0.08, "runtime_hours": 1500, "last_maintenance": "2026-08-06"},
        {"id": "PK-06", "name": "Palletizer 06", "process_id": "P13", "lane_id": "L03", "status": "AVAILABLE", "capacity": 600, "unit": "pieces/hr", "x_position": 1400, "y_position": 550, "hourly_rate": 350, "failure_risk": 0.06, "runtime_hours": 1050, "last_maintenance": "2026-08-17"}
    ]

    for m in machines_data:
        m["machine_age"] = round(m["runtime_hours"] / 8760.0 + 1.2, 1)
        m["utilization"] = round(random.uniform(70.0, 92.0), 1) if m["status"] == "RUNNING" else 0.0
        m["worker_requirement"] = 1
        m["required_skill"] = m["process_id"]
        m["setup_time"] = 15.0
        m["production_cost_per_hour"] = m["hourly_rate"]
        m["maintenance_status"] = "OK" if m["status"] != "MAINTENANCE" else "UNDER_REPAIR"
        m["next_maintenance"] = "2026-10-15"
        m["previous_failures"] = 1 if m["failure_risk"] > 0.2 else 0
        m["historical_downtime"] = round(m["previous_failures"] * 4.5, 1)
        m["current_order_id"] = "ORD-1042" if m["id"] == "CUT-02" else None
        m["current_operation_id"] = "OP-1042-03" if m["id"] == "CUT-02" else None
        m["compatible_processes"] = [m["process_id"]]

    db.machines.insert_many(machines_data)
    print(f"[Seed] Created {len(machines_data)} individually addressable machines.")

    # 5. Seed 20+ Workers
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
        w = {
            "id": f"WRK-{i:03d}",
            "name": wname,
            "employee_code": f"EMP-{i:03d}",
            "shift": wshift,
            "is_available": True,
            "hourly_rate": round(320.0 + (wexp * 25.0), 2),
            "experience_years": wexp,
            "skills": [f"P{((i + k) % 13) + 1:02d}" for k in range(4)]
        }
        workers.append(w)
    db.workers.insert_many(workers)

    # 6. Seed Materials & Inventory
    materials = [
        {"code": "MAT-COTTON-180", "name": "100% Combed Cotton Single Jersey 180 GSM", "unit": "KG", "stock_quantity": 8500.0, "reorder_level": 1200.0, "cost_per_unit": 380.0},
        {"code": "MAT-POLY-BLEND", "name": "Poly-Cotton Fleece 280 GSM", "unit": "KG", "stock_quantity": 4200.0, "reorder_level": 800.0, "cost_per_unit": 420.0},
        {"code": "MAT-THREAD-TEX24", "name": "Spun Polyester Sewing Thread Tex 24", "unit": "SPOOLS", "stock_quantity": 1500.0, "reorder_level": 250.0, "cost_per_unit": 65.0},
        {"code": "MAT-RIB-1X1", "name": "Cotton Spandex 1x1 Collar Ribbing", "unit": "KG", "stock_quantity": 1200.0, "reorder_level": 200.0, "cost_per_unit": 450.0},
        {"code": "MAT-POLYBAGS", "name": "Self-Sealing Transparent Polybags (M/L/XL)", "unit": "UNITS", "stock_quantity": 45000.0, "reorder_level": 5000.0, "cost_per_unit": 3.5}
    ]
    db.materials.insert_many(materials)

    # 7. Seed Products
    products = [
        {"id": 1, "code": "PRD-TSHIRT-01", "name": "Classic Crew Neck T-Shirt", "category": "Activewear", "standard_cost": 220.0},
        {"id": 2, "code": "PRD-POLO-02", "name": "Pique Collar Polo Shirt", "category": "Casual", "standard_cost": 340.0},
        {"id": 3, "code": "PRD-HOODIE-03", "name": "Heavyweight Fleece Pullover", "category": "Winterwear", "standard_cost": 650.0},
        {"id": 4, "code": "PRD-JOGGER-04", "name": "Tapered Rib Joggers", "category": "Activewear", "standard_cost": 480.0}
    ]
    db.products.insert_many(products)

    # 8. Seed Demo Order ORD-1042 and 29 other Orders
    demo_order_id = "ORD-1042"
    now = datetime.utcnow()
    deadline_12h = now + timedelta(hours=12)

    demo_order = {
        "id": demo_order_id,
        "product_id": 1,
        "product_name": "Classic Crew Neck T-Shirt",
        "product_code": "PRD-TSHIRT-01",
        "quantity": 12000,
        "priority": "URGENT",
        "status": "RUNNING",
        "deadline_hours": 12.0,
        "due_date": deadline_12h.isoformat(),
        "assigned_lane_id": "L01",
        "created_at": (now - timedelta(hours=3)).isoformat()
    }
    db.orders.insert_one(demo_order)

    # Demo Order Operations (Complete 13-stage manufacturing route)
    # Stage 1: FI-01 (COMPLETED)
    # Stage 2: SP-01 (COMPLETED)
    # Stage 3: CUT-02 (RUNNING - The Demo Failure Machine!)
    # Stage 4..13: QUEUED
    demo_route = [
        ("P01", "Fabric Inspection", "FI-01", "COMPLETED", 0, 45, 45, 100),
        ("P02", "Spreading", "SP-01", "COMPLETED", 45, 105, 60, 100),
        ("P03", "Cutting", "CUT-02", "RUNNING", 105, 210, 105, 42), # RUNNING on CUT-02
        ("P04", "Bundling", "BND-01", "QUEUED", 210, 270, 60, 0),
        ("P05", "Shoulder Joining", "SH-01", "QUEUED", 270, 345, 75, 0),
        ("P06", "Collar Attaching", "COL-01", "QUEUED", 345, 420, 75, 0),
        ("P07", "Sleeve Attaching", "SL-01", "QUEUED", 420, 495, 75, 0),
        ("P08", "Side Seam", "SS-01", "QUEUED", 495, 570, 75, 0),
        ("P09", "Bottom Hemming", "HM-01", "QUEUED", 570, 645, 75, 0),
        ("P10", "Printing", "PR-01", "QUEUED", 645, 720, 75, 0),
        ("P11", "Finishing", "FIN-01", "QUEUED", 720, 795, 75, 0),
        ("P12", "Quality Inspection", "QC-01", "QUEUED", 795, 855, 60, 0),
        ("P13", "Packing", "PK-01", "QUEUED", 855, 915, 60, 0),
    ]

    demo_ops = []
    demo_sched_ops = []
    base_time = now - timedelta(hours=3)

    for seq, (proc_id, proc_name, mach_id, op_status, start_m, end_m, dur_m, prog) in enumerate(demo_route, 1):
        op_id = f"OP-1042-{seq:02d}"
        s_start = base_time + timedelta(minutes=start_m)
        s_end = base_time + timedelta(minutes=end_m)

        op_doc = {
            "id": op_id,
            "order_id": demo_order_id,
            "sequence": seq,
            "process_id": proc_id,
            "process_name": proc_name,
            "assigned_machine_id": mach_id,
            "original_machine_id": mach_id,
            "status": op_status,
            "scheduled_start_min": float(start_m),
            "scheduled_end_min": float(end_m),
            "processing_time_min": float(dur_m),
            "setup_time_min": 15.0,
            "progress_percentage": float(prog)
        }
        demo_ops.append(op_doc)

        sched_op = {
            "id": f"SCHED-{op_id}",
            "order_id": demo_order_id,
            "order_priority": "URGENT",
            "product_name": "Classic Crew Neck T-Shirt",
            "operation_id": op_id,
            "sequence": seq,
            "process_id": proc_id,
            "process_name": proc_name,
            "machine_id": mach_id,
            "machine_name": mach_id,
            "lane_id": "L01",
            "worker_id": f"WRK-{(seq % 15) + 1:03d}",
            "worker_name": worker_names[(seq % 15)][0],
            "status": op_status,
            "scheduled_start": s_start.isoformat(),
            "scheduled_end": s_end.isoformat(),
            "scheduled_start_min": float(start_m),
            "scheduled_end_min": float(end_m),
            "actual_start": s_start.isoformat() if op_status in ["COMPLETED", "RUNNING"] else None,
            "actual_end": s_end.isoformat() if op_status == "COMPLETED" else None,
            "predicted_processing_time": float(dur_m),
            "setup_time": 15.0,
            "actual_processing_time": float(dur_m) if op_status == "COMPLETED" else None,
            "priority": "URGENT",
            "deadline": deadline_12h.isoformat(),
            "is_delayed": False,
            "is_reassigned": False,
            "original_machine_id": mach_id,
            "reassigned_machine_id": None,
            "production_cost": round(dur_m / 60.0 * 1200.0, 2),
            "reassignment_reason": None
        }
        demo_sched_ops.append(sched_op)

    db.order_operations.insert_many(demo_ops)
    db.schedule_operations.insert_many(demo_sched_ops)
    print(f"[Seed] Created demo order {demo_order_id} with 13 operations.")

    # 9. Seed other 29 realistic production orders
    other_orders = []
    other_ops = []
    other_sched_ops = []

    for i in range(1043, 1072):
        oid = f"ORD-{i}"
        p = random.choice(products)
        qty = random.choice([2500, 5000, 8000, 10000, 15000])
        prio = random.choice(["LOW", "MEDIUM", "HIGH"])
        d_hrs = random.choice([24.0, 36.0, 48.0, 72.0])
        lane = random.choice(["L01", "L02", "L03"])
        o_status = random.choice(["PLANNED", "QUEUED", "RUNNING", "COMPLETED"])

        o_doc = {
            "id": oid,
            "product_id": p["id"],
            "product_name": p["name"],
            "product_code": p["code"],
            "quantity": qty,
            "priority": prio,
            "status": o_status,
            "deadline_hours": d_hrs,
            "due_date": (now + timedelta(hours=d_hrs)).isoformat(),
            "assigned_lane_id": lane,
            "created_at": (now - timedelta(days=random.randint(1, 5))).isoformat()
        }
        other_orders.append(o_doc)

        # 5 sample operations per order
        seq_start = random.randint(100, 600)
        for s in range(1, 6):
            proc = processes[s - 1]
            # pick matching machine
            m_candidates = [m for m in machines_data if m["process_id"] == proc["id"]]
            mach = random.choice(m_candidates) if m_candidates else machines_data[0]
            dur = random.randint(45, 90)

            op_id = f"OP-{i}-{s:02d}"
            op_doc = {
                "id": op_id,
                "order_id": oid,
                "sequence": s,
                "process_id": proc["id"],
                "process_name": proc["name"],
                "assigned_machine_id": mach["id"],
                "original_machine_id": mach["id"],
                "status": o_status,
                "scheduled_start_min": float(seq_start),
                "scheduled_end_min": float(seq_start + dur),
                "processing_time_min": float(dur),
                "setup_time_min": 15.0,
                "progress_percentage": 100.0 if o_status == "COMPLETED" else 0.0
            }
            other_ops.append(op_doc)

            sched_op = {
                "id": f"SCHED-{op_id}",
                "order_id": oid,
                "order_priority": prio,
                "product_name": p["name"],
                "operation_id": op_id,
                "sequence": s,
                "process_id": proc["id"],
                "process_name": proc["name"],
                "machine_id": mach["id"],
                "machine_name": mach["id"],
                "lane_id": lane,
                "worker_id": f"WRK-{(s % 15) + 1:03d}",
                "worker_name": worker_names[(s % 15)][0],
                "status": o_status,
                "scheduled_start": (now + timedelta(minutes=seq_start)).isoformat(),
                "scheduled_end": (now + timedelta(minutes=seq_start + dur)).isoformat(),
                "scheduled_start_min": float(seq_start),
                "scheduled_end_min": float(seq_start + dur),
                "actual_start": None,
                "actual_end": None,
                "predicted_processing_time": float(dur),
                "setup_time": 15.0,
                "actual_processing_time": float(dur),
                "priority": prio,
                "deadline": (now + timedelta(hours=d_hrs)).isoformat(),
                "is_delayed": False,
                "is_reassigned": False,
                "original_machine_id": mach["id"],
                "reassigned_machine_id": None,
                "production_cost": round(dur / 60.0 * 500.0, 2)
            }
            other_sched_ops.append(sched_op)
            seq_start += dur + 15

    db.orders.insert_many(other_orders)
    db.order_operations.insert_many(other_ops)
    db.schedule_operations.insert_many(other_sched_ops)
    print(f"[Seed] Created 29 additional orders with {len(other_ops)} operations.")

    # 10. Seed Active Schedule
    active_sched = {
        "id": "SCHED-ACTIVE-01",
        "name": "Live Adaptive Garment Production Schedule",
        "schedule_type": "ADAPTIVE_CP_SAT",
        "is_active": True,
        "makespan_minutes": 915.0,
        "makespan_hours": 15.25,
        "total_tardiness_minutes": 0.0,
        "late_orders_count": 0,
        "total_production_cost": 48250.0,
        "average_utilization": 84.5,
        "schedule_changes_count": 0,
        "stability_score": 98.5,
        "solver_status": "OPTIMAL",
        "solve_time_ms": 412.0,
        "created_at": datetime.utcnow().isoformat()
    }
    db.schedules.insert_one(active_sched)

    # 11. Seed 1000+ Historical Production Records for ML Model Training
    # Clearly labeled as synthetic demonstration dataset
    print("[Seed] Generating 1,200 synthetic historical production records for ML...")
    hist_records = []
    materials_codes = ["MAT-COTTON-180", "MAT-POLY-BLEND", "MAT-RIB-1X1"]
    shifts = ["SHIFT_1", "SHIFT_2", "SHIFT_3"]

    for idx in range(1200):
        mach = random.choice(machines_data)
        qty = random.randint(1000, 15000)
        base_rate = mach["capacity"]
        skill = random.uniform(3.0, 5.0)
        exp = random.uniform(2.0, 10.0)
        util = random.uniform(65.0, 95.0)
        age = mach["machine_age"]
        prev_fails = mach["previous_failures"]
        
        # Theoretical base time in minutes
        theo_min = (qty / base_rate) * 60.0
        # Add realistic variability based on worker skill, machine age, downtime
        noise = random.gauss(1.0, 0.08)
        skill_factor = 1.15 - (skill * 0.03)
        age_factor = 1.0 + (age * 0.015)
        actual_min = round(theo_min * noise * skill_factor * age_factor, 1)

        # Failure indicator for failure risk model
        fail_prob = 0.04 + (mach["runtime_hours"] / 50000.0) + (0.05 if util > 90 else 0.0)
        failed_event = 1 if random.random() < fail_prob else 0

        rec = {
            "dataset_type": "Demonstration data — synthetic historical dataset",
            "record_id": f"HIST-{idx:05d}",
            "machine_id": mach["id"],
            "process_type": mach["process_id"],
            "product_type": random.choice(["PRD-TSHIRT-01", "PRD-POLO-02", "PRD-HOODIE-03"]),
            "quantity": qty,
            "material_type": random.choice(materials_codes),
            "shift": random.choice(shifts),
            "worker_skill": round(skill, 1),
            "operator_experience": round(exp, 1),
            "historical_cycle_time": round(60.0 / base_rate * 1000.0, 2), # sec per 1000 pcs
            "machine_utilization": round(util, 1),
            "machine_age": age,
            "historical_downtime": mach["historical_downtime"],
            "previous_failure_count": prev_fails,
            "batch_size": qty,
            "setup_complexity": random.choice([1, 2, 3]),
            "actual_processing_time": actual_min,
            "runtime_hours": mach["runtime_hours"],
            "maintenance_gap_days": random.randint(5, 60),
            "failure_event": failed_event,
            "created_at": (now - timedelta(days=random.randint(10, 180))).isoformat()
        }
        hist_records.append(rec)

    db.production_history.insert_many(hist_records)
    print(f"[Seed] Created {len(hist_records)} historical records for ML.")

    # 12. Seed an initial pending planning request for Supervisor review demo
    plan_demo = {
        "id": "PLAN-1043",
        "order_id": "ORD-1043",
        "product_name": "Pique Collar Polo Shirt",
        "quantity": 8000,
        "priority": "HIGH",
        "deadline": (now + timedelta(hours=36)).isoformat(),
        "status": "PENDING_SUPERVISOR_APPROVAL",
        "estimated_duration_hours": 14.5,
        "estimated_working_days": 1.8,
        "machine_count": 5,
        "worker_count": 8,
        "estimated_cost": 28400.0,
        "bottleneck_risk": "MEDIUM (Cutting Lectra)",
        "deadline_risk": "LOW",
        "operations": [
            {"sequence": 1, "process_id": "P01", "process_name": "Fabric Inspection", "machine_id": "FI-02", "predicted_time_min": 50, "worker_name": "Vikram Rao", "material_status": "AVAILABLE"},
            {"sequence": 2, "process_id": "P02", "process_name": "Spreading", "machine_id": "SP-02", "predicted_time_min": 75, "worker_name": "Aarav Patel", "material_status": "AVAILABLE"},
            {"sequence": 3, "process_id": "P03", "process_name": "Cutting", "machine_id": "CUT-01", "predicted_time_min": 95, "worker_name": "Neha Sharma", "material_status": "AVAILABLE"},
            {"sequence": 4, "process_id": "P04", "process_name": "Bundling", "machine_id": "BND-02", "predicted_time_min": 60, "worker_name": "Devika Nair", "material_status": "AVAILABLE"},
            {"sequence": 5, "process_id": "P05", "process_name": "Sewing Assembly", "machine_id": "SH-03", "predicted_time_min": 110, "worker_name": "Karan Mehta", "material_status": "AVAILABLE"}
        ],
        "supervisor_notes": "Awaiting supervisor validation before shopfloor commit.",
        "created_at": (now - timedelta(hours=1)).isoformat()
    }
    db.planning_plans.insert_one(plan_demo)
    print("[Seed] Seeded initial Supervisor pending plan (PLAN-1043).")

    # 13. Seed Initial Audit Log
    db.audit_logs.insert_one({
        "id": "AUD-001",
        "user_id": "USR-MGR-01",
        "username": "manager",
        "role": "MANAGER",
        "machine_id": "CUT-03",
        "old_status": "RUNNING",
        "new_status": "MAINTENANCE",
        "reason": "Scheduled quarterly blade alignment and servo motor overhaul",
        "timestamp": (now - timedelta(days=2)).isoformat()
    })

    print("[Seed] SUCCESS: Full MongoDB seeding completed!")
    return True

if __name__ == "__main__":
    seed_mongo()
