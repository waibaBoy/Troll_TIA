# Database Schema Design
## Nepal Flight Delay Prediction - Supabase/PostgreSQL

---

## Schema Overview

```
flight_data (schema)
├── airports
├── airlines
├── routes
├── flight_schedules
├── flight_instances
├── flight_observations
├── weather_snapshots
├── scrape_jobs
└── special_events
```

---

## 1. Tables Definition

### 1.1 airports

```sql
CREATE TABLE flight_data.airports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iata_code VARCHAR(3) UNIQUE NOT NULL,
    icao_code VARCHAR(4) UNIQUE,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Nepal',
    is_primary BOOLEAN DEFAULT FALSE,  -- TIA = true
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(50) DEFAULT 'Asia/Kathmandu',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial airports
INSERT INTO flight_data.airports (iata_code, icao_code, name, city, is_primary) VALUES
('KTM', 'VNKT', 'Tribhuvan International Airport', 'Kathmandu', true),
('PKR', 'VNPK', 'Pokhara International Airport', 'Pokhara', false),
('BWA', 'VNBW', 'Gautam Buddha International Airport', 'Bhairahawa', false),
('BIR', 'VNVT', 'Biratnagar Airport', 'Biratnagar', false),
('BJU', 'VNBJ', 'Janakpur Airport', 'Janakpur', false),
('DHI', 'VNDH', 'Dhangadhi Airport', 'Dhangadhi', false),
('BDP', 'VNBD', 'Bhadrapur Airport', 'Bhadrapur', false),
('KEP', 'VNNG', 'Nepalgunj Airport', 'Nepalgunj', false),
('SIF', 'VNSI', 'Simara Airport', 'Simara', false);
```

### 1.2 airlines

```sql
CREATE TABLE flight_data.airlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iata_code VARCHAR(3),  -- Some may not have
    name VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create airline if not exists (handled in application)
```

### 1.3 routes

```sql
CREATE TABLE flight_data.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_airport_id UUID NOT NULL REFERENCES flight_data.airports(id),
    destination_airport_id UUID NOT NULL REFERENCES flight_data.airports(id),
    route_type VARCHAR(20) NOT NULL CHECK (route_type IN ('domestic', 'international')),
    distance_km INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(origin_airport_id, destination_airport_id)
);
```

### 1.4 flight_schedules

```sql
CREATE TABLE flight_data.flight_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airline_id UUID NOT NULL REFERENCES flight_data.airlines(id),
    route_id UUID NOT NULL REFERENCES flight_data.routes(id),
    flight_number VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('arrival', 'departure')),
    typical_scheduled_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(flight_number, route_id, direction)
);

CREATE INDEX idx_flight_schedules_flight_number ON flight_data.flight_schedules(flight_number);
```

### 1.5 flight_instances (Core Table)

```sql
CREATE TABLE flight_data.flight_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_schedule_id UUID NOT NULL REFERENCES flight_data.flight_schedules(id),
    flight_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    estimated_time TIME,
    actual_time TIME,
    final_status VARCHAR(50),
    predicted_delay_minutes INTEGER,  -- estimated - scheduled
    actual_delay_minutes INTEGER,     -- actual - scheduled
    is_cancelled BOOLEAN DEFAULT FALSE,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(flight_schedule_id, flight_date, scheduled_time)
);

CREATE INDEX idx_flight_instances_date ON flight_data.flight_instances(flight_date);
CREATE INDEX idx_flight_instances_schedule ON flight_data.flight_instances(flight_schedule_id);
```

### 1.6 flight_observations (Status History)

```sql
CREATE TABLE flight_data.flight_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_instance_id UUID NOT NULL REFERENCES flight_data.flight_instances(id),
    scrape_job_id UUID REFERENCES flight_data.scrape_jobs(id),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50),
    estimated_time_observed TIME,
    actual_time_observed TIME,
    delay_minutes_at_observation INTEGER,
    raw_data JSONB,  -- Store original scraped row
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_observations_instance ON flight_data.flight_observations(flight_instance_id);
CREATE INDEX idx_observations_time ON flight_data.flight_observations(observed_at);
```

### 1.7 weather_snapshots

