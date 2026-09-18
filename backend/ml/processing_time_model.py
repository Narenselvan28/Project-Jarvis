import os
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
        """
        feats = extract_processing_features(machine, order, operation, worker)
        
        if self.model is not None:
            try:
                df = pd.DataFrame([feats])[PROCESSING_TIME_FEATURES]
                pred = float(self.model.predict(df)[0])
            except Exception as e:
                pred = self._heuristic_fallback(feats, machine)
        else:
            pred = self._heuristic_fallback(feats, machine)

        # Apply bounds & speed factor
        pred = max(15.0, round(pred, 1))
        contributions = explain_processing_time(feats, pred, base_val=getattr(machine, 'base_cycle_time', 60.0))

        return {
            "predicted_processing_time": pred,
            "feature_contributions": contributions,
            "explainability": contributions,
            "features_used": feats
        }

    def _heuristic_fallback(self, feats, machine):
        """
        Deterministic physics-based calculation if ML model is not yet compiled.
        """
        base = getattr(machine, 'base_cycle_time', 60.0)
        speed = getattr(machine, 'speed_factor', 1.0)
        setup = getattr(machine, 'setup_time_min', 15.0)
        qty_factor = (feats.get("quantity", 50.0) / 50.0) ** 0.6
        skill_bonus = (feats.get("worker_skill", 3.0) - 3.0) * 2.5
        util_penalty = (feats.get("historical_machine_utilization", 75.0) - 70.0) * 0.15
        
        time_est = (base / max(0.5, speed)) * qty_factor + setup * 0.2 + util_penalty - skill_bonus
        return float(time_est)

processing_time_predictor = ProcessingTimePredictor()
