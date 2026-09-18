"""
ReFlow Processing Time Predictor (XGBoost Regressor)
Predicts job processing cycle time with feature attribution explainability.
Guarantees strict schema contract: prediction_id, model, prediction, confidence, explanation, timestamp.
"""

import os
import uuid
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from backend.config import Config
from backend.ml.feature_engineering import PROCESSING_TIME_FEATURES, extract_processing_features
from backend.ml.explainability import explain_processing_time

class ProcessingTimePredictor:
    def __init__(self, model_path=None):
        self.model_path = model_path or Config.PROCESSING_TIME_MODEL_PATH
        self.model = None
        self.model_name = "processing_time_xgboost"
        self.model_version = "1.2.0"
        self._load_model()

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
            except Exception as e:
                print(f"[ML] Warning: Could not load processing time model from {self.model_path}: {e}")
                self.model = None

    def predict(self, machine, order, operation, worker=None):
        """
        Predicts processing time in minutes with feature attribution explainability.
        Strictly returns validated numerical bounds with no NaN/Infinity.
        """
        feats = extract_processing_features(machine, order, operation, worker)
        is_valid = True
        validation_notes = []

        # Validate features
        qty = feats.get("quantity", 0)
        if qty <= 0:
            is_valid = False
            validation_notes.append("Quantity must be positive.")

        if self.model is not None and is_valid:
            try:
                df = pd.DataFrame([feats])[PROCESSING_TIME_FEATURES]
                pred_val = float(self.model.predict(df)[0])
                if np.isnan(pred_val) or np.isinf(pred_val):
                    pred_val = self._heuristic_fallback(feats, machine)
            except Exception:
                pred_val = self._heuristic_fallback(feats, machine)
        else:
            pred_val = self._heuristic_fallback(feats, machine)

        # Apply realistic physical bounds (e.g. minimum 10 min, max 2880 min)
        pred = max(10.0, min(2880.0, round(float(pred_val), 1)))

        # Compute SHAP / analytical contributions
        contributions_dict = explain_processing_time(feats, pred, base_val=getattr(machine, 'base_cycle_time', 60.0))
        raw_contribs = contributions_dict.get("feature_contributions", {})

        # Standard explanation array
        explanation_list = []
        for f_name, impact_val in raw_contribs.items():
            explanation_list.append({
                "feature": f_name.replace("_", " ").title(),
                "impact": round(float(impact_val), 2)
            })
        explanation_list.sort(key=lambda x: abs(x["impact"]), reverse=True)

        prediction_id = f"PRED-TIME-{str(uuid.uuid4())[:8].upper()}"
        confidence = 0.92 if self.model is not None else 0.85

        return {
            "prediction_id": prediction_id,
            "model": {
                "name": self.model_name,
                "version": self.model_version
            },
            "prediction": {
                "value": pred,
                "unit": "minutes",
                "formatted": f"Predicted Time: {pred:.1f} min"
            },
            "confidence": confidence,
            "explanation": explanation_list[:5],
            "timestamp": datetime.utcnow().isoformat(),
            "input_validation": {
                "status": "VALID" if is_valid else "CORRECTED",
                "valid": is_valid,
                "notes": validation_notes
            },
            # Backwards compatibility fields
            "predicted_processing_time": pred,
            "feature_contributions": contributions_dict,
            "explainability": contributions_dict,
            "features_used": feats
        }

    def _heuristic_fallback(self, feats, machine):
        """
        Deterministic physics-based calculation if ML model is not yet compiled.
        """
        base = getattr(machine, 'base_cycle_time', 60.0) if not isinstance(machine, dict) else machine.get('base_cycle_time', 60.0)
        speed = getattr(machine, 'speed_factor', 1.0) if not isinstance(machine, dict) else machine.get('speed_factor', 1.0)
        setup = getattr(machine, 'setup_time_min', 15.0) if not isinstance(machine, dict) else machine.get('setup_time_min', 15.0)
        qty_factor = (max(1.0, feats.get("quantity", 50.0)) / 50.0) ** 0.6
        skill_bonus = (feats.get("worker_skill", 3.0) - 3.0) * 2.5
        util_penalty = (feats.get("historical_machine_utilization", 75.0) - 70.0) * 0.15
        
        time_est = (base / max(0.5, speed)) * qty_factor + setup * 0.2 + util_penalty - skill_bonus
        return float(time_est)

processing_time_predictor = ProcessingTimePredictor()
