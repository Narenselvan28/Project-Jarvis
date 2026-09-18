from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.models.machine import Machine
from backend.models.order import Order
from backend.services.impact_analysis_service import impact_analysis_service
from backend.optimization.candidate_machine_selector import find_candidate_machines
from backend.optimization.scheduler import production_scheduler
from backend.services.disruption_service import disruption_service
from backend.routes.auth import manager_required

simulation_bp = Blueprint("simulation", __name__, url_prefix="/api/simulation")

@simulation_bp.route("/what-if", methods=["POST"])
@jwt_required()
@manager_required
def what_if_simulation():
    data = request.get_json() or {}
    machine_id = data.get("machine_id", "M04")
    failure_type = data.get("failure_type", "Mechanical Breakdown")
    duration = float(data.get("duration_hours", 6.0))

    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify({"error": f"Machine {machine_id} not found"}), 404

    # 1. Non-destructive impact analysis
    impact = impact_analysis_service.analyze_failure_impact(machine_id, duration)

    # 2. Candidate discovery & ML predictions
    all_machines = {m.id: m for m in Machine.query.all()}
    affected_order_ids = [o["id"] for o in impact["affected_orders"]]
    affected_orders = Order.query.filter(Order.id.in_(affected_order_ids)).all() if affected_order_ids else []

    compatible_map = {}
    candidate_summary = []
    for order in affected_orders:
        for op in order.operations:
            if op.assigned_machine_id == machine_id:
                req_prec = order.product.required_precision if order.product else "HIGH"
                cands = find_candidate_machines(machine_id, op.process_id, order, op, required_precision=req_prec)
                compatible_map[op.process_id] = cands
                candidate_summary.extend(cands)

    # 3. Hypothetical CP-SAT solve (non-persisted)
    opt_result = None
    if affected_orders:
        opt_result = production_scheduler.solve_disruption_recovery(
            failed_machine_id=machine_id,
            failure_duration_hours=duration,
            affected_orders=affected_orders,
            compatible_candidates_map=compatible_map,
            all_machines=all_machines
        )

    return jsonify({
        "simulation_mode": "WHAT_IF_SANDBOX",
        "persisted": False,
        "machine_id": machine_id,
        "failure_type": failure_type,
        "duration_hours": duration,
        "impact_analysis": impact,
        "candidate_evaluations": candidate_summary,
        "projected_optimization": opt_result
    }), 200

@simulation_bp.route("/apply", methods=["POST"])
@jwt_required()
@manager_required
def apply_simulation():
    data = request.get_json() or {}
    machine_id = data.get("machine_id", "M04")
    failure_type = data.get("failure_type", "Mechanical Breakdown")
    duration = float(data.get("duration_hours", 6.0))

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    res = disruption_service.simulate_disruption(
        machine_id=machine_id,
        failure_type=failure_type,
        duration_hours=duration,
        user=user,
        auto_optimize=True
    )
    return jsonify({
        "message": "Simulation applied successfully to live production",
        "result": res
    }), 200
