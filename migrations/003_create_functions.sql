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
