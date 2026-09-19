"""
V1 API Controllers Blueprint Registration
"""

from backend.routes.v1.auth_controller import auth_v1_bp
from backend.routes.v1.factory_controller import factory_v1_bp
from backend.routes.v1.machines_controller import machines_v1_bp
from backend.routes.v1.orders_controller import orders_v1_bp
from backend.routes.v1.schedules_controller import schedules_v1_bp
from backend.routes.v1.gantt_controller import gantt_v1_bp
from backend.routes.v1.disruptions_controller import disruptions_v1_bp
from backend.routes.v1.maintenance_controller import maintenance_v1_bp
from backend.routes.v1.workers_controller import workers_v1_bp
from backend.routes.v1.materials_controller import materials_v1_bp
from backend.routes.v1.analytics_controller import analytics_v1_bp
from backend.routes.v1.simulation_controller import simulation_v1_bp
from backend.routes.v1.admin_controller import admin_v1_bp
from backend.routes.v1.manager_controller import manager_v1_bp
from backend.routes.v1.audit_controller import audit_v1_bp
from backend.routes.v1.health_controller import health_v1_bp
from backend.routes.v1.erp_controller import erp_v1_bp

def register_v1_blueprints(app):
    app.register_blueprint(health_v1_bp)
    app.register_blueprint(auth_v1_bp)
    app.register_blueprint(factory_v1_bp)
    app.register_blueprint(machines_v1_bp)
    app.register_blueprint(orders_v1_bp)
    app.register_blueprint(schedules_v1_bp)
    app.register_blueprint(gantt_v1_bp)
    app.register_blueprint(disruptions_v1_bp)
    app.register_blueprint(manager_v1_bp)
    app.register_blueprint(maintenance_v1_bp)
    app.register_blueprint(workers_v1_bp)
    app.register_blueprint(materials_v1_bp)
    app.register_blueprint(analytics_v1_bp)
    app.register_blueprint(simulation_v1_bp)
    app.register_blueprint(admin_v1_bp)
    app.register_blueprint(audit_v1_bp)
    app.register_blueprint(erp_v1_bp)
