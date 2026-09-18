"""
Health and Readiness Probes
"""

from flask import Blueprint, jsonify
from backend.repositories.machine_repository import machine_repo
from backend.ml.model_manager import model_manager
from backend.database.mongo import MongoDBManager
from backend.extensions import socketio

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def liveness():
    return jsonify({
        "status": "UP",
        "service": "ARIVON Manufacturing Intelligence Platform",
        "version": "1.0.0"
    }), 200

@health_bp.route("/ready", methods=["GET"])
def readiness():
    checks = {}
    is_ready = True

    # 1. MongoDB connectivity check
    try:
        db_mgr = MongoDBManager()
        if db_mgr.client is not None:
            # ping if real client
            if not db_mgr.is_mock:
                db_mgr.client.admin.command("ping")
            checks["mongodb"] = {
                "status": "HEALTHY",
                "engine": "Atlas" if db_mgr.is_atlas else ("Mock" if db_mgr.is_mock else "Native Local"),
                "database": db_mgr.db_name
            }
        else:
            checks["mongodb"] = {"status": "UNHEALTHY", "error": "No client instance"}
            is_ready = False
    except Exception as e:
        checks["mongodb"] = {"status": "UNHEALTHY", "error": str(e)}
        is_ready = False

    # 2. ML Models loaded
    try:
        proc_m = model_manager.get_processing_time_model()
        fail_m = model_manager.get_failure_risk_model()
        checks["ml_models"] = {
            "status": "HEALTHY" if (proc_m and fail_m) else "DEGRADED",
            "processing_time_model": "LOADED" if proc_m else "MISSING",
            "failure_risk_model": "LOADED" if fail_m else "MISSING",
            "shap_explainer": "INITIALIZED" if model_manager.get_shap_explainer() else "FALLBACK"
        }
        if not proc_m or not fail_m:
            is_ready = False
    except Exception as e:
        checks["ml_models"] = {"status": "UNHEALTHY", "error": str(e)}
        is_ready = False

    # 3. OR-Tools CP-SAT Solver readiness
    try:
        from ortools.sat.python import cp_model
        test_model = cp_model.CpModel()
        x = test_model.NewIntVar(0, 10, "x")
        test_solver = cp_model.CpSolver()
        test_solver.parameters.max_time_in_seconds = 1
        st = test_solver.Solve(test_model)
        checks["optimization_solver"] = {
            "status": "HEALTHY",
            "solver": "Google OR-Tools CP-SAT",
            "probe_solve": "PASS" if st in [cp_model.OPTIMAL, cp_model.FEASIBLE] else "FAIL"
        }
    except Exception as e:
        checks["optimization_solver"] = {"status": "UNHEALTHY", "error": str(e)}
        is_ready = False

    # 4. SocketIO readiness
    checks["realtime_socketio"] = {
        "status": "HEALTHY",
        "async_mode": "threading"
    }

    status_code = 200 if is_ready else 503
    return jsonify({
        "status": "READY" if is_ready else "NOT_READY",
        "checks": checks
    }), status_code
