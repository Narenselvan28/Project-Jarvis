from flask import Blueprint, jsonify
from backend.repositories.factory_repository import factory_repo

workers_bp = Blueprint("workers", __name__, url_prefix="/api/workers")

@workers_bp.route("", methods=["GET"])
def list_workers():
    workers = factory_repo.get_workers()
    return jsonify({"workers": workers}), 200
