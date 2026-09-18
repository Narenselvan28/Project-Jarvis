from flask import Blueprint, jsonify
from backend.models.material import Material

materials_bp = Blueprint("materials", __name__, url_prefix="/api/materials")

@materials_bp.route("", methods=["GET"])
def list_materials():
    materials = Material.query.all()
    return jsonify({"materials": [m.to_dict() for m in materials]}), 200
