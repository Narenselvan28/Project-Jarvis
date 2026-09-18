from flask import Blueprint, jsonify
from backend.repositories.factory_repository import factory_repo

materials_bp = Blueprint("materials", __name__, url_prefix="/api/materials")

@materials_bp.route("", methods=["GET"])
def list_materials():
    materials = factory_repo.get_materials()
    return jsonify({"materials": materials}), 200
