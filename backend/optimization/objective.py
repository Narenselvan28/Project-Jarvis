from backend.config import Config

def build_multi_objective(builder, weights=None):
    """
    Minimizes:
    alpha * Tardiness + beta * ProductionCost + delta * ScheduleChanges + makespan
    """
    w_tardiness = (weights.get("tardiness") if weights else None) or Config.WEIGHT_TARDINESS
    w_cost = (weights.get("cost") if weights else None) or Config.WEIGHT_COST
    w_change = (weights.get("schedule_change") if weights else None) or Config.WEIGHT_SCHEDULE_CHANGE

    objective_terms = []

    # 1. Total Weighted Tardiness
    for order_id, (tard_var, priority_weight) in builder.order_tardiness_vars.items():
        scaled_weight = int(w_tardiness * priority_weight * 10)
        objective_terms.append(scaled_weight * tard_var)

    # 2. Production Costs
    for op_key, op_data in builder.operation_vars.items():
        for cost_var in op_data.get("cost_vars", []):
            scaled_cost_w = int(w_cost)
            objective_terms.append(scaled_cost_w * cost_var)

    # 3. Schedule Change Penalties (Stability)
    for op_key, op_data in builder.operation_vars.items():
        for change_var in op_data.get("change_vars", []):
            scaled_change_w = int(w_change * 5)
            objective_terms.append(scaled_change_w * change_var)

    # 4. Total Makespan Term
    if builder.operation_vars:
        makespan = builder.model.NewIntVar(0, builder.horizon, "makespan")
        for op_key, op_data in builder.operation_vars.items():
            builder.model.Add(makespan >= op_data["end"])
        objective_terms.append(makespan * 2)

    builder.model.Minimize(sum(objective_terms))
