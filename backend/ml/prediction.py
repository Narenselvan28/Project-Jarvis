from backend.ml.processing_time_model import processing_time_predictor
from backend.ml.machine_failure_model import failure_risk_predictor
from backend.ml.machine_suitability_model import suitability_scorer

def predict_processing_time(machine, order, operation, worker=None):
    return processing_time_predictor.predict(machine, order, operation, worker)

def predict_machine_risk(machine):
    return failure_risk_predictor.predict_risk(machine)

def rank_candidates(candidates, order, operation, available_workers, material):
    results = []
    for c in candidates:
        eval_res = suitability_scorer.score_candidate(c, order, operation, available_workers, material)
        results.append(eval_res)
    # Sort descending by suitability score
    results.sort(key=lambda x: (x.get("is_feasible", False), x.get("suitability_score", 0)), reverse=True)
    return results
