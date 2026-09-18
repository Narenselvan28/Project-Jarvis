import numpy as np

def explain_processing_time(features_dict, predicted_val, base_val=60.0):
    """
    Computes percentage and directional feature contributions relative to standard baseline.
    """
    contributions = {}
    
    # Impact of Machine Base Speed & Historical Cycle Time
    base_cycle = features_dict.get("historical_cycle_time", 60.0)
    cycle_diff = (base_cycle - 60.0) / 60.0
    contributions["Historical Cycle Time"] = round(cycle_diff * 40.0, 1)

    # Impact of Machine Utilization
    util = features_dict.get("historical_machine_utilization", 75.0)
    util_diff = (util - 70.0) / 70.0
    contributions["Machine Utilization"] = round(util_diff * 25.0, 1)

    # Impact of Batch Size / Quantity
    qty = features_dict.get("quantity", 50.0)
    qty_diff = (qty - 50.0) / 50.0
    contributions["Batch Size"] = round(qty_diff * 20.0, 1)

    # Impact of Operator Experience / Skill (negative is good: reduces time)
    skill = features_dict.get("worker_skill", 3.0)
    exp = features_dict.get("operator_experience", 4.0)
    exp_factor = -((skill - 3.0) * 5.0 + (exp - 3.0) * 3.0)
    contributions["Operator Experience"] = round(exp_factor, 1)

    # Setup Complexity
    setup = features_dict.get("setup_time", 15.0)
    setup_diff = (setup - 15.0) / 15.0
    contributions["Setup Complexity"] = round(setup_diff * 15.0, 1)

    # Material Machinability
    mat_enc = features_dict.get("material_type_enc", 2)
    mat_factor = (mat_enc - 2) * 6.5
    contributions["Material Hardness"] = round(mat_factor, 1)

    return contributions

def explain_suitability(candidate_eval):
    """
    Breakdown of candidate recommendation score factors.
    """
    reasons = []
    if candidate_eval.get("is_available"):
        reasons.append("Machine available immediately with zero queue delay")
    else:
        reasons.append("Machine is currently processing another batch (queue delay)")

    if candidate_eval.get("precision_match"):
        reasons.append(f"Precision capability meets required specification ({candidate_eval.get('precision_level', 'HIGH')})")
    else:
        reasons.append("Precision grade below required tolerance (Risk of scrap)")

    if candidate_eval.get("worker_available"):
        reasons.append("Certified operator available for current shift")
    else:
        reasons.append("Worker reassignment required (operator bottleneck)")

    if candidate_eval.get("material_available"):
        reasons.append("Sufficient raw material allocated in buffer inventory")
    else:
        reasons.append("Material reorder required")

    pred_time = candidate_eval.get("predicted_processing_time", 60.0)
    reasons.append(f"Predicted processing time: {pred_time:.1f} minutes")
    
    cost = candidate_eval.get("production_cost", 1200.0)
    reasons.append(f"Estimated incremental cost: ₹{cost:.0f}")

    return reasons
