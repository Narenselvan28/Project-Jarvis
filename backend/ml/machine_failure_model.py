import os
import joblib
import numpy as np
import pandas as pd
from backend.config import Config
from backend.ml.feature_engineering import FAILURE_RISK_FEATURES, extract_failure_features

class MachineFailurePredictor:
    def __init__(self, model_path=None):
        self.model_path = model_path or Config.FAILURE_RISK_MODEL_PATH
        self.model = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
            except Exception as e:
                print(f"[ML] Warning: Could not load failure model from {self.model_path}: {e}")
                self.model = None

    def predict_risk(self, machine):
        """
        Returns failure probability between 0.0 and 1.0.
        """
        feats = extract_failure_features(machine)
        
        if self.model is not None:
            try:
                df = pd.DataFrame([feats])[FAILURE_RISK_FEATURES]
                if hasattr(self.model, "predict_proba"):
                    prob = float(self.model.predict_proba(df)[0][1])
                else:
                    prob = float(self.model.predict(df)[0])
            except Exception as e:
                prob = self._heuristic_fallback(feats)
        else:
            prob = self._heuristic_fallback(feats)

        # Clip probability
        prob = max(0.02, min(0.98, prob))
        return {
            "failure_risk_probability": round(prob, 4),
            "failure_risk_percentage": round(prob * 100, 1),
            "risk_level": "CRITICAL" if prob > 0.75 else ("HIGH" if prob > 0.50 else ("MODERATE" if prob > 0.25 else "LOW")),
            "features_evaluated": feats
        }

    def _heuristic_fallback(self, feats):
        """
        Calculates failure risk using sensor anomaly physics if model is not compiled.
        """
        temp = feats.get("temperature", 65.0)
        vib = feats.get("vibration", 2.0)
        gap = feats.get("maintenance_gap", 30.0)
        runtime = feats.get("runtime_hours", 1200.0)
        
        # Risk factors
        t_score = max(0.0, (temp - 60.0) / 40.0) # Normal ~60C, Alert ~90C
        v_score = max(0.0, (vib - 1.5) / 5.0)    # Normal ~1.5, Alert ~6.0
        m_score = min(1.0, gap / 90.0)            # Overdue maintenance
        r_score = min(1.0, runtime / 3000.0)

        risk = 0.35 * t_score + 0.35 * v_score + 0.20 * m_score + 0.10 * r_score
        return float(risk)

failure_risk_predictor = MachineFailurePredictor()
