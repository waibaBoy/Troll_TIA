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
