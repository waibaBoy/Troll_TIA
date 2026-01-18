-- Migration 001: Create Tables (Using PUBLIC schema for Supabase compatibility)
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. AIRPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS airports (
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
CREATE TABLE IF NOT EXISTS airlines (
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
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_airport_id UUID NOT NULL REFERENCES airports(id),
    destination_airport_id UUID NOT NULL REFERENCES airports(id),
    route_type VARCHAR(20) NOT NULL CHECK (route_type IN ('domestic', 'international')),
    distance_km INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(origin_airport_id, destination_airport_id)
);

-- ============================================
-- 4. SCRAPE JOBS
-- ============================================
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airport_id UUID REFERENCES airports(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('running', 'success', 'failed', 'partial')),
    flights_captured INTEGER DEFAULT 0,
    error_message TEXT,
    scrape_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_time ON scrape_jobs(started_at);

-- ============================================
-- 5. FLIGHT SCHEDULES
-- ============================================
CREATE TABLE IF NOT EXISTS flight_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airline_id UUID NOT NULL REFERENCES airlines(id),
    route_id UUID NOT NULL REFERENCES routes(id),
    flight_number VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('arrival', 'departure')),
    typical_scheduled_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(flight_number, route_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_flight_number ON flight_schedules(flight_number);

-- ============================================
-- 6. FLIGHT INSTANCES (Core Table)
-- ============================================
CREATE TABLE IF NOT EXISTS flight_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_schedule_id UUID NOT NULL REFERENCES flight_schedules(id),
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

CREATE INDEX IF NOT EXISTS idx_flight_instances_date ON flight_instances(flight_date);
CREATE INDEX IF NOT EXISTS idx_flight_instances_schedule ON flight_instances(flight_schedule_id);

-- ============================================
-- 7. FLIGHT OBSERVATIONS (Status History)
-- ============================================
CREATE TABLE IF NOT EXISTS flight_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_instance_id UUID NOT NULL REFERENCES flight_instances(id),
    scrape_job_id UUID REFERENCES scrape_jobs(id),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50),
    estimated_time_observed TIME,
    actual_time_observed TIME,
    delay_minutes_at_observation INTEGER,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observations_instance ON flight_observations(flight_instance_id);
CREATE INDEX IF NOT EXISTS idx_observations_time ON flight_observations(observed_at);

-- ============================================
-- 8. WEATHER SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS weather_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airport_id UUID NOT NULL REFERENCES airports(id),
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

CREATE INDEX IF NOT EXISTS idx_weather_airport_time ON weather_snapshots(airport_id, observed_at);

-- ============================================
-- 9. SPECIAL EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS special_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date DATE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) CHECK (event_type IN ('holiday', 'festival', 'strike', 'weather', 'other')),
    country VARCHAR(100) DEFAULT 'Nepal',
    impact_level VARCHAR(20) CHECK (impact_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_date, event_name)
);

CREATE INDEX IF NOT EXISTS idx_special_events_date ON special_events(event_date);

-- ============================================
-- SEED AIRPORTS
-- ============================================

-- Nepal Airports
INSERT INTO airports (iata_code, icao_code, name, city, country, is_primary, latitude, longitude) VALUES
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

-- Common International Destinations
INSERT INTO airports (iata_code, icao_code, name, city, country, latitude, longitude, timezone) VALUES
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

-- ============================================
-- VIEWS
-- ============================================

-- Flight Summary View
CREATE OR REPLACE VIEW vw_flight_summary AS
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
FROM flight_instances fi
JOIN flight_schedules fs ON fi.flight_schedule_id = fs.id
JOIN airlines a ON fs.airline_id = a.id
JOIN routes r ON fs.route_id = r.id
JOIN airports orig ON r.origin_airport_id = orig.id
JOIN airports dest ON r.destination_airport_id = dest.id;

-- Status History View
CREATE OR REPLACE VIEW vw_status_history AS
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
FROM flight_observations fo
JOIN flight_instances fi ON fo.flight_instance_id = fi.id
JOIN flight_schedules fs ON fi.flight_schedule_id = fs.id
JOIN airlines a ON fs.airline_id = a.id
LEFT JOIN scrape_jobs sj ON fo.scrape_job_id = sj.id
ORDER BY fo.observed_at;
