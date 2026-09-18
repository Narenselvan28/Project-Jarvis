import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.seed.seed_database import seed
from backend.ml.training import train_all_models
from backend.config import Config

if __name__ == "__main__":
    print("=" * 65)
    print("  ADAPTIVE FACTORY PLATFORM: GUARANTEED DEMO RESET")
    print("=" * 65)
    
    # 1. Check/Train models if missing
    if not os.path.exists(Config.PROCESSING_TIME_MODEL_PATH) or not os.path.exists(Config.FAILURE_RISK_MODEL_PATH):
        print("[Demo Reset] ML models missing. Training now...")
        train_all_models()
    else:
        print("[Demo Reset] Verified ML models present.")

    # 2. Reset and seed database
    print("[Demo Reset] Re-seeding factory operational database...")
    seed()

    print("=" * 65)
    print("  DEMO STATE READY:")
    print("  - Lane 01: M01 -> M02 -> M03 -> M04 -> M05")
    print("  - Order ORD-1042 (URGENT, 12h) is RUNNING on M04")
    print("  - M09 and M14 are ready as alternative finishing machines")
    print("  - Login credentials:")
    print("      Manager:        manager / password123")
    print("      Supervisor:     supervisor / password123")
    print("      Service Person: service / password123")
    print("=" * 65)
