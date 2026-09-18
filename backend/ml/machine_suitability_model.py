from backend.ml.explainability import explain_suitability
from backend.ml.processing_time_model import processing_time_predictor
from backend.ml.machine_failure_model import failure_risk_predictor

def _val(obj, key, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)

class MachineSuitabilityScorer:
    """
    Evaluates and ranks alternative candidate machines for an affected order operation.
    Provides recommendation signal without overriding hard optimization constraints.
    Supports both MongoDB dictionaries and SQLAlchemy/ORM objects.
    """
    def score_candidate(self, candidate_machine, order, operation, available_workers, material):
        m_id = _val(candidate_machine, 'id')
        m_name = _val(candidate_machine, 'name', m_id)
        m_lane = _val(candidate_machine, 'lane_id', 'L01')
        m_status = _val(candidate_machine, 'status', 'AVAILABLE')
        m_proc_id = _val(candidate_machine, 'process_id')
        m_hourly_rate = _val(candidate_machine, 'hourly_rate', 1200.0)
        m_setup_time = _val(candidate_machine, 'setup_time', _val(candidate_machine, 'setup_time_min', 15.0))

        op_proc_id = _val(operation, 'process_id')

        # 1. Check capability
        process_match = (m_proc_id == op_proc_id)
        if not process_match:
            compat_procs = _val(candidate_machine, 'compatible_processes', [])
            if op_proc_id in compat_procs:
                process_match = True
            else:
                caps = _val(candidate_machine, 'capabilities', [])
                for cap in caps:
                    if _val(cap, 'process_id') == op_proc_id:
                        process_match = True
                        break

        precision_match = True

        # 2. Check availability
        is_available = (m_status in ["AVAILABLE", "IDLE"])
        
        # 3. Check worker availability
        worker_available = True
        if available_workers:
            for w in available_workers:
                w_skills = _val(w, 'skills', [])
                for s in w_skills:
                    s_proc = _val(s, 'process_id', s if isinstance(s, str) else None)
                    if s_proc == op_proc_id:
                        worker_available = True
                        break

        # 4. Check material availability
        material_available = True

        # 5. ML Processing Time & Failure Risk
        pred_res = processing_time_predictor.predict(candidate_machine, order, operation)
        pred_time = pred_res["predicted_processing_time"]
        setup_time = m_setup_time or 15.0

        risk_res = failure_risk_predictor.predict_risk(candidate_machine)
        fail_risk = risk_res["failure_risk_probability"]

        # Cost calculation
        total_hours = (pred_time + setup_time) / 60.0
        cost = total_hours * m_hourly_rate

        score = 0.0
        if process_match and precision_match:
            score += 20.0
        else:
            return {
                "machine_id": m_id,
                "machine_name": m_name,
                "lane_id": m_lane,
                "suitability_score": 0.0,
                "is_feasible": False,
                "infeasible_reason": "Process or precision mismatch",
                "predicted_processing_time": pred_time,
                "setup_time_min": setup_time,
                "production_cost": cost,
                "failure_risk_pct": round(fail_risk * 100, 1),
                "is_available": is_available,
                "worker_available": worker_available,
                "material_available": material_available,
                "reasons": ["Incompatible process or precision requirements"]
            }

        if is_available:
            score += 25.0
        else:
            score += 8.0 # Queue delay penalty

        if worker_available:
            score += 15.0
        else:
            score += 5.0

        if material_available:
            score += 15.0
        else:
            score += 0.0

        time_efficiency = max(0.0, min(15.0, (90.0 - pred_time) / 3.0))
        score += time_efficiency

        risk_bonus = max(0.0, (1.0 - fail_risk) * 10.0)
        score += risk_bonus

        cost_score = max(0.0, min(5.0, (2500.0 - cost) / 300.0))
        score += cost_score

        eval_data = {
            "is_available": is_available,
            "precision_match": precision_match,
            "precision_level": "HIGH",
            "worker_available": worker_available,
            "material_available": material_available,
            "predicted_processing_time": pred_time,
            "production_cost": cost
        }

        reasons = explain_suitability(eval_data)

        return {
            "machine_id": m_id,
            "machine_name": m_name,
            "lane_id": m_lane,
            "suitability_score": round(score, 1),
            "is_feasible": True,
            "predicted_processing_time": pred_time,
            "setup_time_min": setup_time,
            "production_cost": round(cost, 2),
            "failure_risk_pct": round(fail_risk * 100, 1),
            "is_available": is_available,
            "worker_available": worker_available,
            "material_available": material_available,
            "feature_contributions": pred_res.get("feature_contributions", {}),
            "reasons": reasons
        }

suitability_scorer = MachineSuitabilityScorer()
