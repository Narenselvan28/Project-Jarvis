from flask import Blueprint, jsonify
from backend.models.lane import Lane

lanes_bp = Blueprint("lanes", __name__, url_prefix="/api/lanes")

@lanes_bp.route("", methods=["GET"])
def get_lanes():
    lanes = Lane.query.order_by(Lane.sequence).all()
    res = []
    for l in lanes:
        d = l.to_dict()
        d["machines"] = [m.to_dict() for m in l.machines]
        res.append(d)
    return jsonify({"lanes": res}), 200
