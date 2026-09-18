"""
Deterministic Synthetic Demonstration Data Generator
=====================================================
DISCLAIMER: This script generates synthetic DEMONSTRATION DATA for prototype testing
and algorithm verification. It does NOT represent real proprietary company records.
"""

import os
import sys
import json
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.config import Config
from backend.ml.training import generate_synthetic_training_data

def generate_demo_data(n_samples=1600, random_seed=42):
    print("=" * 70)
    print("  ARIVON: Synthetic Factory Demonstration Data Generator")
    print("  LABEL: [DEMONSTRATION DATA]")
    print(f"  Random Seed: {random_seed} | Samples: {n_samples}")
    print("=" * 70)

    df_proc, df_fail = generate_synthetic_training_data(n_samples=n_samples, random_seed=random_seed)

    output_dir = os.path.join(Config.BASE_DIR, "data", "demo")
    os.makedirs(output_dir, exist_ok=True)

    proc_path = os.path.join(output_dir, "demo_cycle_times.csv")
    fail_path = os.path.join(output_dir, "demo_failure_telemetry.csv")

    df_proc.to_csv(proc_path, index=False)
    df_fail.to_csv(fail_path, index=False)

    metadata = {
        "dataset_type": "DEMONSTRATION_SYNTHETIC_DATA",
        "generated_at": pd.Timestamp.now().isoformat(),
        "random_seed": random_seed,
        "sample_count": n_samples,
        "processing_time_records": len(df_proc),
        "telemetry_records": len(df_fail),
        "files": {
            "cycle_times": proc_path,
            "telemetry": fail_path
        }
    }

    meta_path = os.path.join(output_dir, "metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Generator] Wrote {len(df_proc)} cycle time records -> {proc_path}")
    print(f"[Generator] Wrote {len(df_fail)} machine telemetry records -> {fail_path}")
    print(f"[Generator] Wrote metadata summary -> {meta_path}")
    print("=" * 70)
    print("  DATA GENERATION COMPLETE [SUCCESS].")
    print("=" * 70)

if __name__ == "__main__":
    generate_demo_data()
