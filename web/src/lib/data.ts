import { supabaseAdmin } from './supabase';

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
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const nepalOffsetMs = (5 * 60 + 45) * 60 * 1000;
  const nepalDateObj = new Date(utcMs + nepalOffsetMs);

  const currentTotalMins = nepalDateObj.getHours() * 60 + nepalDateObj.getMinutes();
  const todayStr = nepalDateObj.toISOString().split('T')[0];

  return flights.filter(flight => {
    // If flight date is future, keep
    if (flight.flight_date > todayStr) return true;
    // If flight date is past, drop
    if (flight.flight_date < todayStr) return false;

    // Flight is today. Check time.
    // scheduled_time format "HH:MM:SS"
    const [h, m] = flight.scheduled_time.split(':').map(Number);
    const flightMins = h * 60 + m;

    const minsSinceScheduled = currentTotalMins - flightMins;

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

export async function getStatusHistory() {
  const { data, error } = await supabaseAdmin
    .from('vw_status_history')
    .select('*')
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
