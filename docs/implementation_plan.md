# Implementation Plan
## Nepal Flight Delay Data Pipeline

---

## Goal

Create a data pipeline to store scraped TIA flight data in Supabase with proper entity modeling, status change tracking, and delay calculations for future ML training.

---

## User Review Required

> [!IMPORTANT]
> **Supabase Project**: You'll need to create a Supabase project and provide the credentials (URL + service role key) before we proceed to execution.

> [!WARNING]
> **Breaking Change to Scraper**: The existing scraper will be modified to push data to Supabase instead of just writing CSV files. CSV export can be retained as a backup option.

---

## Proposed Changes

### Component 1: Supabase Setup

#### [NEW] [supabase_config.py](file:///Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA/config/supabase_config.py)
- Supabase client configuration
- Environment variable handling for credentials
- Connection wrapper with retry logic

#### [NEW] [.env.example](file:///Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA/.env.example)
- Template for required environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `OPENWEATHER_API_KEY` (optional, for weather)

---

### Component 2: Database Migrations

#### [NEW] [migrations/001_create_schema.sql](file:///Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA/migrations/001_create_schema.sql)
- Create `flight_data` schema
- Create all 9 tables as defined in schema document
- Add indexes and constraints

#### [NEW] [migrations/002_seed_airports.sql](file:///Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA/migrations/002_seed_airports.sql)
- Seed Nepal airports (TIA, Pokhara, Biratnagar, etc.)
- Add common international origins (Delhi, Doha, Dubai, etc.)

#### [NEW] [migrations/003_create_functions.sql](file:///Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA/migrations/003_create_functions.sql)
- `calculate_delay_minutes` function
- `upsert_flight_instance` function
- `upsert_observation` function

---

### Component 3: Data Layer

#### [NEW] [data/models.py](file:///Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA/data/models.py)
- Python dataclasses/Pydantic models for entities
- Validation logic for scraped data
- Time parsing utilities (handle "16:25:0" format)

#### [NEW] [data/repository.py](file:///Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA/data/repository.py)
- `AirlineRepository`: get_or_create airline
- `RouteRepository`: get_or_create route
- `FlightRepository`: upsert flight instance & observation
- `WeatherRepository`: insert weather snapshots

---

### Component 4: Scraper Integration

#### [MODIFY] [scrape_flight_logs.py](file:///Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA/routes/scrape_flight_logs.py)

Current workflow:
```
Scrape → Parse HTML → Write CSV
```

New workflow:
```
Scrape → Parse HTML → Transform to Entities → Push to Supabase → (Optional) Write CSV
```

Changes:
- Add `--store-supabase` flag (default: true)
- Add `--store-csv` flag (for backup, default: false)
- Create `ScrapeJob` record at start
- For each flight row:
  - Get/create airline
  - Get/create route
  - Get/create flight schedule
  - Upsert flight instance
  - Create observation if status/time changed
- Update `ScrapeJob` with completion status

---

### Component 5: Weather Integration (Optional)

#### [NEW] [data/weather_client.py](file:///Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA/data/weather_client.py)
- OpenWeatherMap API client
- Fetch current weather for airport coordinates
- Transform to `WeatherSnapshot` model
- Called at start of each scrape job

---

## Verification Plan

### Automated Tests

#### Test 1: Data Model Validation
```bash
cd /Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA
python -m pytest tests/test_models.py -v
```
- Test time parsing ("16:25:0" → time object)
- Test delay calculation
- Test flight instance uniqueness

#### Test 2: Repository Tests (requires test Supabase)
```bash
python -m pytest tests/test_repository.py -v
```
- Test airline upsert
- Test flight instance creation
- Test observation deduplication

### Manual Verification

#### Step 1: Database Migration
1. Run migrations in Supabase SQL editor
2. Verify all 9 tables created
3. Verify seed data (airports) present

#### Step 2: Single Scrape Test
```bash
cd /Users/sonamkhadka/Desktop/Developer/projects/troll/Troll_TIA
python routes/scrape_flight_logs.py --headed --store-supabase
```
1. Watch scraper run in browser
2. Check Supabase dashboard:
   - `scrape_jobs` has 1 new record with status="success"
   - `flight_instances` has new records
   - `flight_observations` has records

#### Step 3: Second Scrape (Status Change Detection)
1. Wait 30 minutes (or manually change status in source)
2. Run scraper again
3. Verify:
   - Same flight instances (no duplicates)
   - New observations only if status/time changed

#### Step 4: Delay Calculation Check
```sql
-- Run in Supabase SQL editor
SELECT
    flight_number,
    scheduled_time,
    estimated_time,
    predicted_delay_minutes
FROM flight_data.vw_flight_summary
WHERE predicted_delay_minutes IS NOT NULL
LIMIT 10;
```
- Verify delay values match manual calculation

---

## File Structure After Implementation

```
Troll_TIA/
├── config/
│   └── supabase_config.py       [NEW]
├── data/
│   ├── models.py                [NEW]
│   ├── repository.py            [NEW]
│   └── weather_client.py        [NEW]
├── migrations/
│   ├── 001_create_schema.sql    [NEW]
│   ├── 002_seed_airports.sql    [NEW]
│   └── 003_create_functions.sql [NEW]
├── routes/
│   └── scrape_flight_logs.py    [MODIFIED]
├── tests/
│   ├── test_models.py           [NEW]
│   └── test_repository.py       [NEW]
├── .env.example                 [NEW]
├── .env                         [USER CREATES]
└── requirements.txt             [MODIFIED - add supabase, pydantic]
```

---

## Dependencies to Add

```txt
# requirements.txt additions
supabase>=2.0.0
pydantic>=2.0.0
python-dotenv>=1.0.0
httpx>=0.25.0  # for weather API
```

---

## Estimated Effort

| Phase | Estimated Time |
|-------|----------------|
| Supabase Setup | 30 min |
| Migrations | 1 hour |
| Data Layer | 2 hours |
| Scraper Modification | 2 hours |
| Testing | 1 hour |
| **Total** | ~6-7 hours |
