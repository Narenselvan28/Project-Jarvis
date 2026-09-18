from flask import Blueprint, jsonify
from backend.database.mongo import get_db_status
from backend.ml.model_manager import model_manager

health_v1_bp = Blueprint("health_v1", __name__, url_prefix="/api/v1")

@health_v1_bp.route("/health", methods=["GET"])
def get_v1_health():
    db_status = get_db_status()
    is_db_connected = (db_status.get("status") == "connected")
    
    # Check ML model availability
    proc_m = model_manager.get_processing_time_model()
    fail_m = model_manager.get_failure_risk_model()
    ml_status = "available" if (proc_m is not None and fail_m is not None) else "degraded"

    overall_healthy = is_db_connected

    return jsonify({
        "status": "healthy" if overall_healthy else "unhealthy",
        "database": {
            "provider": db_status.get("provider", "UNAVAILABLE"),
            "status": db_status.get("status", "disconnected")
        },
        "ml_service": ml_status,
        "optimization_engine": "available"
    }), 200 if overall_healthy else 503
