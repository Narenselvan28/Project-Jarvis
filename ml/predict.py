"""
CLI Entrypoint: python -m ml.predict
"""

import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.ml.prediction import predict_processing_time, predict_machine_risk
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo

def predict_sample():
    print("=" * 65)
    print("  ARIVON ML: Interactive Inference & Explanation CLI")
    print("=" * 65)

    machine = machine_repo.get_by_id("CUT-02") or {
        "id": "CUT-02", "name": "Lectra Auto Cutter 02", "lane_id": "L01",
        "process_id": "P03", "precision_level": "HIGH", "base_cycle_time": 65.0,
        "setup_time": 15.0, "hourly_rate": 1400.0, "temperature": 74.5,
        "vibration": 3.1, "runtime_hours": 2480.0, "current_utilization": 86.2,
        "previous_failures": 3, "maintenance_gap_days": 52, "cycle_count": 18400
    }

    order = {
        "id": "ORD-1042",
        "product_code": "PRD-TSHIRT-01",
        "quantity": 12000,
        "priority": "URGENT"
    }

    op = {
        "sequence": 3,
        "process_id": "P03",
        "assigned_machine_id": "CUT-02"
    }

    # 1. Processing time prediction
    proc_pred = predict_processing_time(machine, order, op)
    print("\n[PREDICTION 1: PROCESSING TIME]")
    print(f"  Machine:          {machine['id']} ({machine['name']})")
    print(f"  Order:            {order['id']} (Quantity: {order['quantity']}, Priority: {order['priority']})")
    print(f"  Predicted Time:   {proc_pred.get('predicted_processing_time')} minutes")
    print(f"  Confidence Range: {proc_pred.get('confidence_interval')}")
    print("  Top Explainability Drivers:")
    for d in proc_pred.get("explainability", {}).get("top_positive_drivers", []):
        print(f"    {d}")
    for d in proc_pred.get("explainability", {}).get("top_negative_drivers", []):
        print(f"    {d}")

    # 2. Failure Risk Prediction
    risk_pred = predict_machine_risk(machine)
    print("\n[PREDICTION 2: MACHINE FAILURE RISK]")
    print(f"  Machine:           {machine['id']}")
    print(f"  Failure Risk Prob: {round(risk_pred.get('failure_probability', 0.0) * 100, 1)}%")
    print(f"  Risk Category:     {risk_pred.get('risk_category')}")
    print(f"  Telemetry State:   Temp={machine.get('temperature')}°C | Vib={machine.get('vibration')}mm/s")

    print("\n" + "=" * 65)

if __name__ == "__main__":
    predict_sample()
