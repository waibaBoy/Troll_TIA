-- 001_create_schema.sql
-- Migration 001: Create Schema and Tables
-- Run this in Supabase SQL Editor

-- Create schema
CREATE SCHEMA IF NOT EXISTS flight_data;

-- ============================================
-- 1. AIRPORTS
-- ============================================
CREATE TABLE flight_data.airports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iata_code VARCHAR(3) UNIQUE NOT NULL,
    icao_code VARCHAR(4) UNIQUE,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Nepal',
    is_primary BOOLEAN DEFAULT FALSE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(50) DEFAULT 'Asia/Kathmandu',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. AIRLINES
-- ============================================
CREATE TABLE flight_data.airlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iata_code VARCHAR(3),
    name VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. ROUTES
-- ============================================
CREATE TABLE flight_data.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_airport_id UUID NOT NULL REFERENCES flight_data.airports(id),
    destination_airport_id UUID NOT NULL REFERENCES flight_data.airports(id),
    route_type VARCHAR(20) NOT NULL CHECK (route_type IN ('domestic', 'international')),
    distance_km INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(origin_airport_id, destination_airport_id)
);

-- ============================================
-- 4. SCRAPE JOBS (must be before flight_observations due to FK)
-- ============================================
CREATE TABLE flight_data.scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airport_id UUID REFERENCES flight_data.airports(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('running', 'success', 'failed', 'partial')),
    flights_captured INTEGER DEFAULT 0,
    error_message TEXT,
    scrape_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scrape_jobs_time ON flight_data.scrape_jobs(started_at);

-- ============================================
-- 5. FLIGHT SCHEDULES
-- ============================================
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

-- ============================================
-- 6. FLIGHT INSTANCES (Core Table)
-- ============================================
CREATE TABLE flight_data.flight_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_schedule_id UUID NOT NULL REFERENCES flight_data.flight_schedules(id),
    flight_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    estimated_time TIME,
    actual_time TIME,
    final_status VARCHAR(50),
    predicted_delay_minutes INTEGER,
    actual_delay_minutes INTEGER,
    is_cancelled BOOLEAN DEFAULT FALSE,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(flight_schedule_id, flight_date, scheduled_time)
);

CREATE INDEX idx_flight_instances_date ON flight_data.flight_instances(flight_date);
CREATE INDEX idx_flight_instances_schedule ON flight_data.flight_instances(flight_schedule_id);

-- ============================================
-- 7. FLIGHT OBSERVATIONS (Status History)
-- ============================================
CREATE TABLE flight_data.flight_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_instance_id UUID NOT NULL REFERENCES flight_data.flight_instances(id),
    scrape_job_id UUID REFERENCES flight_data.scrape_jobs(id),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50),
    estimated_time_observed TIME,
    actual_time_observed TIME,
    delay_minutes_at_observation INTEGER,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_observations_instance ON flight_data.flight_observations(flight_instance_id);
CREATE INDEX idx_observations_time ON flight_data.flight_observations(observed_at);

-- ============================================
-- 8. WEATHER SNAPSHOTS
-- ============================================
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

-- ============================================
-- 9. SPECIAL EVENTS
-- ============================================
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


-- 002_seed_airports.sql
-- Migration 002: Seed Airports
-- Run this in Supabase SQL Editor after 001_create_schema.sql

