from flask import Blueprint, jsonify
from backend.database.models import AuditLogDB

audit_bp = Blueprint("audit_logs", __name__, url_prefix="/api/audit-logs")

@audit_bp.route("", methods=["GET"])
def get_audit_logs():
    logs = AuditLogDB.all()
    return jsonify({"audit_logs": logs}), 200
