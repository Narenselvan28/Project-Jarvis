"""
V1 Workers Controller
"""

from flask import Blueprint
from backend.repositories.factory_repository import factory_repo
from backend.schemas.common import make_success

workers_v1_bp = Blueprint("workers_v1", __name__, url_prefix="/api/v1")

@workers_v1_bp.route("/workers", methods=["GET"])
def list_workers():
    workers = factory_repo.get_workers()
    return make_success(workers, meta={"count": len(workers)})
