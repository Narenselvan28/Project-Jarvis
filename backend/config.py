import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    BASE_DIR = BASE_DIR
    SECRET_KEY = os.getenv("SECRET_KEY", "adaptive-scheduling-secret-key-prod-2026")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-super-secret-scheduling-key-2026")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_EXPIRES_HOURS", "24")))

    # MongoDB Configuration
    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb://127.0.0.1:27017/production_planning"
    )
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "production_planning")

    # Legacy SQL settings retained for backward-compatibility if needed
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
    MYSQL_DB = os.getenv("MYSQL_DB", "adaptive_factory")
    DB_DRIVER = os.getenv("DB_DRIVER", "mongo")  # default to 'mongo'
    
    sqlite_path = os.path.join(BASE_DIR, "adaptive_factory.db")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{sqlite_path}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    # OR-Tools CP-SAT Solver Configuration & Multi-Objective Weights
    CP_SAT_TIME_LIMIT_SECONDS = int(os.getenv("CP_SAT_TIME_LIMIT_SECONDS", "30"))
    
    # Baseline weights
    WEIGHT_TARDINESS = float(os.getenv("WEIGHT_TARDINESS", "10.0"))
    WEIGHT_COST = float(os.getenv("WEIGHT_COST", "1.0"))
    WEIGHT_DOWNTIME = float(os.getenv("WEIGHT_DOWNTIME", "2.0"))
    WEIGHT_SCHEDULE_CHANGE = float(os.getenv("WEIGHT_SCHEDULE_CHANGE", "5.0"))
    WEIGHT_OPERATIONAL_RISK = float(os.getenv("WEIGHT_OPERATIONAL_RISK", "4.0"))

    # OPTION A (Deadline Protection) weights
    OPTION_A_WEIGHTS = {
        "tardiness": 50.0,
        "deadline_penalty": 100.0,
        "cost": 1.0,
        "schedule_change": 2.0,
        "risk": 3.0
    }

    # OPTION B (Cost & Schedule Stability) weights
    OPTION_B_WEIGHTS = {
        "tardiness": 5.0,
        "deadline_penalty": 10.0,
        "cost": 30.0,
        "schedule_change": 40.0,
        "risk": 5.0
    }

    # ML Model Paths
    ML_MODEL_DIR = os.path.join(BASE_DIR, "ml", "models")
    PROCESSING_TIME_MODEL_PATH = os.path.join(ML_MODEL_DIR, "processing_time_model.joblib")
    FAILURE_RISK_MODEL_PATH = os.path.join(ML_MODEL_DIR, "failure_risk_model.joblib")
    METRICS_PATH = os.path.join(ML_MODEL_DIR, "training_metrics.json")
