import { supabaseAdmin } from './supabase';
import { buildNepalDateTime, getNepalNow, toNepalDateString } from './time';

export interface FlightSummary {
  instance_id: string;
  flight_date: string;
  flight_number: string;
  airline_name: string;
  origin: string;
  origin_city: string;
  destination: string;
  destination_city: string;
  route_type: string;
  direction: 'arrival' | 'departure';
  scheduled_time: string;
  estimated_time: string | null;
  actual_time: string | null;
  predicted_delay_minutes: number | null;
  actual_delay_minutes: number | null;
  final_status: string | null;
  is_cancelled: boolean;
  day_of_week: number;
  scheduled_hour: number;
  first_seen_at: string;
  last_updated_at: string;
}

export interface FlightStatusHistory {
  observation_id: string;
  flight_date: string;
  flight_number: string;
  airline_name: string;
  observed_at: string;
  status: string | null;
  estimated_time_observed: string | null;
  actual_time_observed: string | null;
  delay_minutes_at_observation: number | null;
  scrape_type: string | null;
}

export async function getFlightSummary() {
  const { data, error } = await supabaseAdmin
    .from('vw_flight_summary')
    .select('*')
    .order('flight_date', { ascending: false })
    .order('scheduled_time', { ascending: true });

  if (error) {
    console.error('Error fetching flight summary:', error);
    return [];
  }

  const flights = data as FlightSummary[];

  // Filter flights to show "Relevant Live Board"
  // Logic: Show Future flights OR Active flights OR Recent Past (completed within last 2 hours)

  // 1. Calculate Nepal Time
  const nepalNow = getNepalNow();
  const todayStr = toNepalDateString(nepalNow);

  return flights.filter(flight => {
    // If flight date is future, keep
    if (flight.flight_date > todayStr) return true;
    // If flight date is past, drop
    if (flight.flight_date < todayStr) return false;

    // Flight is today. Check time.
    const scheduledMs = buildNepalDateTime(flight.flight_date, flight.scheduled_time).getTime();
    if (Number.isNaN(scheduledMs)) return true;
    const minsSinceScheduled = Math.round((nepalNow.getTime() - scheduledMs) / 60000);

    // 1. Future flights (scheduled time is ahead) -> Always show
    if (minsSinceScheduled < 0) return true;

    // 2. Active flights (Not landed/departed/cancelled) -> Always show (e.g. delayed 5 hours)
    const status = flight.final_status?.toLowerCase() || '';
    const isCompleted = ['landed', 'departed', 'canceled', 'cancelled'].some(s => status.includes(s));

    if (!isCompleted) {
      // Stale Data Check: If status is seemingly active ("On Time") but scheduled > 5 hours ago, hide it.
      if (minsSinceScheduled > 300) return false;
      return true;
    }

    // 3. Recently completed (within last 3 hours to be generous) -> Show
    if (minsSinceScheduled <= 180) return true;

    return false; // Hide old completed flights
  });
}

export async function getStatusHistory(hoursBack = 24) {
  const cutoffIso = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('vw_status_history')
    .select('*')
    .gte('observed_at', cutoffIso)
    .order('observed_at', { ascending: true });

  if (error) {
    console.error('Error fetching status history:', error);
    return [];
  }

  return data as FlightStatusHistory[];
}

export interface WeatherSnapshot {
  id: string;
  observed_at: string;
  temp_celsius: number;
  conditions: string;
  visibility_km: number;
  wind_speed_kmh: number;
  humidity_percent: number;
}

export async function getLatestWeather() {
  const { data, error } = await supabaseAdmin
    .from('weather_snapshots')
    .select('*')
    .order('observed_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Ignore "no rows found" error
        console.error('Error fetching weather:', error);
    }
    return null;
  }

  return data as WeatherSnapshot;
}

export interface ScrapeJob {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string | null;
  flights_captured: number | null;
  error_message: string | null;
  scrape_type: string | null;
}

export async function getScrapeJobs(limit = 50) {
  const { data, error } = await supabaseAdmin
    .from('scrape_jobs')
    .select('id, started_at, completed_at, status, flights_captured, error_message, scrape_type')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching scrape jobs:', error);
    return [];
  }

  return data as ScrapeJob[];
}

export async function getLatestScrapeJob() {
  const { data, error } = await supabaseAdmin
    .from('scrape_jobs')
    .select('id, started_at, completed_at, status, flights_captured, error_message, scrape_type')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching latest scrape job:', error);
    }
    return null;
  }

  return data as ScrapeJob;
}
