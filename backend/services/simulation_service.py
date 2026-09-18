"""
What-If Sandboxed Production Simulation Service (Non-Mutating)
"""

import copy
from typing import Dict, Any, List
from backend.repositories.machine_repository import machine_repo
from backend.repositories.order_repository import order_repo
from backend.repositories.factory_repository import factory_repo
from backend.optimization.candidate_machine_selector import find_candidate_machines
from backend.optimization.scheduler import production_scheduler
from backend.services.impact_analysis_service import impact_analysis_service

class SimulationService:
    @staticmethod
    def run_what_if(machine_id: str, failure_type: str = "Mechanical Breakdown", duration_hours: float = 6.0) -> Dict[str, Any]:
        """
        Pure in-memory simulation: snapshots current production state,
        models disruption, runs candidate discovery, ML, and OR-Tools CP-SAT,
        and returns projected impact WITHOUT altering MongoDB.
        """
        target_machine = machine_repo.get_by_id(machine_id)
        if not target_machine:
            return {
                "error": f"Machine {machine_id} not found in factory",
                "is_feasible": False
            }

        # 1. Non-destructive impact analysis
        impact = impact_analysis_service.analyze_failure_impact(machine_id, duration_hours)

        # 2. In-memory deep snapshot of affected orders and factory machines
        all_machines = {m["id"]: copy.deepcopy(m) for m in machine_repo.get_all_machines()}
        affected_orders = [copy.deepcopy(o) for o in impact.get("affected_orders", [])]

        # 3. Candidate discovery & ML predictions on snapshotted data
        compatible_map = {}
        candidate_summary = []
        for order in affected_orders:
            for op in order.get("operations", []):
                if op.get("assigned_machine_id") == machine_id:
                    proc_id = op.get("process_id")
                    cands = find_candidate_machines(
                        failed_machine_id=machine_id,
                        process_id=proc_id,
                        order=order,
                        operation=op,
                        required_precision="HIGH"
                    )
                    compatible_map[proc_id] = cands
                    candidate_summary.extend(cands)

        # 4. Hypothetical CP-SAT solve (strictly in-memory)
        recovery_options = None
        if affected_orders:
            recovery_options = production_scheduler.generate_two_recovery_options(
                failed_machine_id=machine_id,
                failure_duration_hours=duration_hours,
                affected_orders=affected_orders,
                compatible_candidates_map=compatible_map,
                all_machines=all_machines
            )

        return {
            "simulation_mode": "WHAT_IF_SANDBOX",
            "persisted": False,
            "machine_id": machine_id,
            "failure_type": failure_type,
            "duration_hours": duration_hours,
            "impact_analysis": impact,
            "candidate_evaluations": candidate_summary,
            "projected_recovery_options": recovery_options
        }

simulation_service = SimulationService()
