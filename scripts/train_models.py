import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.ml.training import train_all_models

if __name__ == "__main__":
    print("[Scripts] Starting ML model training pipeline...")
    train_all_models()
    print("[Scripts] ML model training complete!")
