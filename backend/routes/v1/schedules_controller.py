"""
V1 Schedules Controller
"""

from flask import Blueprint, request
from backend.repositories.schedule_repository import schedule_repo
from backend.services.scheduling_service import scheduling_service
from backend.schemas.common import make_success, make_error

schedules_v1_bp = Blueprint("schedules_v1", __name__, url_prefix="/api/v1")

@schedules_v1_bp.route("/schedules", methods=["GET"])
def get_schedules():
    order_id = request.args.get("order_id")
    history = schedule_repo.get_version_history(order_id=order_id)
    return make_success(history, meta={"count": len(history)})

@schedules_v1_bp.route("/schedules/active", methods=["GET"])
def get_active_schedule():
    curr = scheduling_service.get_current_schedule()
    return make_success(curr)

@schedules_v1_bp.route("/schedules/benchmark", methods=["GET"])
def get_schedule_benchmarks():
    benchmarks = scheduling_service.get_baseline_comparisons()
    return make_success(benchmarks)
