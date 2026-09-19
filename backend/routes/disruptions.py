from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.database.mongo import get_collection
from backend.database.models import UserDB, DisruptionDB
from backend.services.disruption_service import disruption_service

disruptions_bp = Blueprint("disruptions", __name__, url_prefix="/api")

@disruptions_bp.route("/disruptions", methods=["GET"])
def list_disruptions():
    disruptions = DisruptionDB.all()
    return jsonify({"disruptions": disruptions}), 200

@disruptions_bp.route("/disruptions/active", methods=["GET"])
def get_active_disruptions():
    active = list(get_collection("disruptions").find({"status": "ACTIVE"}, {"_id": 0}).sort("started_at", -1))
    return jsonify({"active_disruptions": active}), 200

@disruptions_bp.route("/disruptions/<string:disruption_id>", methods=["GET"])
def get_disruption(disruption_id):
    disruption = DisruptionDB.get(disruption_id)
    if not disruption:
        return jsonify({"error": "Disruption not found"}), 404
    return jsonify({"disruption": disruption}), 200

@disruptions_bp.route("/admin/disruptions", methods=["POST"])
@disruptions_bp.route("/disruptions/simulate", methods=["POST"])
def simulate_disruption_admin():
    """
    POST /api/admin/disruptions or /api/disruptions/simulate
    Triggered via Postman or Admin UI:
    Body:
    {
        "machine_id": "CUT-02",
        "order_id": "ORD-1042",
        "failure_type": "MECHANICAL_FAILURE",
        "duration_hours": 6
    }
    """
    data = request.get_json() or {}
    machine_id = data.get("machine_id", "CUT-02")
    failure_type = data.get("failure_type", "MECHANICAL_FAILURE")
    duration = float(data.get("duration_hours", 6.0))

    try:
        res = disruption_service.simulate_disruption(
            machine_id=machine_id,
            failure_type=failure_type,
            duration_hours=duration
        )
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@disruptions_bp.route("/admin/machines/<string:machine_id>/failure", methods=["POST"])
def simulate_machine_failure_admin(machine_id):
    """
    POST /api/admin/machines/CUT-02/failure
    Postman jury demonstration endpoint
    """
    data = request.get_json() or {}
    failure_type = data.get("failure_type", "MECHANICAL_FAILURE")
    duration = float(data.get("duration_hours", 6.0))

    try:
        res = disruption_service.simulate_disruption(
            machine_id=machine_id,
            failure_type=failure_type,
            duration_hours=duration
        )
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@disruptions_bp.route("/recommendations/<string:disruption_id>", methods=["GET"])
def get_recommendations(disruption_id):
    disruption = DisruptionDB.get(disruption_id)
    if not disruption:
        return jsonify({"error": "Disruption not found"}), 404
    return jsonify({
        "disruption_id": disruption_id,
        "machine_id": disruption.get("machine_id"),
        "status": disruption.get("status"),
        "option_a": disruption.get("option_a"),
        "option_b": disruption.get("option_b"),
        "approved_option": disruption.get("approved_option")
    }), 200

@disruptions_bp.route("/manager/simulate-disruption", methods=["POST"])
def simulate_disruption_manager():
    data = request.get_json() or {}
    machine_id = data.get("machine_id", "CUT-02")
    failure_type = data.get("failure_type", "MECHANICAL_FAILURE")
    duration = float(data.get("duration_hours", 6.0))
    try:
        res = disruption_service.simulate_disruption(
            machine_id=machine_id,
            failure_type=failure_type,
            duration_hours=duration
        )
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@disruptions_bp.route("/recovery/<string:disruption_id>", methods=["GET"])
@disruptions_bp.route("/recommendations/<string:disruption_id>", methods=["GET"])
def get_recovery_info(disruption_id):
    try:
        data = disruption_service.get_recovery_details(disruption_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@disruptions_bp.route("/recommendations/<string:disruption_id>/approve", methods=["POST"])
@disruptions_bp.route("/recovery/<string:disruption_id>/approve", methods=["POST"])
def approve_recovery_option(disruption_id):
    """
    Manager approves Option A or Option B.
    Body: {"option": "OPTION_A"} or {"option": "OPTION_B"}
    """
    data = request.get_json() or {}
    chosen = data.get("option") or data.get("option_id") or data.get("chosen_option") or "OPTION_A"

    try:
        res = disruption_service.approve_recommendation(disruption_id, chosen_option=str(chosen).upper())
        return jsonify(res), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@disruptions_bp.route("/recommendations/<string:disruption_id>/reject", methods=["POST"])
@disruptions_bp.route("/recovery/<string:disruption_id>/reject", methods=["POST"])
def reject_recovery_options(disruption_id):
    """
    Manager rejects both recovery options.
    Body: {"reason": "Cost too high, awaiting part shipment"}
    """
    data = request.get_json() or {}
    reason = data.get("reason", "Manager rejected both options")

    try:
        res = disruption_service.reject_recommendation(disruption_id, reason=reason)
        return jsonify(res), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@disruptions_bp.route("/recovery/<string:disruption_id>/regenerate", methods=["POST"])
def regenerate_recovery_options(disruption_id):
    disruption = DisruptionDB.get(disruption_id)
    if not disruption:
        return jsonify({"error": f"Disruption {disruption_id} not found"}), 404
    machine_id = disruption.get("machine_id")
    failure_type = disruption.get("failure_type", "MECHANICAL_FAILURE")
    duration = float(disruption.get("estimated_downtime_hours", 6.0))
    try:
        res = disruption_service.simulate_disruption(
            machine_id=machine_id,
            failure_type=failure_type,
            duration_hours=duration
        )
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

