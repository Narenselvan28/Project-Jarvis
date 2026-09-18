from flask import Blueprint, jsonify
from backend.models.worker import Worker

workers_bp = Blueprint("workers", __name__, url_prefix="/api/workers")

@workers_bp.route("", methods=["GET"])
def list_workers():
    workers = Worker.query.all()
    return jsonify({"workers": [w.to_dict() for w in workers]}), 200
