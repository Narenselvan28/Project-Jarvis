"""
V1 Materials & Inventory Controller
"""

from flask import Blueprint
from backend.repositories.factory_repository import factory_repo
from backend.schemas.common import make_success

materials_v1_bp = Blueprint("materials_v1", __name__, url_prefix="/api/v1")

@materials_v1_bp.route("/materials", methods=["GET"])
def list_materials():
    materials = factory_repo.get_materials()
    return make_success(materials, meta={"count": len(materials)})

@materials_v1_bp.route("/materials/inventory", methods=["GET"])
def list_inventory():
    inv = factory_repo.get_material_inventory()
    return make_success(inv, meta={"count": len(inv)})
