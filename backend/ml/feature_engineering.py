import numpy as np
import pandas as pd

PROCESSING_TIME_FEATURES = [
    "machine_id_enc",
    "process_seq",
    "product_type_enc",
    "material_type_enc",
    "quantity",
    "operator_experience",
    "shift_num",
    "historical_machine_utilization",
    "historical_cycle_time",
    "setup_time",
    "previous_downtime",
    "worker_skill",
    "machine_age",
    "batch_size"
]

FAILURE_RISK_FEATURES = [
    "machine_age",
    "runtime_hours",
    "utilization",
    "temperature",
    "vibration",
    "previous_failures",
    "maintenance_gap",
    "downtime_history",
    "cycle_count"
]

MACHINE_ENCODINGS = {
    f"M{i:02d}": i for i in range(1, 21)
}

PRODUCT_ENCODINGS = {
    "PRD-TURBINE-BLADE": 1,
    "PRD-HYDRAULIC-VALVE": 2,
    "PRD-TRANSMISSION-GEAR": 3,
    "PRD-COMPRESSOR-SHAFT": 4,
    "PRD-INJECTOR-NOZZLE": 5,
    "PRD-PRECISION-BEARING": 6,
    "PRD-ROTOR-ASSEMBLY": 7,
    "PRD-ELECTRONIC-HOUSING": 8,
    "PRD-ACTUATOR-CYLINDER": 9,
    "PRD-FASTENER-CLUSTER": 10
}

MATERIAL_ENCODINGS = {
    "MAT-ALU-6061": 1,
    "MAT-STEEL-316": 2,
    "MAT-TITANIUM-GR5": 3,
    "MAT-INCONEL-718": 4,
    "MAT-BRASS-C360": 5
}

def extract_processing_features(machine, order, operation, worker=None):
    """
    Extracts 14-feature vector for processing time prediction.
    """
    m_id = machine.id if hasattr(machine, 'id') else machine.get('id', 'M01')
    p_code = order.product.code if (hasattr(order, 'product') and order.product) else "PRD-TURBINE-BLADE"
    mat_code = (order.product.material_code if hasattr(order, 'product') and order.product and order.product.material_code 
                else "MAT-STEEL-316")
    
    qty = getattr(order, 'quantity', 50)
    op_exp = worker.experience_years if (worker and hasattr(worker, 'experience_years')) else 4.0
    
    shift_str = worker.shift if (worker and hasattr(worker, 'shift')) else "SHIFT_1"
    shift_map = {"SHIFT_1": 1, "SHIFT_2": 2, "SHIFT_3": 3}
    shift_num = shift_map.get(shift_str, 1)

    skill = 3
    if worker and hasattr(worker, 'skills'):
        for s in worker.skills:
            if getattr(s, 'process_id', None) == getattr(operation, 'process_id', None):
                skill = getattr(s, 'skill_level', 3)
                break

    features = {
        "machine_id_enc": MACHINE_ENCODINGS.get(m_id, 1),
        "process_seq": getattr(operation, 'sequence', 1),
        "product_type_enc": PRODUCT_ENCODINGS.get(p_code, 1),
        "material_type_enc": MATERIAL_ENCODINGS.get(mat_code, 2),
        "quantity": float(qty),
        "operator_experience": float(op_exp),
        "shift_num": float(shift_num),
        "historical_machine_utilization": float(getattr(machine, 'current_utilization', 75.0)),
        "historical_cycle_time": float(getattr(machine, 'base_cycle_time', 60.0)),
        "setup_time": float(getattr(machine, 'setup_time_min', 15.0)),
        "previous_downtime": float(getattr(machine, 'previous_failures', 1) * 2.5),
        "worker_skill": float(skill),
        "machine_age": float(getattr(machine, 'machine_age_years', 3.0)),
        "batch_size": float(qty)
    }
    return features

def extract_failure_features(machine):
    """
    Extracts 9-feature vector for machine failure risk classification.
    """
    return {
        "machine_age": float(getattr(machine, 'machine_age_years', 3.0)),
        "runtime_hours": float(getattr(machine, 'runtime_hours', 1200.0)),
        "utilization": float(getattr(machine, 'current_utilization', 75.0)),
        "temperature": float(getattr(machine, 'temperature', 65.0)),
        "vibration": float(getattr(machine, 'vibration', 2.0)),
        "previous_failures": float(getattr(machine, 'previous_failures', 1)),
        "maintenance_gap": float(getattr(machine, 'maintenance_gap_days', 30)),
        "downtime_history": float(getattr(machine, 'previous_failures', 1) * 3.2),
        "cycle_count": float(getattr(machine, 'cycle_count', 5000))
    }