-- Nepal Airports
INSERT INTO flight_data.airports (iata_code, icao_code, name, city, country, is_primary, latitude, longitude) VALUES
('KTM', 'VNKT', 'Tribhuvan International Airport', 'Kathmandu', 'Nepal', true, 27.6966, 85.3591),
('PKR', 'VNPK', 'Pokhara International Airport', 'Pokhara', 'Nepal', false, 28.2009, 83.9821),
('BWA', 'VNBW', 'Gautam Buddha International Airport', 'Bhairahawa', 'Nepal', false, 27.5056, 83.4164),
('BIR', 'VNVT', 'Biratnagar Airport', 'Biratnagar', 'Nepal', false, 26.4815, 87.2640),
('BJU', 'VNBJ', 'Janakpur Airport', 'Janakpur', 'Nepal', false, 26.7088, 85.9224),
('DHI', 'VNDH', 'Dhangadhi Airport', 'Dhangadhi', 'Nepal', false, 28.7533, 80.5819),
('BDP', 'VNBD', 'Bhadrapur Airport', 'Bhadrapur', 'Nepal', false, 26.5708, 88.0796),
('KEP', 'VNNG', 'Nepalgunj Airport', 'Nepalgunj', 'Nepal', false, 28.1036, 81.6670),
('SIF', 'VNSI', 'Simara Airport', 'Simara', 'Nepal', false, 27.1595, 84.9801)
ON CONFLICT (iata_code) DO NOTHING;

-- Common International Destinations (from your data)
INSERT INTO flight_data.airports (iata_code, icao_code, name, city, country, latitude, longitude, timezone) VALUES
('DEL', 'VIDP', 'Indira Gandhi International Airport', 'Delhi', 'India', 28.5562, 77.1000, 'Asia/Kolkata'),
('DOH', 'OTHH', 'Hamad International Airport', 'Doha', 'Qatar', 25.2731, 51.6081, 'Asia/Qatar'),
('DXB', 'OMDB', 'Dubai International Airport', 'Dubai', 'UAE', 25.2532, 55.3657, 'Asia/Dubai'),
('DAC', 'VGHS', 'Shahjalal International Airport', 'Dhaka', 'Bangladesh', 23.8433, 90.3978, 'Asia/Dhaka'),
('BKK', 'VTBS', 'Suvarnabhumi Airport', 'Bangkok', 'Thailand', 13.6900, 100.7501, 'Asia/Bangkok'),
('KUL', 'WMKK', 'Kuala Lumpur International Airport', 'Kuala Lumpur', 'Malaysia', 2.7456, 101.7099, 'Asia/Kuala_Lumpur'),
('SIN', 'WSSS', 'Singapore Changi Airport', 'Singapore', 'Singapore', 1.3644, 103.9915, 'Asia/Singapore'),
('HKG', 'VHHH', 'Hong Kong International Airport', 'Hong Kong', 'Hong Kong', 22.3080, 113.9185, 'Asia/Hong_Kong'),
('CAN', 'ZGGG', 'Guangzhou Baiyun International Airport', 'Guangzhou', 'China', 23.3925, 113.2988, 'Asia/Shanghai'),
('SHJ', 'OMSJ', 'Sharjah International Airport', 'Sharjah', 'UAE', 25.3286, 55.5172, 'Asia/Dubai'),
('NRT', 'RJAA', 'Narita International Airport', 'Tokyo', 'Japan', 35.7720, 140.3929, 'Asia/Tokyo'),
('KWI', 'OKBK', 'Kuwait International Airport', 'Kuwait', 'Kuwait', 29.2266, 47.9689, 'Asia/Kuwait'),
('DMM', 'OEDF', 'King Fahd International Airport', 'Dammam', 'Saudi Arabia', 26.4712, 49.7979, 'Asia/Riyadh')
ON CONFLICT (iata_code) DO NOTHING;


-- 003_create_functions.sql
-- Migration 003: Create Functions and Views
-- Run this in Supabase SQL Editor after 002_seed_airports.sql

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate delay in minutes between two times
CREATE OR REPLACE FUNCTION flight_data.calculate_delay_minutes(
    scheduled TIME,
    comparison TIME
) RETURNS INTEGER AS $$
BEGIN
    IF comparison IS NULL OR scheduled IS NULL THEN
        RETURN NULL;
    END IF;
    -- Handle overnight flights (comparison time is earlier = next day)
    IF comparison < scheduled AND (scheduled - comparison) > INTERVAL '12 hours' THEN
        -- Comparison is next day
        RETURN EXTRACT(EPOCH FROM (comparison + INTERVAL '24 hours' - scheduled)) / 60;
    ELSE
        RETURN EXTRACT(EPOCH FROM (comparison - scheduled)) / 60;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get or create an airline by name
