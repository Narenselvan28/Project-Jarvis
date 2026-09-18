from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.models.machine import Machine, MachineState
from backend.models.order import Order, OrderOperation
from backend.services.machine_service import machine_service
from backend.services.disruption_service import disruption_service
from backend.services.maintenance_service import maintenance_service
from backend.ml.prediction import predict_machine_risk, predict_processing_time
from backend.optimization.candidate_machine_selector import find_candidate_machines
from backend.routes.auth import manager_required, service_person_required

machines_bp = Blueprint("machines", __name__, url_prefix="/api/machines")

@machines_bp.route("", methods=["GET"])
def list_machines():
    machines = Machine.query.all()
    return jsonify({"machines": [m.to_dict(include_details=True) for m in machines]}), 200

@machines_bp.route("/<string:machine_id>", methods=["GET"])
def get_machine(machine_id):
    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404
    
    # Calculate live ML failure risk
    risk = predict_machine_risk(machine)
    data = machine.to_dict(include_details=True)
    data["ml_failure_risk_analysis"] = risk

    # If running an order, get ML processing time prediction
    if machine.current_order_id:
        order = Order.query.get(machine.current_order_id)
        if order:
            active_op = next((op for op in order.operations if op.assigned_machine_id == machine.id), None)
            if active_op:
                pred = predict_processing_time(machine, order, active_op)
                data["current_order_prediction"] = pred

    return jsonify({"machine": data}), 200

@machines_bp.route("/<string:machine_id>/candidates", methods=["GET"])
def get_machine_candidates(machine_id):
    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404

    # Look for active order on this machine
    order = Order.query.get(machine.current_order_id) if machine.current_order_id else Order.query.first()
    op = next((op for op in order.operations if op.process_id == machine.process_id), None) if order else None

    req_prec = order.product.required_precision if (order and order.product) else "HIGH"
    candidates = find_candidate_machines(machine_id, machine.process_id, order, op, required_precision=req_prec)

    return jsonify({
        "machine_id": machine_id,
        "process_id": machine.process_id,
        "order_id": order.id if order else None,
        "candidates": candidates
    }), 200

@machines_bp.route("/<string:machine_id>/fail", methods=["POST"])
@jwt_required()
@manager_required
def fail_machine(machine_id):
    data = request.get_json() or {}
    failure_type = data.get("failure_type", "Mechanical Breakdown")
    duration = float(data.get("duration_hours", 6.0))

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    result = disruption_service.simulate_disruption(
        machine_id=machine_id,
        failure_type=failure_type,
        duration_hours=duration,
        user=user,
        auto_optimize=True
    )
    return jsonify(result), 200

@machines_bp.route("/<string:machine_id>/repair", methods=["POST"])
@jwt_required()
@service_person_required
def repair_machine(machine_id):
    data = request.get_json() or {}
    notes = data.get("notes", "Machine repair completed and verified")
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    machine = machine_service.update_machine_status(
        machine_id=machine_id,
        new_status=MachineState.AVAILABLE.value,
        reason=f"Repaired by {user.username if user else 'Service Person'}: {notes}",
        user_id=user.id if user else None,
        username=user.username if user else "SERVICE_PERSON"
    )
    return jsonify({"message": f"Machine {machine_id} restored to AVAILABLE", "machine": machine.to_dict()}), 200
