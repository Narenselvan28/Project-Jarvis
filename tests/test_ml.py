import pytest
from backend.models.machine import Machine
from backend.models.order import Order
from backend.ml.prediction import predict_processing_time, predict_machine_risk
from backend.ml.machine_suitability_model import suitability_scorer

def test_ml_processing_time_prediction(isolated_db):
    m = Machine.query.get("M09")
    order = Order.query.get("ORD-1042")
    op4 = order.operations[3]

    res = predict_processing_time(m, order, op4)
    assert "predicted_processing_time" in res
    assert res["predicted_processing_time"] > 20.0
    assert "feature_contributions" in res

def test_ml_failure_risk_prediction(isolated_db):
    m04 = Machine.query.get("M04")
    res = predict_machine_risk(m04)
    assert "failure_risk_percentage" in res
    assert 0.0 <= res["failure_risk_probability"] <= 1.0

def test_suitability_scorer(isolated_db):
    m09 = Machine.query.get("M09")
    order = Order.query.get("ORD-1042")
    op4 = order.operations[3]

    score_res = suitability_scorer.score_candidate(m09, order, op4, [], None)
    assert score_res["is_feasible"] is True
    assert score_res["suitability_score"] > 50.0
