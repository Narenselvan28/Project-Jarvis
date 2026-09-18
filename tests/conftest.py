import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import mongomock
from backend.app import create_app
from backend.config import Config
from backend.database.mongo import MongoDBManager
from backend.seed.seed_mongo import seed_mongo

class TestConfig(Config):
    TESTING = True
    MONGO_URI = "mock://test_db"
    MONGO_DB_NAME = "test_production_planning"

@pytest.fixture(scope="session", autouse=True)
def init_test_env():
    # Ensure models are trained for tests
    from backend.ml.training import train_all_models
    if not os.path.exists(Config.PROCESSING_TIME_MODEL_PATH) or not os.path.exists(Config.FAILURE_RISK_MODEL_PATH):
        train_all_models()

@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        # Seed MongoDB test data
        seed_mongo()
        yield app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def manager_token(client):
    res = client.post("/api/v1/auth/login", json={"username": "manager", "password": "password123"})
    if res.status_code != 200:
        res = client.post("/api/auth/login", json={"username": "manager", "password": "password123"})
    data = res.get_json()
    token = data.get("data", {}).get("access_token") or data.get("access_token")
    return token

@pytest.fixture
def supervisor_token(client):
    res = client.post("/api/v1/auth/login", json={"username": "supervisor", "password": "password123"})
    if res.status_code != 200:
        res = client.post("/api/auth/login", json={"username": "supervisor", "password": "password123"})
    data = res.get_json()
    token = data.get("data", {}).get("access_token") or data.get("access_token")
    return token

@pytest.fixture
def service_token(client):
    res = client.post("/api/v1/auth/login", json={"username": "service", "password": "password123"})
    if res.status_code != 200:
        res = client.post("/api/auth/login", json={"username": "service", "password": "password123"})
    data = res.get_json()
    token = data.get("data", {}).get("access_token") or data.get("access_token")
    return token

@pytest.fixture
def auth_headers(manager_token, supervisor_token, service_token):
    return {
        "manager": {"Authorization": f"Bearer {manager_token}"},
        "supervisor": {"Authorization": f"Bearer {supervisor_token}"},
        "service": {"Authorization": f"Bearer {service_token}"}
    }

