from flask import Blueprint, jsonify
from backend.models.audit_log import AuditLog

audit_bp = Blueprint("audit_logs", __name__, url_prefix="/api/audit-logs")

@audit_bp.route("", methods=["GET"])
def get_audit_logs():
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(50).all()
    return jsonify({"audit_logs": [l.to_dict() for l in logs]}), 200
