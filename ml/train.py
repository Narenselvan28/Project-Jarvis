"""
CLI Entrypoint: python -m ml.train [processing_time | failure_risk]
"""

import sys
import os

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.ml.training import train_all_models, generate_synthetic_training_data
from backend.ml.feature_engineering import PROCESSING_TIME_FEATURES, FAILURE_RISK_FEATURES
from backend.config import Config
import xgboost as xgb
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, roc_auc_score, f1_score

def train_processing_time():
    print("=" * 60)
    print("  ARIVON ML: Training Processing Time Regressor (XGBoost)")
    print("=" * 60)
    df_proc, _ = generate_synthetic_training_data(n_samples=1600, random_seed=42)
    X = df_proc[PROCESSING_TIME_FEATURES]
    y = df_proc["actual_processing_time"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = xgb.XGBRegressor(
        n_estimators=120,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    os.makedirs(Config.ML_MODEL_DIR, exist_ok=True)
    joblib.dump(model, Config.PROCESSING_TIME_MODEL_PATH)
    print(f"Artifact Saved: {Config.PROCESSING_TIME_MODEL_PATH}")
    print(f"Metrics: MAE={mae:.2f} min | R2={r2:.4f}")
    print("Training Complete [PASS].")

def train_failure_risk():
    print("=" * 60)
    print("  ARIVON ML: Training Machine Failure Risk Classifier (XGBoost)")
    print("=" * 60)
    _, df_fail = generate_synthetic_training_data(n_samples=1600, random_seed=42)
    X = df_fail[FAILURE_RISK_FEATURES]
    y = df_fail["failure_occurred"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.07,
        scale_pos_weight=max(1.0, float(sum(y_train == 0) / max(1, sum(y_train == 1)))),
        eval_metric="logloss",
        random_state=42
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1]
    f1 = f1_score(y_test, preds, zero_division=0)
    auc = roc_auc_score(y_test, proba)

    os.makedirs(Config.ML_MODEL_DIR, exist_ok=True)
    joblib.dump(model, Config.FAILURE_RISK_MODEL_PATH)
    print(f"Artifact Saved: {Config.FAILURE_RISK_MODEL_PATH}")
    print(f"Metrics: F1={f1:.4f} | ROC-AUC={auc:.4f}")
    print("Training Complete [PASS].")

def main():
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    if target in ["processing_time", "processing", "time"]:
        train_processing_time()
    elif target in ["failure_risk", "failure", "risk"]:
        train_failure_risk()
    else:
        train_all_models()

if __name__ == "__main__":
    main()
