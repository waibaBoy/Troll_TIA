# Entity-Relationship Analysis
## Nepal Flight Delay Prediction - Data Modeling

---

## 1. Entity Identification

Based on the requirements, we identify the following entities:

| Entity | Description | Key Insight |
|--------|-------------|-------------|
| **Airport** | Physical airport location | Enables multi-airport support |
| **Airline** | Operating airline company | Master data, linked to flights |
| **Route** | Path between two airports | Allows route-based analysis |
| **FlightSchedule** | Recurring flight pattern | Flight number + typical times |
| **FlightInstance** | Single occurrence of a flight | One trip on one specific date |
| **FlightObservation** | Snapshot of flight at scrape time | Status history tracking |
| **WeatherSnapshot** | Weather at airport at time | ML feature source |
| **ScrapeJob** | Record of each scrape run | Operations/debugging |
| **SpecialEvent** | Holidays, festivals | Seasonal pattern feature |

---

## 2. ER Diagram

```mermaid
erDiagram
    AIRPORT ||--o{ ROUTE : "origin_of"
    AIRPORT ||--o{ ROUTE : "destination_of"
    AIRPORT ||--o{ WEATHER_SNAPSHOT : "recorded_at"

    AIRLINE ||--o{ FLIGHT_SCHEDULE : "operates"

    ROUTE ||--o{ FLIGHT_SCHEDULE : "follows"
    FLIGHT_SCHEDULE ||--o{ FLIGHT_INSTANCE : "occurs_as"

    FLIGHT_INSTANCE ||--o{ FLIGHT_OBSERVATION : "observed_in"
    SCRAPE_JOB ||--o{ FLIGHT_OBSERVATION : "captured_in"

    AIRPORT {
        uuid id PK
        string iata_code UK
        string icao_code UK
        string name
        string city
        string country
        boolean is_primary
        float latitude
        float longitude
        string timezone
    }

    AIRLINE {
        uuid id PK
        string iata_code UK
        string name
        string country
        boolean is_active
    }

    ROUTE {
        uuid id PK
        uuid origin_airport_id FK
        uuid destination_airport_id FK
        string route_type "domestic|international"
        int distance_km
    }

    FLIGHT_SCHEDULE {
        uuid id PK
        uuid airline_id FK
        uuid route_id FK
        string flight_number UK
        string direction "arrival|departure"
        time typical_scheduled_time
    }

    FLIGHT_INSTANCE {
        uuid id PK
        uuid flight_schedule_id FK
        date flight_date
        time scheduled_time
        time estimated_time
        time actual_time
        string final_status
        int predicted_delay_minutes
        int actual_delay_minutes
        boolean is_cancelled
    }

    FLIGHT_OBSERVATION {
        uuid id PK
        uuid flight_instance_id FK
        uuid scrape_job_id FK
        timestamp observed_at
        string status
        time estimated_time_at_observation
        time actual_time_at_observation
        int delay_minutes_at_observation
    }

    WEATHER_SNAPSHOT {
        uuid id PK
        uuid airport_id FK
        timestamp observed_at
        float temp_celsius
        float visibility_km
        float wind_speed_kmh
        string wind_direction
        float precipitation_mm
        string conditions
    }

    SCRAPE_JOB {
        uuid id PK
        uuid airport_id FK
        timestamp started_at
        timestamp completed_at
        string status "success|failed|partial"
        int flights_captured
        text error_message
    }

    SPECIAL_EVENT {
        uuid id PK
        date event_date
        string event_name
        string event_type "holiday|festival|strike"
        string country
    }
```

---

## 3. Key Design Decisions

### 3.1 Flight Uniqueness Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   FLIGHT IDENTITY CHAIN                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FlightSchedule (Master Pattern)                            │
│  ├── flight_number: "BHA710"                                │
│  ├── airline: Buddha Air                                     │
│  ├── route: Biratnagar → Kathmandu                          │
│  └── typical_time: 17:00                                    │
│       │                                                      │
│       ├──▶ FlightInstance (2026-01-17)                      │
│       │    ├── scheduled: 17:00                              │
│       │    ├── actual: 18:26                                 │
│       │    └── delay: +86 minutes                           │
│       │                                                      │
│       ├──▶ FlightInstance (2026-01-17) ← Same day,          │
│       │    ├── scheduled: 20:00         different trip!     │
│       │    ├── actual: 20:15                                 │
│       │    └── delay: +15 minutes                           │
│       │                                                      │
│       └──▶ FlightInstance (2026-01-18)                      │
│            ├── scheduled: 17:00                              │
│            └── ...                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Composite Unique Key for FlightInstance:**
```
(flight_schedule_id, flight_date, scheduled_time)
```

### 3.2 Status Observation Pattern

Each scrape creates observations only when something changes:

```
Scrape 1 (16:30): BHA710 - Status: "On Time", Estimated: 17:00
Scrape 2 (17:00): BHA710 - Status: "Delayed", Estimated: 17:45  ← New observation
Scrape 3 (17:30): BHA710 - Status: "Delayed", Estimated: 17:45  ← Skip (no change)
Scrape 4 (18:00): BHA710 - Status: "Delayed", Estimated: 18:20  ← New observation
Scrape 5 (18:30): BHA710 - Status: "Landed", Actual: 18:26      ← New observation
```

### 3.3 Delay Types in Model

| Field | Location | Calculation | When Updated |
|-------|----------|-------------|--------------|
| `delay_minutes_at_observation` | FlightObservation | estimated - scheduled | Each scrape |
| `predicted_delay_minutes` | FlightInstance | Latest estimated - scheduled | Each scrape |
| `actual_delay_minutes` | FlightInstance | actual - scheduled | On completion |

---

## 4. Relationships Summary

| Parent | Child | Cardinality | Description |
|--------|-------|-------------|-------------|
| Airport | Route | 1:N | Airport can be origin of many routes |
| Airport | WeatherSnapshot | 1:N | Many weather readings per airport |
| Airline | FlightSchedule | 1:N | Airline operates many schedules |
| Route | FlightSchedule | 1:N | Route can have multiple flights |
| FlightSchedule | FlightInstance | 1:N | Schedule has many daily instances |
| FlightInstance | FlightObservation | 1:N | Instance observed multiple times |
| ScrapeJob | FlightObservation | 1:N | One scrape captures many flights |

---

## 5. Normalization Benefits

- **1NF**: All attributes atomic (no arrays in cells)
- **2NF**: No partial dependencies (all non-key attributes depend on full PK)
- **3NF**: No transitive dependencies (route_type derived from airports, stored for query speed)

This design allows:
- Tracking a flight across its entire lifecycle
- Analyzing patterns by airline, route, time of day
- Correlating delays with weather
- Easy ML feature extraction with SQL queries
