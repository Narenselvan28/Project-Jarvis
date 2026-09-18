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
# Also encode garment machines
GARMENT_MACHINE_PREFIXES = ["FI", "SP", "CUT", "BND", "SH", "COL", "SL", "SS", "HM", "PR", "EMB", "FIN", "QC", "PK"]
for i, pref in enumerate(GARMENT_MACHINE_PREFIXES, 21):
    for num in range(1, 10):
        MACHINE_ENCODINGS[f"{pref}-{num:02d}"] = i * 10 + num

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
    "PRD-FASTENER-CLUSTER": 10,
    "PRD-TSHIRT-01": 11,
    "PRD-POLO-02": 12,
    "PRD-HOODIE-03": 13,
    "PRD-JOGGER-04": 14
}

MATERIAL_ENCODINGS = {
    "MAT-ALU-6061": 1,
    "MAT-STEEL-316": 2,
    "MAT-TITANIUM-GR5": 3,
    "MAT-INCONEL-718": 4,
    "MAT-BRASS-C360": 5,
    "MAT-COTTON-180": 6,
    "MAT-POLY-BLEND": 7,
    "MAT-THREAD-TEX24": 8,
    "MAT-RIB-1X1": 9,
    "MAT-POLYBAGS": 10
}

def _get_val(obj, key, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)

def extract_processing_features(machine, order, operation, worker=None):
    """
    Extracts 14-feature vector for processing time prediction. Supports both MongoDB dicts and model objects.
    """
    m_id = _get_val(machine, 'id', 'CUT-01')
    p_code = _get_val(order, 'product_code', None)
    if not p_code and hasattr(order, 'product') and order.product:
        p_code = getattr(order.product, 'code', "PRD-TSHIRT-01")
    if not p_code:
        p_code = "PRD-TSHIRT-01"

    mat_code = _get_val(order, 'material_code', "MAT-COTTON-180")
    qty = _get_val(order, 'quantity', 5000)
    op_exp = _get_val(worker, 'experience_years', 4.5)
    shift_str = _get_val(worker, 'shift', "SHIFT_1")
    shift_map = {"SHIFT_1": 1, "SHIFT_2": 2, "SHIFT_3": 3}
    shift_num = shift_map.get(shift_str, 1)

    skill = 3
    if worker:
        w_skills = _get_val(worker, 'skills', [])
        for s in w_skills:
            p_id = _get_val(s, 'process_id', s if isinstance(s, str) else None)
            op_proc = _get_val(operation, 'process_id', None)
            if p_id == op_proc:
                skill = _get_val(s, 'skill_level', 4) if not isinstance(s, str) else 4
                break

    features = {
        "machine_id_enc": MACHINE_ENCODINGS.get(m_id, 1),
        "process_seq": _get_val(operation, 'sequence', 1),
        "product_type_enc": PRODUCT_ENCODINGS.get(p_code, 11),
        "material_type_enc": MATERIAL_ENCODINGS.get(mat_code, 6),
        "quantity": float(qty),
        "operator_experience": float(op_exp),
        "shift_num": float(shift_num),
        "historical_machine_utilization": float(_get_val(machine, 'utilization', _get_val(machine, 'current_utilization', 75.0))),
        "historical_cycle_time": float(_get_val(machine, 'base_cycle_time', 60.0)),
        "setup_time": float(_get_val(machine, 'setup_time', _get_val(machine, 'setup_time_min', 15.0))),
        "previous_downtime": float(_get_val(machine, 'historical_downtime', 2.5)),
        "worker_skill": float(skill),
        "machine_age": float(_get_val(machine, 'machine_age', _get_val(machine, 'machine_age_years', 2.5))),
        "batch_size": float(qty)
    }
    return features

def extract_failure_features(machine):
    """
    Extracts 9-feature vector for machine failure risk classification.
    """
    age = _get_val(machine, 'machine_age', _get_val(machine, 'machine_age_years', 2.5))
    runtime = _get_val(machine, 'runtime_hours', 1500.0)
    util = _get_val(machine, 'utilization', _get_val(machine, 'current_utilization', 78.0))
    temp = _get_val(machine, 'temperature', 62.0)
    vib = _get_val(machine, 'vibration', 1.8)
    prev_fails = _get_val(machine, 'previous_failures', 1)
    downtime = _get_val(machine, 'historical_downtime', 3.5)

    return {
        "machine_age": float(age),
        "runtime_hours": float(runtime),
        "utilization": float(util),
        "temperature": float(temp),
        "vibration": float(vib),
        "previous_failures": float(prev_fails),
        "maintenance_gap": float(_get_val(machine, 'maintenance_gap_days', 25.0)),
        "downtime_history": float(downtime),
        "cycle_count": float(_get_val(machine, 'cycle_count', 4500.0))
    }
