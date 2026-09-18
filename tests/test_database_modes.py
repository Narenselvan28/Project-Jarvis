import pytest
from backend.database.mongo import mongo_manager

def test_database_mode_atlas_success():
    """Test 1: DATABASE_MODE=atlas connects strictly to Atlas"""
    mongo_manager.reconnect(
        mode="atlas",
        atlas_uri="mongodb+srv://narenselvan77_db_user:KaSVVs32FLiaLKqQ@cluster0.hpfub4u.mongodb.net/reflow?retryWrites=true&w=majority&appName=Cluster0",
        local_uri="mongodb://127.0.0.1:27017",
        db_name="reflow",
        timeout_ms=5000
    )
    assert mongo_manager.database_provider == "ATLAS"
    status = mongo_manager.get_status()
    assert status["provider"] == "ATLAS"
    assert status["status"] == "connected"

def test_database_mode_local_success():
    """Test 2: DATABASE_MODE=local connects strictly to Local MongoDB"""
    mongo_manager.reconnect(
        mode="local",
        atlas_uri="mongodb+srv://narenselvan77_db_user:KaSVVs32FLiaLKqQ@cluster0.hpfub4u.mongodb.net/reflow?retryWrites=true&w=majority&appName=Cluster0",
        local_uri="mongodb://127.0.0.1:27017",
        db_name="reflow",
        timeout_ms=2000
    )
    assert mongo_manager.database_provider == "LOCAL"
    status = mongo_manager.get_status()
    assert status["provider"] == "LOCAL"
    assert status["status"] == "connected"

def test_database_mode_auto_atlas_primary():
    """Test 3: DATABASE_MODE=auto selects ATLAS when Atlas is available"""
    mongo_manager.reconnect(
        mode="auto",
        atlas_uri="mongodb+srv://narenselvan77_db_user:KaSVVs32FLiaLKqQ@cluster0.hpfub4u.mongodb.net/reflow?retryWrites=true&w=majority&appName=Cluster0",
        local_uri="mongodb://127.0.0.1:27017",
        db_name="reflow",
        timeout_ms=5000
    )
    assert mongo_manager.database_provider == "ATLAS"
    status = mongo_manager.get_status()
    assert status["provider"] == "ATLAS"
    assert status["status"] == "connected"

def test_database_mode_auto_fallback_to_local():
    """Test 4: DATABASE_MODE=auto falls back to LOCAL when Atlas is unreachable"""
    mongo_manager.reconnect(
        mode="auto",
        atlas_uri="mongodb+srv://fake_user:bad_pass@cluster0.invalid.mongodb.net/reflow?retryWrites=true&w=majority",
        local_uri="mongodb://127.0.0.1:27017",
        db_name="reflow",
        timeout_ms=1000
    )
    assert mongo_manager.database_provider == "LOCAL"
    status = mongo_manager.get_status()
    assert status["provider"] == "LOCAL"
    assert status["status"] == "connected"

def test_database_both_unavailable():
    """Test 5: Clear error raised when both Atlas and Local are unreachable"""
    mongo_manager.reconnect(
        mode="auto",
        atlas_uri="mongodb+srv://fake_user:bad_pass@cluster0.invalid.mongodb.net/reflow?retryWrites=true&w=majority",
        local_uri="mongodb://127.0.0.1:29999", # Non-existent port
        db_name="reflow",
        timeout_ms=1000
    )
    assert mongo_manager.database_provider == "UNAVAILABLE"
    status = mongo_manager.get_status()
    assert status["provider"] == "UNAVAILABLE"
    assert status["status"] == "disconnected"
    with pytest.raises(ConnectionError):
        mongo_manager.get_db()

    # Reset back to default auto mode after test
    mongo_manager.reconnect(
        mode="auto",
        atlas_uri="mongodb+srv://narenselvan77_db_user:KaSVVs32FLiaLKqQ@cluster0.hpfub4u.mongodb.net/reflow?retryWrites=true&w=majority&appName=Cluster0",
        local_uri="mongodb://127.0.0.1:27017",
        db_name="reflow",
        timeout_ms=5000
    )
