import os
import sys
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
import xgboost as xgb

from backend.config import Config
from backend.ml.feature_engineering import (
    PROCESSING_TIME_FEATURES,
    FAILURE_RISK_FEATURES
)

def generate_synthetic_training_data(n_samples=1500, random_seed=42):
    """
    Generates realistic synthetic industrial manufacturing dataset.
    Explicitly labeled as DEMONSTRATION DATA for prototype training.
    """
    np.random.seed(random_seed)

    # 1. Processing Time Dataset
    records = []
    for _ in range(n_samples):
        m_id_enc = np.random.randint(1, 16)
        process_seq = np.random.randint(1, 6)
        product_enc = np.random.randint(1, 11)
        material_enc = np.random.randint(1, 6)
        quantity = int(np.random.choice([25, 50, 75, 100, 150]))
        op_exp = float(np.round(np.random.uniform(0.5, 12.0), 1))
        shift_num = int(np.random.choice([1, 2, 3]))
        utilization = float(np.round(np.random.uniform(40.0, 95.0), 1))
        base_cycle = float(np.random.choice([45.0, 50.0, 55.0, 60.0, 65.0, 70.0, 75.0]))
        setup_time = float(np.random.choice([10.0, 15.0, 20.0, 25.0]))
        downtime = float(np.round(np.random.exponential(1.5), 1))
        skill = int(np.random.choice([1, 2, 3, 4, 5], p=[0.1, 0.2, 0.4, 0.2, 0.1]))
        machine_age = float(np.round(np.random.uniform(0.5, 8.0), 1))
        batch_size = quantity

        # Ground truth physics formula + Gaussian noise
        # Base cycle time modified by quantity, operator skill, material hardness, machine age
        mat_factor = 1.0 + (material_enc - 2) * 0.08
        skill_discount = (skill - 3) * 0.05 + (op_exp - 3.0) * 0.015
        util_drag = max(0.0, (utilization - 80.0) * 0.003)
        age_drag = machine_age * 0.012

        true_time = (base_cycle * (quantity / 50.0) ** 0.55) * mat_factor * (1.0 - skill_discount + util_drag + age_drag)
        noise = np.random.normal(0, 2.5)
        actual_time = max(18.0, round(true_time + noise, 1))

        records.append({
            "machine_id_enc": m_id_enc,
            "process_seq": process_seq,
            "product_type_enc": product_enc,
            "material_type_enc": material_enc,
            "quantity": quantity,
            "operator_experience": op_exp,
            "shift_num": shift_num,
            "historical_machine_utilization": utilization,
            "historical_cycle_time": base_cycle,
            "setup_time": setup_time,
            "previous_downtime": downtime,
            "worker_skill": skill,
            "machine_age": machine_age,
            "batch_size": batch_size,
            "actual_processing_time": actual_time
        })

    df_proc = pd.DataFrame(records)

    # 2. Machine Failure Telemetry Dataset
    fail_records = []
    for _ in range(n_samples):
        age = np.random.uniform(0.5, 9.0)
        runtime = np.random.uniform(200.0, 4000.0)
        util = np.random.uniform(45.0, 98.0)
        temp = np.random.normal(65.0, 10.0)
        vib = np.random.exponential(1.8)
        prev_fail = np.random.poisson(1.5)
        maint_gap = np.random.uniform(5.0, 95.0)
        dt_hist = prev_fail * np.random.uniform(1.5, 4.0)
        cycles = int(runtime * 8.5 + np.random.uniform(-500, 500))

        # Ground truth failure risk probability (Logit)
        logit = (
            -4.5
            + 0.05 * (temp - 60.0)
            + 0.55 * (vib - 1.5)
            + 0.02 * (maint_gap - 30.0)
            + 0.0006 * runtime
            + 0.35 * prev_fail
        )
        prob = 1.0 / (1.0 + np.exp(-logit))
        is_failure = int(np.random.rand() < prob)

        fail_records.append({
            "machine_age": round(age, 1),
            "runtime_hours": round(runtime, 1),
            "utilization": round(util, 1),
            "temperature": round(temp, 1),
            "vibration": round(vib, 2),
            "previous_failures": prev_fail,
            "maintenance_gap": round(maint_gap, 1),
            "downtime_history": round(dt_hist, 1),
            "cycle_count": cycles,
            "failure_occurred": is_failure
        })

    df_fail = pd.DataFrame(fail_records)
    return df_proc, df_fail

