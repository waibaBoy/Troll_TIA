"""
OpenWeatherMap Client for fetching weather data.
Uses One Call 3.0 API.
"""
import os
import httpx
from typing import Dict, Optional, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# TIA (Kathmandu Airport) Coordinates
KTM_LAT = 27.6966
KTM_LON = 85.3591

class WeatherClient:
    def __init__(self):
        self.api_key = os.getenv("OPENWEATHER_API_KEY")
        if not self.api_key:
            print("⚠️  Warning: OPENWEATHER_API_KEY not found in environment.")

        self.base_url = "https://api.openweathermap.org/data/3.0/onecall"
        self.client = httpx.Client(timeout=10.0)

    def get_current_weather(self, lat: float = KTM_LAT, lon: float = KTM_LON) -> Optional[Dict[str, Any]]:
        """
        Fetch current weather and simple forecast.
        Returns a simplified dictionary for our database.
        """
        if not self.api_key:
            return None

        try:
            url = f"{self.base_url}?lat={lat}&lon={lon}&exclude=minutely,hourly,alerts&units=metric&appid={self.api_key}"
            response = self.client.get(url)
            response.raise_for_status()

            data = response.json()
            current = data.get("current", {})

            # Extract relevant fields
            return {
                "temp_celsius": current.get("temp"),
                "visibility_km": current.get("visibility", 0) / 1000.0,
                "wind_speed_kmh": current.get("wind_speed", 0) * 3.6, # m/s to km/h
                "wind_direction": self._degrees_to_cardinal(current.get("wind_deg", 0)),
                "precipitation_mm": 0.0, # One Call "current" doesn't strictly give precip volume unless it rained last hour
                "humidity_percent": current.get("humidity"),
                "conditions": current.get("weather", [{}])[0].get("description", "unknown"),
                "observed_at": datetime.fromtimestamp(current.get("dt", datetime.now().timestamp())).isoformat(),
                "raw_data": current
            }

        except Exception as e:
            print(f"❌ Weather API Error: {e}")
            return None

    def _degrees_to_cardinal(self, d: int) -> str:
        """Convert wind degrees to cardinal direction."""
        dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        ix = int((d + 11.25)/22.5)
        return dirs[ix % 16]

# Test
if __name__ == "__main__":
    client = WeatherClient()
    weather = client.get_current_weather()
    if weather:
        print(f"🌡️  Temperature: {weather['temp_celsius']}°C")
        print(f"👁️  Visibility: {weather['visibility_km']} km")
        print(f"💨 Wind: {weather['wind_speed_kmh']:.1f} km/h {weather['wind_direction']}")
        print(f"☁️  Conditions: {weather['conditions']}")
    else:
        print("Failed to fetch weather.")
