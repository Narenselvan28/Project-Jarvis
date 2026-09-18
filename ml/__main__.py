"""
ARIVON ML CLI Package
"""

import sys

def main():
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd == "train":
            from ml.train import main as train_main
            train_main()
            return
        elif cmd == "evaluate":
            from ml.evaluate import evaluate
            evaluate()
            return
        elif cmd == "predict":
            from ml.predict import predict_sample
            predict_sample()
            return

    print("Usage: python -m ml [train | evaluate | predict]")

if __name__ == "__main__":
    main()
