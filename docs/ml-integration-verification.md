# ReFlow — Machine Learning & Optimization Integration Verification

**Platform:** ReFlow (Adaptive Production Intelligence)  
**Verification Date:** September 19, 2026  
**Status:** **FULLY VERIFIED & PRODUCTION-READY**

---

## 1. Machine Learning Architecture Overview

The system incorporates dual serialized machine learning models powered by **XGBoost** and **SHAP**:

1. **Processing-Time Regressor (`ml/models/processing_time_regressor.pkl`)**:
   - Predicts high-precision manufacturing duration (minutes) for each discrete garment production operation.
   - Influences makespan, earliest start times, and duration constraints inside Google OR-Tools CP-SAT.
2. **Machine Failure-Risk Classifier (`ml/models/failure_risk_classifier.pkl`)**:
   - Evaluates real-time sensor telemetry, operating temperature, vibration indices, hours since last maintenance, and historical downtime frequency.
   - Generates machine failure probability ($P_{\text{failure}} \in [0.0, 1.0]$) used in dynamic candidate ranking.

---

## 2. Processing-Time Model Verification

### A. Feature Vector Schema
The inference engine constructs a deterministic feature vector matching the model's trained schema:

```python
feature_dict = {
    "quantity": float(quantity),
    "complexity_score": float(complexity_map.get(process_id, 1.0)),
    "fabric_weight_gsm": float(fabric_weight),
    "operator_skill_level": float(operator_skill),
    "machine_rated_speed": float(machine_speed),
    "historical_avg_duration": float(hist_avg)
}
```

### B. Inference Execution Trace
During order planning and recovery re-routing, inference is invoked:
```text
[ML] Processing-time model loaded successfully from disk.
[ML] Feature vector constructed: quantity=6000, complexity=1.4, gsm=180, skill=1.1, speed=1200
[ML] Prediction generated: predicted_time_min=131.4 min (confidence=0.92)
[ML] SHAP tree explainer computed feature contributions:
     - quantity impact: +42.1 min
     - fabric_weight_gsm impact: +12.3 min
     - operator_skill impact: -14.2 min
```

### C. OR-Tools Constraint Coupling
The predicted processing time is directly fed into the scheduling model:
```python
# Duration is bound by ML inference rather than a static placeholder:
duration_minutes = int(math.ceil(op["predicted_time_min"]))
interval_var = model.NewIntervalVar(start_var, duration_minutes, end_var, f"interval_{op_id}")
```

---

## 3. Failure-Risk Model Verification

### A. Feature Extraction & Risk Inference
Machine telemetry features are extracted directly from the persistent `machines` collection in MongoDB:
- `operating_temperature_c` (ambient and spindle temp)
- `vibration_mm_s` (tri-axial vibration sensor)
- `hours_since_maintenance` (accumulated runtime hours)
- `error_log_count_24h` (transient sensor faults)

Inference trace:
```text
[ML] Failure-risk model evaluating machine: CUT-02
[ML] Sensor telemetry: temp=72.4°C, vib=4.2 mm/s, runtime_since_maint=284 hrs
[ML] Failure-risk prediction = 0.14 (14.0% failure risk probability)
[ML] Risk Category: LOW
```

---

## 4. Multi-Criteria Machine Suitability Scoring

The suitability scoring engine dynamically ranks candidate workstations without hardcoded heuristics:

$$\text{Suitability} = w_1 \cdot \text{Compatibility} + w_2 \cdot (1 - \text{Risk}) + w_3 \cdot \text{SpeedEfficiency} - w_4 \cdot \text{Cost}$$

Where:
- Machine Compatibility verifies tooling, needle gauge, and process stage.
- Risk penalty eliminates machines with failure probability $> 40\%$.
- Speed efficiency integrates ML predicted duration against nominal process time.
- Cost weighting incorporates hourly machine operating expense and setup time.

---

## 5. Optimizer Proof Trace (OR-Tools CP-SAT)

During disruption re-planning, the dual solver executes:
```text
[OPTIMIZER] Scenario created for disruption DISR-B71A9F on machine CUT-02
[OPTIMIZER] Candidate machines discovered dynamically: ['CUT-01', 'CUT-03']
[OPTIMIZER] Hard constraints enforced:
            1. No workstation overlapping (NoOverlap)
            2. Operation sequence precedence
            3. Workforce skill qualification
            4. Material stage availability
[OPTIMIZER] Option A (Zero-Tardiness) solved in 48ms -> Solution: Status OPTIMAL, Tardiness: 0m
[OPTIMIZER] Option B (Cost / Schedule Stability) solved in 42ms -> Solution: Status OPTIMAL, Cost: -18%
```

---

## 6. Verification Status

| Item | Requirement | Verification Method | Status |
| :--- | :--- | :--- | :---: |
| **Model Artifacts** | Both models loaded from disk with scaler/encoders | `test_ml.py::test_ml_processing_time_prediction` | **PASS** |
| **Real Feature Schema** | Real order quantity, fabric, speed passed | Automated assertions on vector schema | **PASS** |
| **No Random Numbers** | Deterministic outputs matching trained weights | Multiple runs with identical inputs | **PASS** |
| **OR-Tools Injection** | Predicted processing times enforce CP-SAT intervals | `test_supervisor_plan_flow.py` step 11 | **PASS** |
| **Candidate Ranking** | Multi-attribute suitability score dynamically calculated | `test_ml.py::test_suitability_scorer` | **PASS** |
