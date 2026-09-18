import json
from datetime import datetime
from backend.extensions import db

class MLPrediction(db.Model):
    __tablename__ = "ml_predictions"

    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.String(20), db.ForeignKey("machines.id"), nullable=False, index=True)
    order_id = db.Column(db.String(50), nullable=True, index=True)
    operation_id = db.Column(db.Integer, nullable=True)
    
    predicted_processing_time = db.Column(db.Float, nullable=False)
    predicted_failure_risk = db.Column(db.Float, nullable=False)
    suitability_score = db.Column(db.Float, nullable=False)
    
    feature_contributions_json = db.Column(db.Text, nullable=True) # JSON of feature impacts (SHAP-style)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        contributions = {}
        if self.feature_contributions_json:
            try:
                contributions = json.loads(self.feature_contributions_json)
            except Exception:
                contributions = {}
        return {
            "id": self.id,
            "machine_id": self.machine_id,
            "order_id": self.order_id,
            "predicted_processing_time": round(self.predicted_processing_time, 1),
            "predicted_failure_risk": round(self.predicted_failure_risk * 100, 1),
            "suitability_score": round(self.suitability_score, 1),
            "feature_contributions": contributions,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
