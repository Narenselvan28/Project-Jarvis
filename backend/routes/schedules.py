from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.services.scheduling_service import scheduling_service
from backend.routes.auth import manager_required

schedules_bp = Blueprint("schedules", __name__, url_prefix="/api/schedules")

@schedules_bp.route("/current", methods=["GET"])
def get_current_schedule():
    res = scheduling_service.get_current_schedule()
    return jsonify(res), 200

@schedules_bp.route("/baselines", methods=["GET"])
def get_baselines():
    res = scheduling_service.get_baseline_comparisons()
    return jsonify(res), 200

@schedules_bp.route("/reoptimize", methods=["POST"])
@jwt_required()
@manager_required
def reoptimize_schedule():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    res = scheduling_service.reoptimize_after_recovery()
    return jsonify({
        "message": "Optimization re-run successfully",
        "result": res
    }), 200
