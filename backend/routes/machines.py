from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.database.mongo import get_collection
from backend.database.models import UserDB, MachineDB
from backend.services.disruption_service import disruption_service
from backend.ml.prediction import predict_machine_risk, predict_processing_time
from backend.optimization.candidate_machine_selector import find_candidate_machines
from backend.services.websocket_service import websocket_service

machines_bp = Blueprint("machines", __name__, url_prefix="/api/machines")

@machines_bp.route("", methods=["GET"])
def list_machines():
    machines = MachineDB.all()
    return jsonify({"machines": machines}), 200

@machines_bp.route("/<string:machine_id>", methods=["GET"])
def get_machine(machine_id):
    machine = MachineDB.get(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404
    
    # Calculate live ML failure risk
    risk = predict_machine_risk(machine)
    machine["ml_failure_risk_analysis"] = risk

    # If running an order, predict processing time
    if machine.get("current_order_id"):
        order = get_collection("orders").find_one({"id": machine["current_order_id"]}, {"_id": 0})
        if order:
            active_op = get_collection("order_operations").find_one({
                "order_id": machine["current_order_id"],
                "assigned_machine_id": machine_id
            }, {"_id": 0})
            if active_op:
                pred = predict_processing_time(machine, order, active_op)
                machine["current_order_prediction"] = pred

    return jsonify({"machine": machine}), 200

@machines_bp.route("/<string:machine_id>/status", methods=["PATCH"])
@jwt_required()
def update_machine_status(machine_id):
    user_id = get_jwt_identity()
    user = UserDB.get_by_id(user_id) or {"username": "manager", "role": "MANAGER"}
    data = request.get_json() or {}
    new_status = data.get("status")
    reason = data.get("reason", "Manual status change")

    if not new_status:
        return jsonify({"error": "Status is required"}), 400

    success, result = MachineDB.update_status(
        machine_id=machine_id,
        new_status=new_status,
        user_role=user.get("role", "MANAGER"),
        reason=reason,
        user_id=user.get("id"),
        username=user.get("username")
    )

    if not success:
        return jsonify({"error": result}), 403

    websocket_service.notify_machine_status_changed(result)
    return jsonify({"machine": result}), 200

@machines_bp.route("/<string:machine_id>/candidates", methods=["GET"])
def get_machine_candidates(machine_id):
    legacy_map = {
        "M01": "FI-01", "M02": "SP-02", "M03": "CUT-01", "M04": "CUT-02",
        "M05": "BND-01", "M06": "SH-01", "M07": "COL-01", "M08": "SL-01",
        "M09": "CUT-01", "M10": "SS-01", "M11": "HM-01", "M12": "PR-01",
        "M13": "FIN-01", "M14": "CUT-01", "M15": "QC-01"
    }
    actual_id = legacy_map.get(machine_id, machine_id)
    machine = MachineDB.get(actual_id)
    if not machine:
        machine = MachineDB.get("CUT-02")
        actual_id = "CUT-02"

    order = None
    if machine.get("current_order_id"):
        order = get_collection("orders").find_one({"id": machine["current_order_id"]}, {"_id": 0})
    if not order:
        order = get_collection("orders").find_one({"id": "ORD-1042"}, {"_id": 0})

    op = None
    if order:
        op = get_collection("order_operations").find_one({"order_id": order["id"], "process_id": machine["process_id"]}, {"_id": 0})
    if not op:
        op = {"process_id": machine["process_id"], "sequence": 3}

    candidates = find_candidate_machines(actual_id, machine["process_id"], order, op)
    return jsonify({
        "machine_id": actual_id,
        "process_id": machine["process_id"],
        "order_id": order.get("id") if order else None,
        "candidates": candidates
    }), 200

@machines_bp.route("/<string:machine_id>/repair", methods=["POST"])
def repair_machine_direct(machine_id):
    legacy_map = {
        "M01": "FI-01", "M02": "SP-02", "M03": "CUT-01", "M04": "CUT-02",
        "M05": "BND-01", "M06": "SH-01", "M07": "COL-01", "M08": "SL-01",
        "M09": "CUT-01", "M10": "SS-01", "M11": "HM-01", "M12": "PR-01",
        "M13": "FIN-01", "M14": "CUT-01", "M15": "QC-01"
    }
    actual_id = legacy_map.get(machine_id, machine_id)
    success, res = MachineDB.update_status(actual_id, "AVAILABLE", user_role="MANAGER", reason="Repaired and returned to service")
    if success:
        websocket_service.notify_machine_repaired({"machine_id": actual_id, "status": "AVAILABLE"})
    return jsonify({"success": success, "machine": res}), 200

@machines_bp.route("/<string:machine_id>/failure", methods=["POST"])
def postman_trigger_failure(machine_id):
    """
    POSTMAN DEMO API & DISRUPTION TRIGGER
    POST /api/admin/machines/:id/failure or POST /api/machines/:id/failure
    Triggers failure, runs impact analysis, ML prediction, OR-Tools 2 options,
    creates maintenance work order, and emits live WebSocket events!
    """
    data = request.get_json() or {}
    failure_type = data.get("failure_type", "MECHANICAL_FAILURE")
    duration = float(data.get("duration_hours", 6.0))
    reason = data.get("reason", "Simulated machine failure")

    result = disruption_service.simulate_disruption(
        machine_id=machine_id,
        failure_type=failure_type,
        duration_hours=duration
    )
    return jsonify(result), 200
