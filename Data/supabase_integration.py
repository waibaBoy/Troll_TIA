"""
Supabase integration for the TIA flight scraper.
Converts scraped data to database entities and stores them.
"""
import sys
from pathlib import Path
from datetime import date, datetime
from typing import List, Dict, Optional, Tuple

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from Data.models import FlightData
from Data.repository import FlightDataRepository
from Data.airport_codes import get_iata_code
from Data.weather_client import WeatherClient


class ScraperDBIntegration:
    """
    Handles storing scraped flight data in Supabase.
    """

    def __init__(self):
        self.repo = FlightDataRepository()
        self.weather_client = WeatherClient()
        self.current_job_id: Optional[str] = None
        self.stats = {
            "processed": 0,
            "observations_created": 0,
            "errors": 0
        }

    def fetch_weather_snapshot(self) -> Optional[str]:
        """Fetch and store current weather. Returns snapshot ID."""
        print("🌤️  Fetching current weather...")
        weather = self.weather_client.get_current_weather()
        if weather:
            try:
                snapshot_id = self.repo.weather.create(weather, airport_iata="KTM")
                print(f"✅ Weather captured: {weather['temp_celsius']}°C, {weather['conditions']}")
                return snapshot_id
            except Exception as e:
                print(f"⚠️  Failed to save weather: {e}")
        return None

    def start_scrape_job(self, scrape_type: str = None) -> str:
        """Start a new scrape job and return its ID."""
        self.current_job_id = self.repo.scrape_jobs.create(
            airport_iata="KTM",
            scrape_type=scrape_type
        )
        self.stats = {"processed": 0, "observations_created": 0, "errors": 0}
        print(f"📝 Started scrape job: {self.current_job_id[:8]}...")

        # Capture weather at start of job
        self.fetch_weather_snapshot()

        return self.current_job_id

    def complete_scrape_job(self, status: str = "success", error: str = None):
        """Mark the current scrape job as complete."""
        if self.current_job_id:
            self.repo.scrape_jobs.complete(
                job_id=self.current_job_id,
                flights_captured=self.stats["processed"],
                status=status,
                error=error
            )
            print(f"✅ Completed scrape job: {self.stats['processed']} flights, "
                  f"{self.stats['observations_created']} new observations")

    def process_flight_row(
        self,
        row: Dict[str, str],
        direction: str,  # 'arrival' or 'departure'
        flight_type: str,  # 'domestic' or 'international'
        flight_date: date = None
    ) -> Optional[Dict]:
        """
        Process a single flight row from the scraper.

        Args:
            row: Dict with keys like 'Airlines', 'Flight', 'Origin'/'Destination', etc.
            direction: 'arrival' or 'departure'
            flight_type: 'domestic' or 'international'
            flight_date: Date of the flight (defaults to today)

        Returns:
            Dict with instance_id and observation_id if successful, None on error
        """
        if flight_date is None:
            flight_date = date.today()

        try:
            # Extract and map fields based on direction
            airline = row.get("Airlines", "").strip()
            flight_number = row.get("Flight", "").strip()

            if direction == "arrival":
                location = row.get("Origin", "").strip()
                scheduled_str = row.get("Scheduled Time of Arrival") or row.get("SCHEDULED TIME OF ARRIVAL", "")
                estimated_str = row.get("Estimated Time of Arrival") or row.get("Estimated Time of Arrival", "")
                actual_str = None  # Arrivals don't have actual time in scraped data typically
            else:
                location = row.get("Destination", "").strip()
                scheduled_str = row.get("Scheduled Time of Departure") or row.get("SCHEDULED TIME OF Departure", "")
                estimated_str = None  # Departures have actual time instead
                actual_str = row.get("Actual Time of Departure") or row.get("Actual Time of Departure", "")

            status = row.get("Status", "").strip()

            # Skip if essential data is missing
            if not airline or not flight_number:
                return None

            # Map city name to IATA code
            location_iata = get_iata_code(location)

            # Create FlightData object
            flight_data = FlightData(
                airline=airline,
                flight_number=flight_number,
                origin=location_iata if direction == "arrival" else None,
                destination=location_iata if direction == "departure" else None,
                scheduled_time=scheduled_str,
                estimated_time=estimated_str,
                actual_time=actual_str,
                status=status if status and status != "----" else None,
                direction=direction,
                flight_type=flight_type,
                raw_data=row
            )

            # Process and store
            result = self.repo.process_flight(
                flight_data=flight_data,
                flight_date=flight_date,
                scrape_job_id=self.current_job_id,
                primary_airport="KTM"
            )

            self.stats["processed"] += 1
            if result.get("observation_created"):
                self.stats["observations_created"] += 1

            return result

        except Exception as e:
            self.stats["errors"] += 1
            print(f"❌ Error processing {row.get('Flight', 'unknown')}: {e}")
            return None

    def process_csv_rows(
        self,
        rows: List[Dict[str, str]],
        direction: str,
        flight_type: str,
        flight_date: date = None
    ) -> Dict:
        """
        Process multiple rows from a CSV/scraped table.

        Returns stats dict.
        """
        for row in rows:
            self.process_flight_row(row, direction, flight_type, flight_date)

        return self.stats.copy()


def process_scraped_data(
    headers: List[str],
    rows: List[List[str]],
    tab_label: str,
    flight_date: date = None
) -> Tuple[int, int]:
    """
    Convenience function to process scraped data from the existing scraper.

    Args:
        headers: List of column headers
        rows: List of row data (each row is a list of values)
        tab_label: One of 'International-Arrivals', 'International-Departure',
                   'Domestic-Arrivals', 'Domestic-Departure'
        flight_date: Date of flights (defaults to today)

    Returns:
        Tuple of (flights_processed, observations_created)
    """
    # Determine direction and type from tab label
    if "Arrival" in tab_label:
        direction = "arrival"
    else:
        direction = "departure"

    if "International" in tab_label:
        flight_type = "international"
    else:
        flight_type = "domestic"

    # Convert rows to dicts
    row_dicts = []
    for row in rows:
        row_dict = {}
        for i, header in enumerate(headers):
            if i < len(row):
                row_dict[header] = row[i]
        row_dicts.append(row_dict)

    # Process
    integration = ScraperDBIntegration()
    integration.start_scrape_job(scrape_type=tab_label)

    try:
        stats = integration.process_csv_rows(
            rows=row_dicts,
            direction=direction,
            flight_type=flight_type,
            flight_date=flight_date
        )
        integration.complete_scrape_job(status="success")
        return stats["processed"], stats["observations_created"]
    except Exception as e:
        integration.complete_scrape_job(status="failed", error=str(e))
        raise


# Test function
if __name__ == "__main__":
    # Test with sample data
    from datetime import date

    sample_headers = ["Airlines", "Scheduled Time of Arrival", "Estimated Time of Arrival", "Flight", "Origin", "Status"]
    sample_rows = [
        ["Buddha Air", "17:0:0", "18:26:0", "BHA710", "Biratnagar", "Landed"],
        ["Yeti Airlines", "16:45:0", "18:48:0", "NYT574", "Janakpur", "Landed"],
    ]

    processed, observations = process_scraped_data(
        headers=sample_headers,
        rows=sample_rows,
        tab_label="Domestic-Arrivals",
        flight_date=date.today()
    )

    print(f"\n🎉 Test complete: {processed} flights, {observations} observations")
