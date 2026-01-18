"""
Repository layer for database operations.
Handles all Supabase interactions.
"""
from datetime import date, time, datetime
from typing import Optional, List, Dict, Any
import json

from config.supabase_config import get_supabase_client
from Data.models import FlightData, ScrapeJobData, FlightObservationData


class AirportRepository:
    """Repository for airport operations."""

    def __init__(self):
        self.client = get_supabase_client()
        self.table = self.client.table("airports")
        self._cache: Dict[str, Dict] = {}  # iata -> full airport data cache

    def get_by_iata(self, iata_code: str) -> Optional[Dict]:
        """Get airport by IATA code."""
        if iata_code in self._cache:
            return self._cache[iata_code]

        result = self.table.select("*").eq("iata_code", iata_code).execute()
        if result.data:
            self._cache[iata_code] = result.data[0]
            return result.data[0]
        return None

    def get_id_by_iata(self, iata_code: str) -> Optional[str]:
        """Get airport ID by IATA code."""
        airport = self.get_by_iata(iata_code)
        return airport["id"] if airport else None

    def get_or_create(self, iata_code: str, city_name: str, country: str = "Nepal") -> Dict:
        """
        Get airport by IATA code, or create it if not found.
        This enables auto-discovery of new airports.
        """
        # Check cache first
        if iata_code in self._cache:
            return self._cache[iata_code]

        # Try to find existing
        result = self.table.select("*").eq("iata_code", iata_code).execute()
        if result.data:
            self._cache[iata_code] = result.data[0]
            return result.data[0]

        # Auto-create new airport
        print(f"🆕 Auto-discovering new airport: {iata_code} ({city_name})")
        new_airport = {
            "iata_code": iata_code,
            "name": f"{city_name} Airport",
            "city": city_name,
            "country": country,
        }

        try:
            insert_result = self.table.insert(new_airport).execute()
            if insert_result.data:
                self._cache[iata_code] = insert_result.data[0]
                print(f"✅ Created airport: {iata_code}")
                return insert_result.data[0]
        except Exception as e:
            print(f"⚠️  Failed to create airport {iata_code}: {e}")

        return None


class AirlineRepository:
    """Repository for airline operations."""

    def __init__(self):
        self.client = get_supabase_client()
        self.table = self.client.table("airlines")
        self._cache: Dict[str, str] = {}  # name -> id cache

    def get_or_create(self, name: str, iata_code: str = None) -> str:
        """Get airline by name or create if not exists. Returns ID."""
        if name in self._cache:
            return self._cache[name]

        # Try to find existing
        result = self.table.select("id").eq("name", name).execute()
        if result.data:
            self._cache[name] = result.data[0]["id"]
            return result.data[0]["id"]

        # Create new
        data = {"name": name}
        if iata_code:
            data["iata_code"] = iata_code

        result = self.table.insert(data).execute()
        airline_id = result.data[0]["id"]
        self._cache[name] = airline_id
        return airline_id


class RouteRepository:
    """Repository for route operations."""

    def __init__(self):
        self.client = get_supabase_client()
        self.table = self.client.table("routes")
        self.airport_repo = AirportRepository()
        self._cache: Dict[str, str] = {}  # "origin-dest" -> id cache

    def get_or_create(self, origin_iata: str, dest_iata: str, origin_city: str = None, dest_city: str = None) -> str:
        """
        Get or create route between airports. Returns ID.
        Uses auto-discovery for unknown airports.
        """
        cache_key = f"{origin_iata}-{dest_iata}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Get or create origin airport (auto-discovery)
        origin = self.airport_repo.get_by_iata(origin_iata)
        if not origin and origin_city:
            origin = self.airport_repo.get_or_create(origin_iata, origin_city)

        # Get or create destination airport (auto-discovery)
        dest = self.airport_repo.get_by_iata(dest_iata)
        if not dest and dest_city:
            dest = self.airport_repo.get_or_create(dest_iata, dest_city)

        if not origin or not dest:
            raise ValueError(f"Airport not found and could not be created: {origin_iata} or {dest_iata}")

        origin_id = origin["id"]
        dest_id = dest["id"]

        # Try to find existing route
        result = self.table.select("id").eq(
            "origin_airport_id", origin_id
        ).eq(
            "destination_airport_id", dest_id
        ).execute()

        if result.data:
            self._cache[cache_key] = result.data[0]["id"]
            return result.data[0]["id"]

        # Determine route type
        origin_country = origin.get("country", "Nepal")
        dest_country = dest.get("country", "Nepal")
        route_type = "domestic" if origin_country == "Nepal" and dest_country == "Nepal" else "international"

        # Create new route
        result = self.table.insert({
            "origin_airport_id": origin_id,
            "destination_airport_id": dest_id,
            "route_type": route_type
        }).execute()

        route_id = result.data[0]["id"]
        self._cache[cache_key] = route_id
        return route_id


