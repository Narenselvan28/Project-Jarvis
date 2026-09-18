import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.seed.seed_mongo import seed_mongo
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

    # 2. Reset and seed MongoDB database
    print("[Demo Reset] Re-seeding factory MongoDB operational database...")
    seed_mongo()

    print("=" * 65)
    print("  DEMO STATE READY:")
    print("  - 50+ individually addressable machines across 3 lines")
    print("  - Order ORD-1042 (12,000 pcs, URGENT, 12h) is active on CUT-02")
    print("  - CUT-01 is available as an alternative cutting station")
    print("  - Login credentials:")
    print("      Manager:        manager / password123")
    print("      Supervisor:     supervisor / password123")
    print("      Service Person: service / password123")
    print("=" * 65)
