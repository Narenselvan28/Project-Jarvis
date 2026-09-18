from backend.routes.auth import auth_bp
from backend.routes.dashboard import dashboard_bp
from backend.routes.machines import machines_bp
from backend.routes.lanes import lanes_bp
from backend.routes.orders import orders_bp
from backend.routes.planning import planning_bp
from backend.routes.gantt import gantt_bp
from backend.routes.schedules import schedules_bp
from backend.routes.disruptions import disruptions_bp
from backend.routes.maintenance import maintenance_bp
from backend.routes.workers import workers_bp
from backend.routes.materials import materials_bp
from backend.routes.analytics import analytics_bp
from backend.routes.simulation import simulation_bp
from backend.routes.audit_logs import audit_bp

def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(machines_bp)
    app.register_blueprint(lanes_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(planning_bp)
    app.register_blueprint(gantt_bp)
    app.register_blueprint(schedules_bp)
    app.register_blueprint(disruptions_bp)
    app.register_blueprint(maintenance_bp)
    app.register_blueprint(workers_bp)
    app.register_blueprint(materials_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(simulation_bp)
    app.register_blueprint(audit_bp)
