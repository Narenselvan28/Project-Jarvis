from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.models.maintenance import MaintenanceWorkOrder, MaintenanceStatus
from backend.services.maintenance_service import maintenance_service
from backend.routes.auth import service_person_required

maintenance_bp = Blueprint("maintenance", __name__, url_prefix="/api/maintenance")

@maintenance_bp.route("", methods=["GET"])
def list_maintenance():
    orders = MaintenanceWorkOrder.query.order_by(MaintenanceWorkOrder.created_at.desc()).all()
    return jsonify({"work_orders": [wo.to_dict() for wo in orders]}), 200

@maintenance_bp.route("/<int:wo_id>", methods=["GET"])
def get_work_order(wo_id):
    wo = MaintenanceWorkOrder.query.get(wo_id)
    if not wo:
        return jsonify({"error": "Work order not found"}), 404
    return jsonify({"work_order": wo.to_dict()}), 200

@maintenance_bp.route("", methods=["POST"])
@jwt_required()
def create_work_order():
    data = request.get_json() or {}
    machine_id = data.get("machine_id")
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    wo = maintenance_service.create_work_order(
        machine_id=machine_id,
        disruption_id=data.get("disruption_id"),
        fault_type=data.get("fault_type", "Scheduled Maintenance"),
        priority=data.get("priority", "HIGH"),
        estimated_hours=float(data.get("estimated_repair_hours", 4.0))
    )
    return jsonify({"work_order": wo.to_dict()}), 201

@maintenance_bp.route("/<int:wo_id>", methods=["PATCH"])
@jwt_required()
@service_person_required
def update_work_order(wo_id):
    data = request.get_json() or {}
    new_status = data.get("status")
    notes = data.get("notes")
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    try:
        wo = maintenance_service.update_work_order_status(
            work_order_id=wo_id,
            new_status=new_status,
            notes=notes,
            assigned_to_id=user.id if user else None,
            user=user
        )
        return jsonify({"work_order": wo.to_dict()}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
