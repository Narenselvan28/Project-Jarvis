from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.models.disruption import Disruption, DisruptionStatus
from backend.services.disruption_service import disruption_service
from backend.routes.auth import manager_required

disruptions_bp = Blueprint("disruptions", __name__, url_prefix="/api/disruptions")

@disruptions_bp.route("", methods=["GET"])
def list_disruptions():
    disruptions = Disruption.query.order_by(Disruption.started_at.desc()).all()
    return jsonify({"disruptions": [d.to_dict() for d in disruptions]}), 200

@disruptions_bp.route("/active", methods=["GET"])
def get_active_disruptions():
    disruptions = Disruption.query.filter_by(status=DisruptionStatus.ACTIVE.value).all()
    return jsonify({"active_disruptions": [d.to_dict() for d in disruptions]}), 200

@disruptions_bp.route("/simulate", methods=["POST"])
@jwt_required()
@manager_required
def simulate():
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
    return jsonify(res), 200
