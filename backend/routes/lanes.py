from flask import Blueprint, jsonify
from backend.database.mongo import get_collection

lanes_bp = Blueprint("lanes", __name__, url_prefix="/api/lanes")

@lanes_bp.route("", methods=["GET"])
def get_lanes():
    lanes = list(get_collection("lanes").find({}, {"_id": 0}).sort("sequence", 1))
    mach_coll = get_collection("machines")
    for l in lanes:
        machines = list(mach_coll.find({"lane_id": l["id"]}, {"_id": 0}).sort("x_position", 1))
        for m in machines:
            m["svg_x"] = m.get("x_position", 100)
            m["svg_y"] = m.get("y_position", 100)
        l["machines"] = machines
    return jsonify({"lanes": lanes}), 200
