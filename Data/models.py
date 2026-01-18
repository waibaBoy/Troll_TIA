"""
Data models for flight data entities.
Uses Pydantic for validation.
"""
from datetime import date, time, datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re


class TimeParser:
    """Utility to parse time strings in various formats."""

    @staticmethod
    def parse(time_str: str) -> Optional[time]:
        """
        Parse time string like "16:25:0" or "16:25" into time object.
        Returns None if parsing fails.
        """
        if not time_str or time_str.strip() in ['', '----', 'N/A', '-']:
            return None

        time_str = time_str.strip()

        # Try different patterns
        patterns = [
            r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$',  # 16:25:0
            r'^(\d{1,2}):(\d{1,2})$',             # 16:25
        ]

        for pattern in patterns:
            match = re.match(pattern, time_str)
            if match:
                groups = match.groups()
                hours = int(groups[0]) % 24  # Handle 24:00 as 00:00
                minutes = int(groups[1])
                seconds = int(groups[2]) if len(groups) > 2 else 0
                return time(hours, minutes, seconds)

        return None


class FlightData(BaseModel):
    """
    Represents a single flight record from the scraper.
    """
    airline: str
    flight_number: str
    origin: Optional[str] = None  # For arrivals
    destination: Optional[str] = None  # For departures
    scheduled_time: Optional[time] = None
    estimated_time: Optional[time] = None
    actual_time: Optional[time] = None
    status: Optional[str] = None
    direction: str  # 'arrival' or 'departure'
    flight_type: str  # 'domestic' or 'international'
    raw_data: dict = Field(default_factory=dict)

    @field_validator('scheduled_time', 'estimated_time', 'actual_time', mode='before')
    @classmethod
    def parse_time(cls, v):
        if isinstance(v, time):
            return v
        if isinstance(v, str):
            return TimeParser.parse(v)
        return None

    @field_validator('status', mode='before')
    @classmethod
    def clean_status(cls, v):
        if not v or v.strip() in ['----', '-', 'N/A', '']:
            return None
        return v.strip()

    @property
    def is_completed(self) -> bool:
        """Check if flight has completed (landed/departed)."""
        if not self.status:
            return False
        status_lower = self.status.lower()
        return any(s in status_lower for s in ['landed', 'departed', 'completed'])

    @property
    def is_delayed(self) -> bool:
        """Check if flight is marked as delayed."""
        if not self.status:
            return False
        return 'delay' in self.status.lower()

    def calculate_predicted_delay(self) -> Optional[int]:
        """Calculate predicted delay in minutes (estimated - scheduled)."""
        if not self.scheduled_time or not self.estimated_time:
            return None

        scheduled_mins = self.scheduled_time.hour * 60 + self.scheduled_time.minute
        estimated_mins = self.estimated_time.hour * 60 + self.estimated_time.minute

        # Handle overnight (estimated is next day)
        diff = estimated_mins - scheduled_mins
        if diff < -720:  # More than 12 hours negative = next day
            diff += 1440  # Add 24 hours

        return diff

    def calculate_actual_delay(self) -> Optional[int]:
        """Calculate actual delay in minutes (actual - scheduled)."""
        if not self.scheduled_time or not self.actual_time:
            return None

        scheduled_mins = self.scheduled_time.hour * 60 + self.scheduled_time.minute
        actual_mins = self.actual_time.hour * 60 + self.actual_time.minute

        # Handle overnight
        diff = actual_mins - scheduled_mins
        if diff < -720:
            diff += 1440

        return diff


class ScrapeJobData(BaseModel):
    """Represents a scrape job record."""
    id: Optional[str] = None
    airport_iata: str = 'KTM'
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    status: str = 'running'
    flights_captured: int = 0
    error_message: Optional[str] = None
    scrape_type: Optional[str] = None


class FlightObservationData(BaseModel):
    """Represents a single observation of a flight's status."""
    flight_instance_id: str
    scrape_job_id: Optional[str] = None
    observed_at: datetime = Field(default_factory=datetime.now)
    status: Optional[str] = None
    estimated_time: Optional[time] = None
    actual_time: Optional[time] = None
    delay_minutes: Optional[int] = None
    raw_data: dict = Field(default_factory=dict)
