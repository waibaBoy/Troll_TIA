"""
Supabase configuration and client setup.
"""
import os
from functools import lru_cache
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Returns a cached Supabase client instance.
    Uses service role key for full database access.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        raise ValueError(
            "Missing Supabase credentials. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file."
        )

    return create_client(url, key)


def test_connection() -> bool:
    """
    Test the Supabase connection by querying airports.
    Returns True if successful.
    """
    try:
        client = get_supabase_client()
        result = client.schema("flight_data").table("airports").select("count").limit(1).execute()
        print(f"✅ Supabase connection successful!")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False


if __name__ == "__main__":
    test_connection()
