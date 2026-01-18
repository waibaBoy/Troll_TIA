import React from 'react';
import { WeatherSnapshot } from '@/lib/data';
import { CloudRain, Sun, Cloud, Wind, Droplets, Eye } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for classnames

interface WeatherWidgetProps {
  weather: WeatherSnapshot | null;
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  if (!weather) {
    return (
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden h-full flex flex-col justify-center items-center text-center">
        <div className="absolute inset-0 pattern-grid opacity-30 pointer-events-none" />
        <div className="relative">
          <Cloud className="w-12 h-12 text-slate-400 mb-2 opacity-60" />
          <p className="text-slate-500 text-sm">Waiting for weather data...</p>
        </div>
      </div>
    );
  }

  // Determine Icon based on conditions
  const condition = weather.conditions.toLowerCase();
  let Icon = Cloud;
  let iconColor = "text-slate-400";

  if (condition.includes('rain') || condition.includes('drizzle')) {
    Icon = CloudRain;
    iconColor = "text-accent-cool";
  } else if (condition.includes('clear') || condition.includes('sun')) {
    Icon = Sun;
    iconColor = "text-accent-warm";
  } else if (condition.includes('cloud')) {
    Icon = Cloud;
    iconColor = "text-slate-500";
  }

  return (
    <div className="glass-panel p-6 rounded-3xl relative overflow-hidden h-full">
      <div className="absolute inset-0 pattern-grid opacity-30 pointer-events-none" />
      {/* Background glow effect */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 transition-all opacity-25",
        condition.includes('sun') ? "bg-accent-warm" : "bg-accent-cool"
      )}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn("w-5 h-5", iconColor)} />
          <h3 className="font-semibold text-lg text-slate-900 tracking-tight">KTM Weather</h3>
        </div>

        <div className="flex items-end gap-3 mb-6">
          <span className="text-4xl font-mono font-semibold text-slate-900 text-glow">
            {Math.round(weather.temp_celsius)}°
          </span>
          <span className="text-sm text-slate-500 pb-1 mb-1 capitalize">
            {weather.conditions}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center bg-white/80 rounded-xl p-2 border border-slate-100">
            <Wind className="w-4 h-4 text-slate-400 mb-1" />
            <span className="text-xs font-mono text-slate-900">{Math.round(weather.wind_speed_kmh)}</span>
            <span className="text-[10px] text-slate-500">km/h</span>
          </div>
          <div className="flex flex-col items-center bg-white/80 rounded-xl p-2 border border-slate-100">
            <Eye className="w-4 h-4 text-slate-400 mb-1" />
            <span className="text-xs font-mono text-slate-900">{weather.visibility_km}</span>
            <span className="text-[10px] text-slate-500">km</span>
          </div>
          <div className="flex flex-col items-center bg-white/80 rounded-xl p-2 border border-slate-100">
            <Droplets className="w-4 h-4 text-slate-400 mb-1" />
            <span className="text-xs font-mono text-slate-900">{weather.humidity_percent}%</span>
            <span className="text-[10px] text-slate-500">hum</span>
          </div>
        </div>

        <div className="mt-4 text-[10px] text-slate-500 text-center">
          Updated: {new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kathmandu',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(weather.observed_at))} NPT
        </div>
      </div>
    </div>
  );
}
