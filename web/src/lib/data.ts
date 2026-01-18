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

  return data as FlightSummary[];
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
