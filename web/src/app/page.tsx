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
    <main className="min-h-screen p-4 md:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-white mb-2">
            TIA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Live</span>
          </h1>
          <p className="text-slate-400">Real-time Flight Intelligence & Prediction</p>
        </div>
        <div className="flex items-center gap-4">
           {/* Maybe user profile or refresh button here */}
           <div className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400 border border-white/5">
              Live Connection
           </div>
        </div>
      </header>

      {/* Stats Row */}
      <StatsGrid
        avgDelay={avgDelay}
        totalFlights={totalFlights}
        onTimePercentage={onTimePercentage}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Flight List (takes 3 cols) */}
        <div className="lg:col-span-3">
          <FlightList flights={flights} />
        </div>

        {/* Right: Analysis Sidebar (takes 1 col) */}
        <div className="lg:col-span-1">
          <DelayTimeline history={history} />

          {/* Extra Widget ?? Weather maybe later */}
          {/* Weather Widget */}
          <div className="mt-6">
             <WeatherWidget weather={weather} />
          </div>
        </div>
      </div>
    </main>
  );
}