```sql
CREATE TABLE flight_data.weather_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airport_id UUID NOT NULL REFERENCES flight_data.airports(id),
    observed_at TIMESTAMPTZ NOT NULL,
    temp_celsius DECIMAL(5, 2),
    visibility_km DECIMAL(6, 2),
    wind_speed_kmh DECIMAL(5, 2),
    wind_direction VARCHAR(10),
    precipitation_mm DECIMAL(5, 2),
    humidity_percent INTEGER,
    conditions VARCHAR(100),
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(airport_id, observed_at)
);

CREATE INDEX idx_weather_airport_time ON flight_data.weather_snapshots(airport_id, observed_at);
```

### 1.8 scrape_jobs

```sql
CREATE TABLE flight_data.scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airport_id UUID REFERENCES flight_data.airports(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('running', 'success', 'failed', 'partial')),
    flights_captured INTEGER DEFAULT 0,
    error_message TEXT,
    scrape_type VARCHAR(50),  -- 'int_arrival', 'dom_departure', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scrape_jobs_time ON flight_data.scrape_jobs(started_at);
```

### 1.9 special_events

```sql
CREATE TABLE flight_data.special_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date DATE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) CHECK (event_type IN ('holiday', 'festival', 'strike', 'weather', 'other')),
    country VARCHAR(100) DEFAULT 'Nepal',
    impact_level VARCHAR(20) CHECK (impact_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_date, event_name)
);

CREATE INDEX idx_special_events_date ON flight_data.special_events(event_date);
```

---

## 2. Views for ML Feature Extraction

### 2.1 Flight Summary View

```sql
CREATE VIEW flight_data.vw_flight_summary AS
SELECT
    fi.id AS instance_id,
    fi.flight_date,
    fs.flight_number,
    a.name AS airline_name,
    orig.iata_code AS origin,
    dest.iata_code AS destination,
    r.route_type,
    fs.direction,
    fi.scheduled_time,
    fi.estimated_time,
    fi.actual_time,
    fi.predicted_delay_minutes,
    fi.actual_delay_minutes,
    fi.final_status,
    EXTRACT(DOW FROM fi.flight_date) AS day_of_week,
    EXTRACT(HOUR FROM fi.scheduled_time) AS scheduled_hour
FROM flight_data.flight_instances fi
JOIN flight_data.flight_schedules fs ON fi.flight_schedule_id = fs.id
JOIN flight_data.airlines a ON fs.airline_id = a.id
JOIN flight_data.routes r ON fs.route_id = r.id
JOIN flight_data.airports orig ON r.origin_airport_id = orig.id
JOIN flight_data.airports dest ON r.destination_airport_id = dest.id;
```

---

## 3. Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE flight_data.flight_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_data.flight_observations ENABLE ROW LEVEL SECURITY;

-- Policy for service role (scraper)
CREATE POLICY "Service role full access" ON flight_data.flight_instances
    FOR ALL USING (auth.role() = 'service_role');

-- Policy for anon read (if exposing API later)
CREATE POLICY "Anon read access" ON flight_data.flight_instances
    FOR SELECT USING (true);
```

---

## 4. Functions

### 4.1 Calculate Delay

```sql
CREATE OR REPLACE FUNCTION flight_data.calculate_delay_minutes(
    scheduled TIME,
    comparison TIME
) RETURNS INTEGER AS $$
BEGIN
    IF comparison IS NULL OR scheduled IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN EXTRACT(EPOCH FROM (comparison - scheduled)) / 60;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Upsert Flight Instance

```sql
CREATE OR REPLACE FUNCTION flight_data.upsert_flight_instance(
    p_flight_schedule_id UUID,
    p_flight_date DATE,
    p_scheduled_time TIME,
    p_estimated_time TIME,
    p_status VARCHAR
) RETURNS UUID AS $$
DECLARE
    v_instance_id UUID;
    v_predicted_delay INTEGER;
BEGIN
    v_predicted_delay := flight_data.calculate_delay_minutes(p_scheduled_time, p_estimated_time);

    INSERT INTO flight_data.flight_instances (
        flight_schedule_id, flight_date, scheduled_time,
        estimated_time, final_status, predicted_delay_minutes
    )
    VALUES (
        p_flight_schedule_id, p_flight_date, p_scheduled_time,
        p_estimated_time, p_status, v_predicted_delay
    )
    ON CONFLICT (flight_schedule_id, flight_date, scheduled_time)
    DO UPDATE SET
        estimated_time = EXCLUDED.estimated_time,
        final_status = EXCLUDED.final_status,
        predicted_delay_minutes = v_predicted_delay,
        last_updated_at = NOW()
    RETURNING id INTO v_instance_id;

    RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql;
```