class FlightScheduleRepository:
    """Repository for flight schedule operations."""

    def __init__(self):
        self.client = get_supabase_client()
        self.table = self.client.table("flight_schedules")
        self.airline_repo = AirlineRepository()
        self.route_repo = RouteRepository()
        self._cache: Dict[str, str] = {}  # "flight_number-route_id-direction" -> id

    def get_or_create(
        self,
        airline_name: str,
        flight_number: str,
        origin_iata: str,
        dest_iata: str,
        direction: str,
        origin_city: str = None,
        dest_city: str = None
    ) -> str:
        """Get or create a flight schedule. Returns ID."""
        airline_id = self.airline_repo.get_or_create(airline_name)
        route_id = self.route_repo.get_or_create(origin_iata, dest_iata, origin_city, dest_city)

        cache_key = f"{flight_number}-{route_id}-{direction}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Try to find existing
        result = self.table.select("id").eq(
            "flight_number", flight_number
        ).eq(
            "route_id", route_id
        ).eq(
            "direction", direction
        ).execute()

        if result.data:
            self._cache[cache_key] = result.data[0]["id"]
            return result.data[0]["id"]

        # Create new
        result = self.table.insert({
            "airline_id": airline_id,
            "route_id": route_id,
            "flight_number": flight_number,
            "direction": direction
        }).execute()

        schedule_id = result.data[0]["id"]
        self._cache[cache_key] = schedule_id
        return schedule_id


class FlightInstanceRepository:
    """Repository for flight instance operations."""

    def __init__(self):
        self.client = get_supabase_client()
        self.table = self.client.table("flight_instances")
        self.schedule_repo = FlightScheduleRepository()

    def _time_to_str(self, t: Optional[time]) -> Optional[str]:
        """Convert time to string for database."""
        if t is None:
            return None
        return t.strftime("%H:%M:%S")

    def upsert(
        self,
        flight_data: FlightData,
        flight_date: date,
        primary_airport: str = "KTM"
    ) -> str:
        """
        Upsert a flight instance. Returns the instance ID.

        For arrivals: origin is from scraper, destination is primary airport (KTM)
        For departures: origin is primary airport, destination is from scraper
        """
        # Determine origin and destination with city names
        if flight_data.direction == "arrival":
            origin = flight_data.origin
            origin_city = flight_data.origin_city
            dest = primary_airport
            dest_city = "Kathmandu"
        else:
            origin = primary_airport
            origin_city = "Kathmandu"
            dest = flight_data.destination
            dest_city = flight_data.destination_city

        if not origin or not dest:
            raise ValueError(f"Missing origin/destination for {flight_data.flight_number}")

        # Get or create schedule (with auto-discovery for unknown airports)
        schedule_id = self.schedule_repo.get_or_create(
            airline_name=flight_data.airline,
            flight_number=flight_data.flight_number,
            origin_iata=origin,
            dest_iata=dest,
            direction=flight_data.direction,
            origin_city=origin_city,
            dest_city=dest_city
        )

        # Calculate delays
        predicted_delay = flight_data.calculate_predicted_delay()
        actual_delay = flight_data.calculate_actual_delay()

        # Prepare data
        instance_data = {
            "flight_schedule_id": schedule_id,
            "flight_date": flight_date.isoformat(),
            "scheduled_time": self._time_to_str(flight_data.scheduled_time),
            "estimated_time": self._time_to_str(flight_data.estimated_time),
            "actual_time": self._time_to_str(flight_data.actual_time),
            "final_status": flight_data.status,
            "predicted_delay_minutes": predicted_delay,
            "actual_delay_minutes": actual_delay,
        }

        # Upsert (insert or update on conflict)
        result = self.table.upsert(
            instance_data,
            on_conflict="flight_schedule_id,flight_date,scheduled_time"
        ).execute()

        return result.data[0]["id"]

    def get_latest_observation(self, instance_id: str) -> Optional[Dict]:
        """Get the most recent observation for a flight instance."""
        obs_table = self.client.table("flight_observations")
        result = obs_table.select("*").eq(
            "flight_instance_id", instance_id
        ).order(
            "observed_at", desc=True
        ).limit(1).execute()

        return result.data[0] if result.data else None


