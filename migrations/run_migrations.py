"""
Migration runner for Supabase.
Reads SQL files from migrations/ and executes them via Supabase.
"""
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
import httpx

load_dotenv()


def get_supabase_credentials():
    """Get Supabase URL and key from environment."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")

    return url, key


def execute_sql(sql: str) -> dict:
    """Execute SQL against Supabase using the REST API."""
    url, key = get_supabase_credentials()

    # Use the Supabase REST API for SQL execution
    endpoint = f"{url}/rest/v1/rpc/exec_sql"

    # Actually, Supabase doesn't have a direct SQL endpoint via REST
    # We need to use the management API or run migrations manually
    # For now, let's just print the SQL and instruct user

    print("=" * 60)
    print("Please run this SQL in Supabase SQL Editor:")
    print("=" * 60)
    print(sql)
    print("=" * 60)

    return {"status": "manual_required"}


def run_migration(migration_file: Path):
    """Run a single migration file."""
    print(f"\n📄 Processing: {migration_file.name}")

    sql = migration_file.read_text()

    # For Supabase, we'll need to run this manually in the SQL Editor
    # or use Supabase CLI for migrations

    return sql


def run_all_migrations():
    """Run all migration files in order."""
    migrations_dir = project_root / "migrations"

    if not migrations_dir.exists():
        print("❌ No migrations directory found!")
        return

    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        print("❌ No migration files found!")
        return

    print(f"Found {len(migration_files)} migration(s)")

    # Combine all migrations
    all_sql = []
    for mf in migration_files:
        sql = run_migration(mf)
        all_sql.append(f"-- {mf.name}\n{sql}")

    combined_sql = "\n\n".join(all_sql)

    # Save combined migrations for easy copy-paste
    combined_file = migrations_dir / "COMBINED_all_migrations.sql"
    combined_file.write_text(combined_sql)
    print(f"\n✅ Created combined migration file: {combined_file}")
    print("\n📋 Instructions:")
    print("1. Go to Supabase Dashboard → SQL Editor")
    print("2. Copy and paste the contents of COMBINED_all_migrations.sql")
    print("3. Click 'Run'")
    print("\nOr you can run each migration file separately in order.")


if __name__ == "__main__":
    run_all_migrations()
