import os
import logging
from datetime import datetime
from pymongo import MongoClient
from backend.config import Config

logger = logging.getLogger("reflow.database")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

class MongoDBManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MongoDBManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, mode=None, atlas_uri=None, local_uri=None, db_name=None, timeout_ms=None):
        # If already initialized and no override params given, skip
        if getattr(self, "_initialized", False) and mode is None and atlas_uri is None and local_uri is None:
            return

        self.mode = (mode if mode is not None else (Config.DATABASE_MODE or "auto")).lower().strip()
        self.atlas_uri = atlas_uri if atlas_uri is not None else Config.MONGODB_ATLAS_URI
        self.local_uri = local_uri if local_uri is not None else (Config.MONGODB_LOCAL_URI or "mongodb://127.0.0.1:27017")
        self.db_name = db_name if db_name is not None else (Config.MONGODB_DB_NAME or "reflow")
        self.timeout_ms = timeout_ms if timeout_ms is not None else (Config.MONGODB_CONNECTION_TIMEOUT_MS or 5000)

        self.client = None
        self.db = None
        self.database_provider = "UNAVAILABLE" # 'ATLAS', 'LOCAL', or 'UNAVAILABLE'
        self.connection_error = None

        self._connect()
        if self.db is not None:
            self._init_collections()
        self._initialized = True

    def _connect(self):
        """
        Executes connection resolution based on DATABASE_MODE:
        - 'auto': Attempts MongoDB Atlas first. On failure, falls back to Local MongoDB.
        - 'atlas': Strictly connects to Atlas; raises clear error on failure without fallback.
        - 'local': Strictly connects to Local MongoDB without attempting Atlas.
        """
        self.connection_error = None

        # MODE 1: EXPLICIT LOCAL ONLY
        if self.mode == "local":
            logger.info("Database: explicit local mode active (DATABASE_MODE=local)")
            if self._try_connect_local():
                return
            self.database_provider = "UNAVAILABLE"
            self.connection_error = "Local MongoDB is unavailable and DATABASE_MODE is set to 'local'."
            logger.error(f"Database: {self.connection_error}")
            return

        # MODE 2: EXPLICIT ATLAS ONLY
        if self.mode == "atlas":
            logger.info("Database: explicit Atlas mode active (DATABASE_MODE=atlas)")
            if not self.atlas_uri:
                self.database_provider = "UNAVAILABLE"
                self.connection_error = "MONGODB_ATLAS_URI is not set and DATABASE_MODE is set to 'atlas'."
                logger.error(f"Database: {self.connection_error}")
                return
            if self._try_connect_atlas():
                return
            self.database_provider = "UNAVAILABLE"
            self.connection_error = "MongoDB Atlas is unreachable and DATABASE_MODE is set to 'atlas'."
            logger.error(f"Database: {self.connection_error}")
            return

        # MODE 3: AUTO MODE (Atlas Primary -> Local Fallback)
        logger.info("Database: auto mode active (Atlas Primary with Local Fallback)")
        if self.atlas_uri:
            if self._try_connect_atlas():
                return
            logger.warning("Database: Atlas unavailable. Falling back to local MongoDB.")
        else:
            logger.info("Database: No MONGODB_ATLAS_URI provided. Proceeding with local MongoDB fallback.")

        # Attempt Local Fallback
        if self._try_connect_local():
            return

        # Both Failed
        self.database_provider = "UNAVAILABLE"
        self.connection_error = "Both MongoDB Atlas and Local MongoDB are unreachable."
        logger.error(f"Database: {self.connection_error}")

    def _try_connect_atlas(self) -> bool:
        """Attempts connection to MongoDB Atlas with configured timeout"""
        if not self.atlas_uri:
            return False
        try:
            logger.info("Database: attempting MongoDB Atlas connection...")
            client = MongoClient(
                self.atlas_uri,
                serverSelectionTimeoutMS=self.timeout_ms,
                connectTimeoutMS=self.timeout_ms,
                socketTimeoutMS=self.timeout_ms,
                appname="ReFlowProduction"
            )
            # Verify connectivity via administrative ping
            client.admin.command("ping")
            self.client = client
            self.db = client[self.db_name]
            self.database_provider = "ATLAS"
            logger.info("Database: Atlas connection successful")
            logger.info("Database: active provider = ATLAS")
            print(f"[MongoDB] Connected: ATLAS (Database: {self.db_name})")
            return True
        except Exception as e:
            logger.warning(f"Database: Atlas connection failed ({e.__class__.__name__})")
            return False

    def _try_connect_local(self) -> bool:
        """Attempts connection to Local MongoDB Server with configured timeout"""
        try:
            logger.info("Database: attempting local MongoDB connection...")
            local_client = MongoClient(
                self.local_uri,
                serverSelectionTimeoutMS=min(2000, self.timeout_ms),
                connectTimeoutMS=min(2000, self.timeout_ms)
            )
            local_client.admin.command("ping")
            self.client = local_client
            self.db = local_client[self.db_name]
            self.database_provider = "LOCAL"
            logger.info("Database: local connection successful")
            logger.info("Database: active provider = LOCAL")
            print(f"[MongoDB] Connected: LOCAL (Database: {self.db_name})")
            return True
        except Exception as e:
            logger.warning(f"Database: Local MongoDB connection failed ({e.__class__.__name__})")
            return False

    def _init_collections(self):
        """Pre-defines indexes on essential entities in the active database"""
        if self.db is None:
            return
        try:
            self.db.machines.create_index("id", unique=True)
            self.db.orders.create_index("id", unique=True)
            self.db.users.create_index("username", unique=True)
            self.db.schedules.create_index("id")
            self.db.order_operations.create_index([("order_id", 1), ("sequence", 1)])
            self.db.schedule_operations.create_index([("order_id", 1), ("machine_id", 1)])
        except Exception as e:
            logger.debug(f"Database: index check notice: {e}")

    def get_db(self):
        """Returns active database handle or raises ConnectionError if unavailable"""
        if self.db is None or self.database_provider == "UNAVAILABLE":
            raise ConnectionError(self.connection_error or "Database is currently unavailable.")
        return self.db

    def get_collection(self, name):
        """Returns collection from the active database"""
        return self.get_db()[name]

    def get_status(self) -> dict:
        """Safe status descriptor without exposing credentials or internal topology"""
        is_connected = (self.database_provider in ["ATLAS", "LOCAL"] and self.db is not None)
        return {
            "provider": self.database_provider,
            "status": "connected" if is_connected else "disconnected",
            "database_name": self.db_name,
            "mode": self.mode,
            "error": self.connection_error if not is_connected else None
        }

    def reconnect(self, mode=None, atlas_uri=None, local_uri=None, db_name=None, timeout_ms=None):
        """Allows re-evaluating connection on configuration change"""
        if mode is not None:
            self.mode = mode.lower().strip()
        if atlas_uri is not None:
            self.atlas_uri = atlas_uri
        if local_uri is not None:
            self.local_uri = local_uri
        if db_name is not None:
            self.db_name = db_name
        if timeout_ms is not None:
            self.timeout_ms = timeout_ms

        self.client = None
        self.db = None
        self.database_provider = "UNAVAILABLE"
        self._connect()
        if self.db is not None:
            self._init_collections()

    def reset_database(self):
        """Drops all collections in the active database for clean demo seeding"""
        if self.db is not None:
            for cname in self.db.list_collection_names():
                if not cname.startswith("system."):
                    try:
                        self.db[cname].delete_many({})
                    except Exception:
                        try:
                            self.db[cname].drop()
                        except Exception:
                            pass
            self._init_collections()

# Global singleton instance
mongo_manager = MongoDBManager()

def get_mongo_db():
    return mongo_manager.get_db()

get_db = get_mongo_db

def get_collection(name):
    return mongo_manager.get_collection(name)

def get_db_status():
    return mongo_manager.get_status()
