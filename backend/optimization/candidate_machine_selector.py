from backend.database.mongo import get_collection
from backend.ml.prediction import rank_candidates

def find_candidate_machines(failed_machine_id, process_id, order, operation, required_precision="HIGH"):
    """
    Finds all machines capable of performing the specified process across all lanes.
    Excludes the failed machine and machines under maintenance.
    Evaluates capabilities, precision level, worker availability, and material availability.
    Uses ML models to score and rank candidates.
    """
    db = get_collection("machines").database

    # 1. Query machines with matching process_id or in compatible_processes
    # Exclude failed machine and machines in MAINTENANCE
    query = {
        "id": {"$ne": failed_machine_id},
        "status": {"$nin": ["FAILED", "MAINTENANCE"]},
        "$or": [
            {"process_id": process_id},
            {"compatible_processes": process_id}
        ]
    }
    candidates = list(get_collection("machines").find(query, {"_id": 0}))

    # If none found directly, search all non-failed machines in the same process category
    if not candidates:
        fallback_query = {
            "id": {"$ne": failed_machine_id},
            "status": {"$ne": "FAILED"}
        }
        all_machs = list(get_collection("machines").find(fallback_query, {"_id": 0}))
        candidates = [m for m in all_machs if m.get("process_id") == process_id]

    # 2. Get available workers with relevant skill
    available_workers = list(get_collection("workers").find({"is_available": True}, {"_id": 0}))

    # 3. Get material inventory
    materials = list(get_collection("materials").find({}, {"_id": 0}))
    material = materials[0] if materials else None

    # 4. Rank candidates using ML Suitability Scorer
    ranked = rank_candidates(candidates, order, operation, available_workers, material)
    return ranked
