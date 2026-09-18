import os
from flask import Flask, jsonify
from backend.config import Config
from backend.extensions import db, jwt, socketio, migrate, cors
from backend.routes import register_blueprints

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

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

    # Auto create tables for local SQLite if running
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            print(f"[DB] Notice on create_all: {e}")

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    print(f"[Server] Starting Adaptive Scheduling Platform on port {port}...")
    socketio.run(app, host="0.0.0.0", port=port, debug=True, allow_unsafe_werkzeug=True)
