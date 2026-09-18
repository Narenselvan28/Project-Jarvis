"""
What-If Simulation Routes (Non-Mutating Sandbox)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.services.simulation_service import simulation_service
from backend.services.disruption_service import disruption_service
from backend.routes.auth import manager_required
from backend.schemas.common import make_success, make_error

simulation_bp = Blueprint("simulation", __name__, url_prefix="/api/simulation")

@simulation_bp.route("/what-if", methods=["POST"])
@jwt_required()
@manager_required
def what_if_simulation():
    """
    POST /api/simulation/what-if
    Executes non-destructive What-If scenario in memory.
    """
    data = request.get_json() or {}
    machine_id = data.get("machine_id", "CUT-02")
    failure_type = data.get("failure_type", "Mechanical Breakdown")
    duration = float(data.get("duration_hours", 6.0))

    res = simulation_service.run_what_if(
        machine_id=machine_id,
        failure_type=failure_type,
        duration_hours=duration
    )
    if res.get("error"):
        return jsonify({"error": res["error"]}), 404
    return jsonify(res), 200

@simulation_bp.route("/apply", methods=["POST"])
@jwt_required()
@manager_required
def apply_simulation():
    """
    POST /api/simulation/apply
    Applies the simulated disruption to live factory state.
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    machine_id = data.get("machine_id", "CUT-02")
    failure_type = data.get("failure_type", "Mechanical Breakdown")
    duration = float(data.get("duration_hours", 6.0))

    try:
        res = disruption_service.simulate_disruption(
            machine_id=machine_id,
            failure_type=failure_type,
            duration_hours=duration,
            user={"id": user_id, "username": "manager", "role": "MANAGER"}
        )
        return jsonify({
            "message": "Simulation applied to live factory successfully.",
            "disruption_result": res
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
