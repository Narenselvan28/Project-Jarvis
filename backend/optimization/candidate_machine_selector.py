from backend.models.machine import Machine, MachineCapability, MachineState
from backend.models.worker import Worker
from backend.models.material import Material
from backend.ml.prediction import rank_candidates

def find_candidate_machines(failed_machine_id, process_id, order, operation, required_precision="HIGH"):
    """
    Finds all machines capable of performing the specified process across all lanes.
    Excludes the failed machine and machines under maintenance.
    Evaluates capabilities, precision level, worker availability, and material availability.
    Uses ML models to score and rank candidates.
    """
    # 1. Query machines with primary process_id or capability
    potential_machines = Machine.query.filter(
        Machine.id != failed_machine_id,
        Machine.status != MachineState.FAILED.value,
        Machine.status != MachineState.MAINTENANCE.value
    ).all()

    candidates = []
    for m in potential_machines:
        is_compatible = False
        if m.process_id == process_id:
            is_compatible = True
        else:
            for cap in m.capabilities:
                if cap.process_id == process_id:
                    is_compatible = True
                    break

        if is_compatible:
            candidates.append(m)

    # 2. Get available workers with relevant skill
    available_workers = Worker.query.filter(Worker.is_available == True).all()

    # 3. Get material
    material = None
    if hasattr(order, 'product') and order.product and order.product.material_code:
        material = Material.query.filter_by(code=order.product.material_code).first()

    # 4. Rank candidates using ML Suitability Scorer
    ranked = rank_candidates(candidates, order, operation, available_workers, material)
    return ranked
