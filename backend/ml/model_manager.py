"""
Thread-safe Singleton Model Manager for ML Artifacts and SHAP Explainers
"""

import os
import json
import logging
import joblib
from typing import Optional, Dict, Any
from backend.config import Config

logger = logging.getLogger("ml_manager")

class ModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.processing_time_model = None
        self.failure_risk_model = None
        self.shap_explainer = None
        self.metadata = {}
        self.load_all()
        self._initialized = True

    def load_all(self):
        """Loads models and metadata into memory"""
        # 1. Processing Time Model
        if os.path.exists(Config.PROCESSING_TIME_MODEL_PATH):
            try:
                self.processing_time_model = joblib.load(Config.PROCESSING_TIME_MODEL_PATH)
                logger.info("[ML Manager] Loaded Processing Time Regressor.")
                self._init_shap_explainer()
            except Exception as e:
                logger.error(f"[ML Manager] Error loading processing time model: {e}")

        # 2. Failure Risk Model
        if os.path.exists(Config.FAILURE_RISK_MODEL_PATH):
            try:
                self.failure_risk_model = joblib.load(Config.FAILURE_RISK_MODEL_PATH)
                logger.info("[ML Manager] Loaded Machine Failure Classifier.")
            except Exception as e:
                logger.error(f"[ML Manager] Error loading failure risk model: {e}")

        # 3. Metadata
        if os.path.exists(Config.METRICS_PATH):
            try:
                with open(Config.METRICS_PATH, "r") as f:
                    self.metadata = json.load(f)
            except Exception:
                pass

    def _init_shap_explainer(self):
        if self.processing_time_model is not None:
            try:
                import shap
                self.shap_explainer = shap.TreeExplainer(self.processing_time_model)
                logger.info("[ML Manager] Initialized SHAP TreeExplainer.")
            except Exception as e:
                logger.warning(f"[ML Manager] SHAP TreeExplainer init note: {e}")

    def get_processing_time_model(self):
        if self.processing_time_model is None:
            self.load_all()
        return self.processing_time_model

    def get_failure_risk_model(self):
        if self.failure_risk_model is None:
            self.load_all()
        return self.failure_risk_model

    def get_shap_explainer(self):
        return self.shap_explainer

    def get_metadata(self) -> Dict[str, Any]:
        return self.metadata

model_manager = ModelManager()
