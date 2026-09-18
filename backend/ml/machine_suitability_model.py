from backend.ml.explainability import explain_suitability
from backend.ml.processing_time_model import processing_time_predictor
from backend.ml.machine_failure_model import failure_risk_predictor

class MachineSuitabilityScorer:
    """
    Evaluates and ranks alternative candidate machines for an affected order operation.
    Provides recommendation signal without overriding hard optimization constraints.
    """
    def score_candidate(self, candidate_machine, order, operation, available_workers, material):
        # 1. Check capability
        process_match = (candidate_machine.process_id == operation.process_id)
        if not process_match:
            for cap in candidate_machine.capabilities:
                if cap.process_id == operation.process_id:
                    process_match = True
                    break

        req_precision = order.product.required_precision if (hasattr(order, 'product') and order.product) else "HIGH"
        precision_match = (candidate_machine.precision_level == "HIGH" or req_precision == "MEDIUM")

        # 2. Check availability
        is_available = (candidate_machine.status in ["AVAILABLE", "IDLE"])
        
        # 3. Check worker availability
        worker_available = any(
            w.is_available and any(s.process_id == operation.process_id for s in w.skills)
            for w in available_workers
        ) if available_workers else True

        # 4. Check material availability
        req_qty = order.quantity * (order.product.material_qty_per_unit if hasattr(order, 'product') and order.product else 2.0)
        material_available = (material.available_quantity >= req_qty) if material else True

        # 5. ML Processing Time & Failure Risk
        pred_res = processing_time_predictor.predict(candidate_machine, order, operation)
        pred_time = pred_res["predicted_processing_time"]
        setup_time = candidate_machine.setup_time_min or 15.0

        risk_res = failure_risk_predictor.predict_risk(candidate_machine)
        fail_risk = risk_res["failure_risk_probability"]

        # Cost calculation
        total_hours = (pred_time + setup_time) / 60.0
        cost = total_hours * candidate_machine.hourly_rate

        # Baseline scoring weights
        # Availability (25%), Precision (20%), Processing time (20%), Worker (10%), Material (10%), Risk (10%), Cost (5%)
        score = 0.0
        if process_match and precision_match:
            score += 20.0
        else:
            return {
                "machine_id": candidate_machine.id,
                "machine_name": candidate_machine.name,
                "lane_id": candidate_machine.lane_id,
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

        # Processing time efficiency (shorter is better)
        time_efficiency = max(0.0, min(15.0, (90.0 - pred_time) / 3.0))
        score += time_efficiency

        # Low failure risk bonus (up to 10 points)
        risk_bonus = max(0.0, (1.0 - fail_risk) * 10.0)
        score += risk_bonus

        # Cost factor
        cost_score = max(0.0, min(5.0, (2500.0 - cost) / 300.0))
        score += cost_score

        eval_data = {
            "is_available": is_available,
            "precision_match": precision_match,
            "precision_level": candidate_machine.precision_level,
            "worker_available": worker_available,
            "material_available": material_available,
            "predicted_processing_time": pred_time,
            "production_cost": cost
        }

        reasons = explain_suitability(eval_data)

        return {
            "machine_id": candidate_machine.id,
            "machine_name": candidate_machine.name,
            "lane_id": candidate_machine.lane_id,
            "suitability_score": round(score, 1),
            "is_feasible": True,
            "predicted_processing_time": pred_time,
            "setup_time_min": setup_time,
            "production_cost": round(cost, 2),
            "failure_risk_pct": round(fail_risk * 100, 1),
            "is_available": is_available,
            "worker_available": worker_available,
            "material_available": material_available,
            "feature_contributions": pred_res["feature_contributions"],
            "reasons": reasons
        }

suitability_scorer = MachineSuitabilityScorer()
