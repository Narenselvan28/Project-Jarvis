"""
V1 What-If Simulation Controller
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.services.simulation_service import simulation_service
from backend.services.disruption_service import disruption_service
from backend.repositories.user_repository import user_repo
from backend.schemas.common import make_success, make_error
from backend.schemas.simulation_schemas import WhatIfSimulationSchema

simulation_v1_bp = Blueprint("simulation_v1", __name__, url_prefix="/api/v1")

@simulation_v1_bp.route("/simulation/what-if", methods=["POST"])
@jwt_required()
def run_simulation():
    raw_data = request.get_json() or {}
    try:
        req = WhatIfSimulationSchema(**raw_data)
    except Exception as e:
        return make_error("VALIDATION_ERROR", str(e), status_code=400)

    result = simulation_service.run_what_if(
        machine_id=req.machine_id,
        failure_type=req.failure_type,
        duration_hours=req.duration_hours
    )
    if result.get("error"):
        return make_error("SIMULATION_FAILED", result["error"], status_code=404)

    return make_success(result)

@simulation_v1_bp.route("/simulation/apply", methods=["POST"])
@jwt_required()
def apply_simulation():
    user_id = get_jwt_identity()
    user = user_repo.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    raw_data = request.get_json() or {}

    try:
        req = WhatIfSimulationSchema(**raw_data)
        res = disruption_service.simulate_disruption(
            machine_id=req.machine_id,
            failure_type=req.failure_type,
            duration_hours=req.duration_hours,
            user=user
        )
        return make_success(res)
    except Exception as e:
        return make_error("APPLY_SIMULATION_FAILED", str(e), status_code=400)
