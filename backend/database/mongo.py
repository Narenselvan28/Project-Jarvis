import os
import json
import logging
from datetime import datetime
from pymongo import MongoClient
import mongomock

logger = logging.getLogger("mongo_db")

class MongoDBManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MongoDBManager, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, uri=None, db_name="production_planning"):
        if self._initialized:
            return

        self.uri = uri or os.getenv(
            "MONGO_URI",
            "mongodb://127.0.0.1:27017/production_planning"
        )
        self.db_name = db_name or os.getenv("MONGO_DB_NAME", "production_planning")
        self.client = None
        self.db = None
        self.is_atlas = False
        self.is_mock = False
        self._connect()
        self._init_collections()
        self._initialized = True

    def _connect(self):
        # 1. Attempt connection to provided URI (Atlas)
        if self.uri and not self.uri.startswith("mock://"):
            try:
                client = MongoClient(
                    self.uri,
                    serverSelectionTimeoutMS=2000,
                    connectTimeoutMS=2000,
                    socketTimeoutMS=3000
                )
                client.admin.command('ping')
                self.client = client
                self.db = client[self.db_name]
                self.is_atlas = "mongodb.net" in self.uri
                logger.info(f"[MongoDB] Successfully connected to {'Atlas cluster' if self.is_atlas else 'MongoDB server'}: {self.db_name}")
                print(f"[MongoDB] Connected to {'Atlas' if self.is_atlas else 'Live Mongo'} database: {self.db_name}")
                return
            except Exception as e:
                logger.warning(f"[MongoDB] Could not connect to Atlas ({e}). Trying local MongoDB server at 127.0.0.1:27017...")
                print(f"[MongoDB] Notice: Remote Atlas unreachable ({e.__class__.__name__}). Trying local MongoDB server...")

        # 2. Attempt connection to native local MongoDB Server (127.0.0.1:27017)
        try:
            local_client = MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=2000)
            local_client.admin.command('ping')
            self.client = local_client
            self.db = local_client[self.db_name]
            self.is_atlas = False
            self.is_mock = False
            print(f"[MongoDB] Successfully connected to native local MongoDB Server: {self.db_name}")
            return
        except Exception as e:
            print(f"[MongoDB] Notice: Local MongoDB Server unreachable ({e.__class__.__name__}). Using embedded engine.")

        # 3. Fallback to mongomock
        self.client = mongomock.MongoClient()
        self.db = self.client[self.db_name]
        self.is_mock = True
        print(f"[MongoDB] Initialized local resilient MongoDB engine: {self.db_name}")

    def _init_collections(self):
        """Pre-define and index key collections"""
        collection_names = [
            "users", "roles", "lanes", "processes", "machines", "machine_capabilities",
            "products", "materials", "material_inventory", "workers", "worker_skills",
            "orders", "order_operations", "schedules", "schedule_operations",
            "disruptions", "maintenance_work_orders", "ml_predictions", "optimization_runs",
            "planning_plans", "planning_plan_operations", "approval_history", "audit_logs"
        ]
        for cname in collection_names:
            if cname not in self.db.list_collection_names():
                pass

        try:
            self.db.machines.create_index("id", unique=True)
            self.db.orders.create_index("id", unique=True)
            self.db.users.create_index("username", unique=True)
            self.db.schedules.create_index("id")
            self.db.order_operations.create_index([("order_id", 1), ("sequence", 1)])
            self.db.schedule_operations.create_index([("order_id", 1), ("machine_id", 1)])
        except Exception:
            pass

    def get_db(self):
        return self.db

    def get_collection(self, name):
        return self.db[name]

    def reset_database(self):
        """Drops all collections in the current database for clean demo seeding"""
        for cname in self.db.list_collection_names():
            self.db[cname].drop()
        self._init_collections()

# Global singleton instance
mongo_manager = MongoDBManager()

def get_mongo_db():
    return mongo_manager.get_db()

get_db = get_mongo_db

def get_collection(name):
    return mongo_manager.get_collection(name)
