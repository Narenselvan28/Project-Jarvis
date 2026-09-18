import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.seed.seed_mongo import seed_mongo
from backend.database.mongo import get_db_status

if __name__ == "__main__":
    print("=" * 65)
    print("  REFLOW: DATABASE SEEDING UTILITY")
    print("=" * 65)
    status = get_db_status()
    print(f"  Target Database Provider: {status.get('provider')} (DB: {status.get('database_name')})")
    print("=" * 65)
    
    seed_mongo()
    
    print("=" * 65)
    print("  SEEDING COMPLETE:")
    print("  - 50 machines across 3 production lanes (Jersey, Wovens, Rapid)")
    print("  - 13 manufacturing processes (P01 FI to P13 PK)")
    print("  - Order ORD-1042 active on CUT-02")
    print("  - Users seeded (manager, supervisor, service)")
    print("=" * 65)
