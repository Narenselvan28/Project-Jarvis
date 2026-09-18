import os
import sys

# Ensure root folder is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from flask import Flask, jsonify
from backend.config import Config
from backend.extensions import db, jwt, socketio, migrate, cors
from backend.routes import register_blueprints

from bson import ObjectId
from flask.json.provider import DefaultJSONProvider

class MongoJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.json_provider_class = MongoJSONProvider
    app.json = MongoJSONProvider(app)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    migrate.init_app(app, db)
    socketio.init_app(app)

    # Register blueprints
    register_blueprints(app)

    # Global error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad Request", "details": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource Not Found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "healthy", "service": "Adaptive Scheduling Platform", "version": "1.0.0"}), 200

    # Auto ensure MongoDB seed data is present on startup
    with app.app_context():
        try:
            from backend.database.mongo import get_collection
            from backend.seed.seed_mongo import seed_mongo
            if get_collection("machines").count_documents({}) == 0:
                print("[Server] MongoDB collections empty. Seeding initial factory configuration...")
                seed_mongo()
        except Exception as e:
            print(f"[MongoDB] Notice on startup seed check: {e}")

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    print(f"[Server] Starting Adaptive Scheduling Platform on port {port}...")
    socketio.run(app, host="0.0.0.0", port=port, debug=True, allow_unsafe_werkzeug=True)
