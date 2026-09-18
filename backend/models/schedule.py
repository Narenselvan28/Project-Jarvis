from datetime import datetime
from backend.extensions import db

class Schedule(db.Model):
    __tablename__ = "schedules"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    schedule_type = db.Column(db.String(50), nullable=False, default="ADAPTIVE_CP_SAT") 
    # e.g., 'BASELINE_FCFS', 'BASELINE_SPT', 'BASELINE_EDD', 'BASELINE_WSPT', 'ADAPTIVE_CP_SAT'
    
    is_active = db.Column(db.Boolean, default=True)
    makespan_minutes = db.Column(db.Float, default=0.0)
    total_tardiness_minutes = db.Column(db.Float, default=0.0)
    late_orders_count = db.Column(db.Integer, default=0)
    total_production_cost = db.Column(db.Float, default=0.0)
    average_utilization = db.Column(db.Float, default=0.0)
    schedule_changes_count = db.Column(db.Integer, default=0)
    stability_score = db.Column(db.Float, default=100.0) # 0 to 100%
    
    solver_status = db.Column(db.String(50), default="OPTIMAL") # OPTIMAL, FEASIBLE, INFEASIBLE
    solve_time_ms = db.Column(db.Float, default=0.0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "schedule_type": self.schedule_type,
            "is_active": self.is_active,
            "makespan_minutes": round(self.makespan_minutes, 1),
            "makespan_hours": round(self.makespan_minutes / 60.0, 2),
            "total_tardiness_minutes": round(self.total_tardiness_minutes, 1),
            "late_orders_count": self.late_orders_count,
            "total_production_cost": round(self.total_production_cost, 2),
            "average_utilization": round(self.average_utilization, 1),
            "schedule_changes_count": self.schedule_changes_count,
            "stability_score": round(self.stability_score, 1),
            "solver_status": self.solver_status,
            "solve_time_ms": round(self.solve_time_ms, 1),
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
