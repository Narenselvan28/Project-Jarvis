import pytest
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.ml.prediction import predict_processing_time, predict_machine_risk
from backend.ml.machine_suitability_model import suitability_scorer
from backend.ml.explainability import explain_processing_time

def test_ml_processing_time_prediction(app):
    m = machine_repo.get_by_id("CUT-01") or machine_repo.get_all_machines()[0]
    order = order_repo.get_by_id("ORD-1042") or {"id": "ORD-1042", "quantity": 12000, "priority": "URGENT"}
    op = order.get("operations", [{}])[0] if order.get("operations") else {"sequence": 1, "process_id": "P01"}

    res = predict_processing_time(m, order, op)
    assert "predicted_processing_time" in res
    assert res["predicted_processing_time"] > 10.0
    assert "explainability" in res

def test_ml_failure_risk_prediction(app):
    m04 = machine_repo.get_by_id("CUT-02") or machine_repo.get_all_machines()[0]
    res = predict_machine_risk(m04)
    assert "failure_probability" in res or "failure_risk_probability" in res
    prob = res.get("failure_probability", res.get("failure_risk_probability", 0.1))
    assert 0.0 <= prob <= 1.0

def test_suitability_scorer(app):
    m = machine_repo.get_by_id("CUT-01") or machine_repo.get_all_machines()[0]
    order = order_repo.get_by_id("ORD-1042") or {"id": "ORD-1042", "quantity": 12000, "priority": "URGENT"}
    op = {"sequence": 1, "process_id": m.get("process_id", "P03")}

    score_res = suitability_scorer.score_candidate(m, order, op, [], None)
    assert score_res["is_feasible"] is True
    assert score_res["suitability_score"] > 30.0
    assert "reasons" in score_res
