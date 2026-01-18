import React from 'react';
import { getFlightSummary, getStatusHistory, getLatestWeather } from '@/lib/data';
import { StatsGrid } from '@/components/StatsGrid';
import { FlightList } from '@/components/FlightList';
import { DelayTimeline } from '@/components/DelayTimeline';
import { WeatherWidget } from '@/components/WeatherWidget';

// Ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const flights = await getFlightSummary();
  const history = await getStatusHistory();
  const weather = await getLatestWeather();

  // Calculate Stats
  const totalFlights = flights.length;

  // Avg Delay (only for delayed flights to avoid skewing with negatives/zeros?)
  // Normally avg delay includes everyone. Let's filter for valid numbers.
  const validDelays = flights
    .map(f => f.predicted_delay_minutes || f.actual_delay_minutes || 0)
    .filter(d => d > 0); // Only counting delays > 0 for "Average Delay" usually makes more sense for impact

  const avgDelay = validDelays.length > 0
    ? validDelays.reduce((a, b) => a + b, 0) / validDelays.length
    : 0;

  // On Time % (Arrival within 15 mins of schedule)
  const onTimeCount = flights.filter(f => {
    const delay = f.predicted_delay_minutes || f.actual_delay_minutes || 0;
    return delay <= 15 && !f.is_cancelled;
  }).length;

  const onTimePercentage = totalFlights > 0 ? (onTimeCount / totalFlights) * 100 : 100;

  return (
    <main className="relative min-h-screen px-4 md:px-10 lg:px-12 py-8 max-w-[1600px] mx-auto">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-accent-warm/20 blur-3xl animate-drift" />
        <div className="absolute bottom-16 right-24 h-64 w-64 rounded-full bg-accent-cool/20 blur-3xl animate-float-slow" />
      </div>

      {/* Header */}
      <header className="relative z-10 mb-10 animate-rise">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live feed
              </span>
              <span>Tribhuwan Intl Airport</span>
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight text-slate-900">
              TIA Operations Canvas
            </h1>
            <p className="mt-3 text-base md:text-lg text-slate-600">
              International arrivals, departure flow, delay risk, and weather clarity in one crisp view.
            </p>
          </div>

          <div className="glass-panel-strong rounded-3xl p-5 w-full lg:w-[360px]">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
              <span>Network status</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                Stable
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl bg-white/80 border border-slate-100 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Flights now</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{totalFlights}</p>
              </div>
              <div className="rounded-2xl bg-white/80 border border-slate-100 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">On-time</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{Math.round(onTimePercentage)}%</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Coverage: arrivals + departures • Update cadence 5 min
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">Kathmandu · UTC+5:45</span>
          <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">Predictive delay lens</span>
          <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">Seasonal performance</span>
        </div>
      </header>

      {/* Stats Row */}
      <StatsGrid
        avgDelay={avgDelay}
        totalFlights={totalFlights}
        onTimePercentage={onTimePercentage}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        {/* Left: Flight List (takes 3 cols) */}
        <div className="lg:col-span-3">
          <FlightList flights={flights} />
        </div>

        {/* Right: Analysis Sidebar (takes 1 col) */}
        <div className="lg:col-span-1 space-y-6">
          <DelayTimeline history={history} />
          <WeatherWidget weather={weather} />
        </div>
      </div>
    </main>
  );
}
