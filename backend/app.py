import os
import sys

# Ensure root folder is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from flask import Flask, jsonify
from backend.config import Config
from backend.extensions import jwt, socketio, cors
from backend.routes import register_blueprints
from backend.domain.errors import DomainError

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
    jwt.init_app(app)
    cors_origins = app.config.get("CORS_ORIGINS", "*")
    if isinstance(cors_origins, str) and "," in cors_origins:
        cors_origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
    cors.init_app(app, resources={r"/*": {"origins": cors_origins}}, supports_credentials=True)
    socketio.init_app(app, cors_allowed_origins=cors_origins)

    # Register blueprints (both /api/v1/ and legacy /api/)
    register_blueprints(app)

    @app.route("/", methods=["GET"])
    def root_ping():
        return jsonify({
            "service": "ReFlow Adaptive Production Intelligence API",
            "status": "online",
            "health": "/health",
            "api_version": "v1",
            "api_prefix": "/api/v1"
        }), 200

    @app.route("/health", methods=["GET"])
    def health_check():
        from backend.database.mongo import get_db_status
        db_status = get_db_status()
        return jsonify({
            "status": "healthy",
            "database": db_status
        }), 200

    # Domain & global error handlers
    @app.errorhandler(DomainError)
    def handle_domain_error(de):
        return jsonify({
            "success": False,
            "error": {
                "code": de.code,
                "message": de.message,
                "details": de.details
            }
        }), de.status_code

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({
            "success": False,
            "error": {"code": "BAD_REQUEST", "message": "Bad Request", "details": str(e)}
        }), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": "Resource Not Found"}
        }), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            "success": False,
            "error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected server error occurred."}
        }), 500

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
    print(f"[Server] Starting ReFlow Platform on port {port}...")
    socketio.run(app, host="0.0.0.0", port=port, debug=True, allow_unsafe_werkzeug=True)