class FlightObservationRepository:
    """Repository for flight observation operations."""

    def __init__(self):
        self.client = get_supabase_client()
        self.table = self.client.table("flight_observations")

    def _time_to_str(self, t: Optional[time]) -> Optional[str]:
        if t is None:
            return None
        return t.strftime("%H:%M:%S")

    def should_create_observation(
        self,
        instance_id: str,
        new_status: Optional[str],
        new_estimated: Optional[time],
        new_actual: Optional[time]
    ) -> bool:
        """
        Check if we should create a new observation.
        Only create if status or times have changed.
        """
        # Get latest observation
        result = self.table.select("status,estimated_time_observed,actual_time_observed").eq(
            "flight_instance_id", instance_id
        ).order("observed_at", desc=True).limit(1).execute()

        if not result.data:
            return True  # No previous observation, create first one

        prev = result.data[0]

        # Compare values
        if prev.get("status") != new_status:
            return True
        if self._time_to_str(new_estimated) != prev.get("estimated_time_observed"):
            return True
        if self._time_to_str(new_actual) != prev.get("actual_time_observed"):
            return True

        return False

    def create(
        self,
        instance_id: str,
        flight_data: FlightData,
        scrape_job_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Create a new observation if status/times have changed.
        Returns observation ID if created, None if skipped.
        """
        if not self.should_create_observation(
            instance_id,
            flight_data.status,
            flight_data.estimated_time,
            flight_data.actual_time
        ):
            return None

        delay = flight_data.calculate_predicted_delay()
        if flight_data.actual_time:
            delay = flight_data.calculate_actual_delay()

        obs_data = {
            "flight_instance_id": instance_id,
            "scrape_job_id": scrape_job_id,
            "observed_at": datetime.now().isoformat(),
            "status": flight_data.status,
            "estimated_time_observed": self._time_to_str(flight_data.estimated_time),
            "actual_time_observed": self._time_to_str(flight_data.actual_time),
            "delay_minutes_at_observation": delay,
            "raw_data": flight_data.raw_data
        }

        result = self.table.insert(obs_data).execute()
        return result.data[0]["id"]


class ScrapeJobRepository:
    """Repository for scrape job operations."""

    def __init__(self):
        self.client = get_supabase_client()
        self.table = self.client.table("scrape_jobs")
        self.airport_repo = AirportRepository()

    def create(self, airport_iata: str = "KTM", scrape_type: str = None) -> str:
        """Create a new scrape job record. Returns job ID."""
        airport_id = self.airport_repo.get_id_by_iata(airport_iata)

        result = self.table.insert({
            "airport_id": airport_id,
            "status": "running",
            "scrape_type": scrape_type
        }).execute()

        return result.data[0]["id"]

    def complete(self, job_id: str, flights_captured: int, status: str = "success", error: str = None):
        """Mark a scrape job as complete."""
        self.table.update({
            "completed_at": datetime.now().isoformat(),
            "status": status,
            "flights_captured": flights_captured,
            "error_message": error
        }).eq("id", job_id).execute()



class WeatherSnapshotRepository:
    """Repository for weather snapshot operations."""

    def __init__(self):
        self.client = get_supabase_client()
        self.table = self.client.table("weather_snapshots")
        self.airport_repo = AirportRepository()

    def create(self, weather_data: Dict, airport_iata: str = "KTM") -> str:
        """Create a new weather snapshot. Returns ID."""
        airport_id = self.airport_repo.get_id_by_iata(airport_iata)

        # Prepare data (ensure keys match DB columns)
        data = {
            "airport_id": airport_id,
            "observed_at": weather_data["observed_at"],
            "temp_celsius": weather_data["temp_celsius"],
            "visibility_km": weather_data["visibility_km"],
            "wind_speed_kmh": weather_data["wind_speed_kmh"],
            "wind_direction": weather_data["wind_direction"],
            "precipitation_mm": weather_data["precipitation_mm"],
            "humidity_percent": weather_data["humidity_percent"],
            "conditions": weather_data["conditions"],
            "raw_data": weather_data.get("raw_data")
        }

        result = self.table.insert(data).execute()
        return result.data[0]["id"]


# Convenience class combining all repositories
class FlightDataRepository:
    """Main repository combining all flight data operations."""

    def __init__(self):
        self.airports = AirportRepository()
        self.airlines = AirlineRepository()
        self.routes = RouteRepository()
        self.schedules = FlightScheduleRepository()
        self.instances = FlightInstanceRepository()
        self.observations = FlightObservationRepository()
        self.scrape_jobs = ScrapeJobRepository()
        self.weather = WeatherSnapshotRepository()

    def process_flight(
        self,
        flight_data: FlightData,
        flight_date: date,
        scrape_job_id: Optional[str] = None,
        primary_airport: str = "KTM"
    ) -> Dict[str, Any]:
        """
        Process a single flight record from scraper.
        Creates/updates instance and observation as needed.
        Returns dict with instance_id and observation_id.
        """
        # Upsert flight instance
        instance_id = self.instances.upsert(
            flight_data=flight_data,
            flight_date=flight_date,
            primary_airport=primary_airport
        )

        # Create observation if status/times changed
        observation_id = self.observations.create(
            instance_id=instance_id,
            flight_data=flight_data,
            scrape_job_id=scrape_job_id
        )

        return {
            "instance_id": instance_id,
            "observation_id": observation_id,
            "observation_created": observation_id is not None
        }