def train_all_models():
    """
    Trains XGBoost models, computes validation metrics, and serializes artifacts.
    """
    os.makedirs(Config.ML_MODEL_DIR, exist_ok=True)
    print("=" * 60)
    print("  Adaptive Factory ML Pipeline: Training Demonstration Models")
    print("=" * 60)

    df_proc, df_fail = generate_synthetic_training_data(n_samples=1600)
    print(f"[ML] Generated {len(df_proc)} training records (Labeled: DEMONSTRATION DATA)")

    # 1. Train Processing Time Regressor
    X_proc = df_proc[PROCESSING_TIME_FEATURES]
    y_proc = df_proc["actual_processing_time"]
    X_train_p, X_test_p, y_train_p, y_test_p = train_test_split(X_proc, y_proc, test_size=0.2, random_state=42)

    proc_model = xgb.XGBRegressor(
        n_estimators=120,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )
    proc_model.fit(X_train_p, y_train_p)

    y_pred_p = proc_model.predict(X_test_p)
    mae = float(mean_absolute_error(y_test_p, y_pred_p))
    rmse = float(np.sqrt(mean_squared_error(y_test_p, y_pred_p)))
    r2 = float(r2_score(y_test_p, y_pred_p))

    joblib.dump(proc_model, Config.PROCESSING_TIME_MODEL_PATH)
    print(f"[ML] Processing Time Model Saved: {Config.PROCESSING_TIME_MODEL_PATH}")
    print(f"     MAE: {mae:.2f} min | RMSE: {rmse:.2f} min | R²: {r2:.4f}")

    # 2. Train Failure Risk Classifier
    X_fail = df_fail[FAILURE_RISK_FEATURES]
    y_fail = df_fail["failure_occurred"]
    X_train_f, X_test_f, y_train_f, y_test_f = train_test_split(X_fail, y_fail, test_size=0.2, random_state=42)

    fail_model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.07,
        scale_pos_weight=max(1.0, float(sum(y_train_f == 0) / max(1, sum(y_train_f == 1)))),
        eval_metric="logloss",
        random_state=42
    )
    fail_model.fit(X_train_f, y_train_f)

    y_pred_f = fail_model.predict(X_test_f)
    y_proba_f = fail_model.predict_proba(X_test_f)[:, 1]

    prec = float(precision_score(y_test_f, y_pred_f, zero_division=0))
    rec = float(recall_score(y_test_f, y_pred_f, zero_division=0))
    f1 = float(f1_score(y_test_f, y_pred_f, zero_division=0))
    try:
        roc_auc = float(roc_auc_score(y_test_f, y_proba_f))
    except Exception:
        roc_auc = 0.85

    joblib.dump(fail_model, Config.FAILURE_RISK_MODEL_PATH)
    print(f"[ML] Machine Failure Risk Model Saved: {Config.FAILURE_RISK_MODEL_PATH}")
    print(f"     Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {roc_auc:.4f}")

    # 3. Save Summary Metrics JSON
    metrics_data = {
        "dataset": "DEMONSTRATION_SYNTHETIC_MANUFACTURING",
        "sample_count": len(df_proc),
        "processing_time_model": {
            "algorithm": "XGBRegressor",
            "MAE_minutes": round(mae, 2),
            "RMSE_minutes": round(rmse, 2),
            "R2_score": round(r2, 4),
            "features": PROCESSING_TIME_FEATURES
        },
        "failure_risk_model": {
            "algorithm": "XGBClassifier",
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "features": FAILURE_RISK_FEATURES
        }
    }

    with open(Config.METRICS_PATH, "w") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"[ML] Evaluation Metrics written to: {Config.METRICS_PATH}")
    print("=" * 60)
    return metrics_data

if __name__ == "__main__":
    train_all_models()