CREATE OR REPLACE FUNCTION flight_data.get_or_create_airline(
    p_name VARCHAR,
    p_iata_code VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_airline_id UUID;
BEGIN
    SELECT id INTO v_airline_id
    FROM flight_data.airlines
    WHERE name = p_name;

    IF v_airline_id IS NULL THEN
        INSERT INTO flight_data.airlines (name, iata_code)
        VALUES (p_name, p_iata_code)
        RETURNING id INTO v_airline_id;
    END IF;

    RETURN v_airline_id;
END;
$$ LANGUAGE plpgsql;

-- Get or create a route
CREATE OR REPLACE FUNCTION flight_data.get_or_create_route(
    p_origin_iata VARCHAR,
    p_destination_iata VARCHAR
) RETURNS UUID AS $$
DECLARE
    v_route_id UUID;
    v_origin_id UUID;
    v_dest_id UUID;
    v_route_type VARCHAR;
BEGIN
    -- Get airport IDs
    SELECT id INTO v_origin_id FROM flight_data.airports WHERE iata_code = p_origin_iata;
    SELECT id INTO v_dest_id FROM flight_data.airports WHERE iata_code = p_destination_iata;

    IF v_origin_id IS NULL OR v_dest_id IS NULL THEN
        RAISE EXCEPTION 'Airport not found: % or %', p_origin_iata, p_destination_iata;
    END IF;

    -- Check if route exists
    SELECT id INTO v_route_id
    FROM flight_data.routes
    WHERE origin_airport_id = v_origin_id AND destination_airport_id = v_dest_id;

    IF v_route_id IS NULL THEN
        -- Determine route type based on countries
        SELECT CASE
            WHEN o.country = 'Nepal' AND d.country = 'Nepal' THEN 'domestic'
            ELSE 'international'
        END INTO v_route_type
        FROM flight_data.airports o, flight_data.airports d
        WHERE o.id = v_origin_id AND d.id = v_dest_id;

        INSERT INTO flight_data.routes (origin_airport_id, destination_airport_id, route_type)
        VALUES (v_origin_id, v_dest_id, v_route_type)
        RETURNING id INTO v_route_id;
    END IF;

    RETURN v_route_id;
END;
$$ LANGUAGE plpgsql;

-- Get or create a flight schedule
CREATE OR REPLACE FUNCTION flight_data.get_or_create_flight_schedule(
    p_airline_name VARCHAR,
    p_flight_number VARCHAR,
    p_origin_iata VARCHAR,
    p_destination_iata VARCHAR,
    p_direction VARCHAR
) RETURNS UUID AS $$
DECLARE
    v_schedule_id UUID;
    v_airline_id UUID;
    v_route_id UUID;
BEGIN
    -- Get or create airline
    v_airline_id := flight_data.get_or_create_airline(p_airline_name);

    -- Get or create route
    v_route_id := flight_data.get_or_create_route(p_origin_iata, p_destination_iata);

    -- Check if schedule exists
    SELECT id INTO v_schedule_id
    FROM flight_data.flight_schedules
    WHERE flight_number = p_flight_number
      AND route_id = v_route_id
      AND direction = p_direction;

    IF v_schedule_id IS NULL THEN
        INSERT INTO flight_data.flight_schedules (airline_id, route_id, flight_number, direction)
        VALUES (v_airline_id, v_route_id, p_flight_number, p_direction)
        RETURNING id INTO v_schedule_id;
    END IF;

    RETURN v_schedule_id;
END;
$$ LANGUAGE plpgsql;

-- Upsert a flight instance and return its ID
CREATE OR REPLACE FUNCTION flight_data.upsert_flight_instance(
    p_flight_schedule_id UUID,
    p_flight_date DATE,
    p_scheduled_time TIME,
    p_estimated_time TIME,
    p_actual_time TIME,
    p_status VARCHAR
) RETURNS UUID AS $$
DECLARE
    v_instance_id UUID;
    v_predicted_delay INTEGER;
    v_actual_delay INTEGER;
BEGIN
    v_predicted_delay := flight_data.calculate_delay_minutes(p_scheduled_time, p_estimated_time);
    v_actual_delay := flight_data.calculate_delay_minutes(p_scheduled_time, p_actual_time);

    INSERT INTO flight_data.flight_instances (
        flight_schedule_id, flight_date, scheduled_time,
        estimated_time, actual_time, final_status,
        predicted_delay_minutes, actual_delay_minutes
    )
    VALUES (
        p_flight_schedule_id, p_flight_date, p_scheduled_time,
        p_estimated_time, p_actual_time, p_status,
        v_predicted_delay, v_actual_delay
    )
    ON CONFLICT (flight_schedule_id, flight_date, scheduled_time)
    DO UPDATE SET
        estimated_time = COALESCE(EXCLUDED.estimated_time, flight_data.flight_instances.estimated_time),
        actual_time = COALESCE(EXCLUDED.actual_time, flight_data.flight_instances.actual_time),
        final_status = EXCLUDED.final_status,
        predicted_delay_minutes = COALESCE(v_predicted_delay, flight_data.flight_instances.predicted_delay_minutes),
        actual_delay_minutes = COALESCE(v_actual_delay, flight_data.flight_instances.actual_delay_minutes),
        last_updated_at = NOW()
    RETURNING id INTO v_instance_id;

    RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR ML FEATURE EXTRACTION
-- ============================================

-- Flight Summary View (for easy querying)
CREATE OR REPLACE VIEW flight_data.vw_flight_summary AS
SELECT
    fi.id AS instance_id,
    fi.flight_date,
    fs.flight_number,
    a.name AS airline_name,
    orig.iata_code AS origin,
    orig.city AS origin_city,
    dest.iata_code AS destination,
    dest.city AS destination_city,
    r.route_type,
    fs.direction,
    fi.scheduled_time,
    fi.estimated_time,
    fi.actual_time,
    fi.predicted_delay_minutes,
    fi.actual_delay_minutes,
    fi.final_status,
    fi.is_cancelled,
    EXTRACT(DOW FROM fi.flight_date) AS day_of_week,
    EXTRACT(HOUR FROM fi.scheduled_time) AS scheduled_hour,
    fi.first_seen_at,
    fi.last_updated_at
FROM flight_data.flight_instances fi
JOIN flight_data.flight_schedules fs ON fi.flight_schedule_id = fs.id
JOIN flight_data.airlines a ON fs.airline_id = a.id
JOIN flight_data.routes r ON fs.route_id = r.id
JOIN flight_data.airports orig ON r.origin_airport_id = orig.id
JOIN flight_data.airports dest ON r.destination_airport_id = dest.id;

-- Status History View (for tracking changes)
CREATE OR REPLACE VIEW flight_data.vw_status_history AS
SELECT
    fo.id AS observation_id,
    fi.flight_date,
    fs.flight_number,
    a.name AS airline_name,
    fo.observed_at,
    fo.status,
    fo.estimated_time_observed,
    fo.actual_time_observed,
    fo.delay_minutes_at_observation,
    sj.scrape_type
FROM flight_data.flight_observations fo
JOIN flight_data.flight_instances fi ON fo.flight_instance_id = fi.id
JOIN flight_data.flight_schedules fs ON fi.flight_schedule_id = fs.id
JOIN flight_data.airlines a ON fs.airline_id = a.id
LEFT JOIN flight_data.scrape_jobs sj ON fo.scrape_job_id = sj.id
ORDER BY fo.observed_at;
