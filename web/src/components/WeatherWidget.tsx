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
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden h-full flex flex-col justify-center items-center text-center">
        <Cloud className="w-12 h-12 text-slate-600 mb-2 opacity-50" />
        <p className="text-slate-500 text-sm">Waiting for weather data...</p>
      </div>
    );
  }

  // Determine Icon based on conditions
  const condition = weather.conditions.toLowerCase();
  let Icon = Cloud;
  let iconColor = "text-slate-400";

  if (condition.includes('rain') || condition.includes('drizzle')) {
    Icon = CloudRain;
    iconColor = "text-blue-400";
  } else if (condition.includes('clear') || condition.includes('sun')) {
    Icon = Sun;
    iconColor = "text-amber-400";
  } else if (condition.includes('cloud')) {
    Icon = Cloud;
    iconColor = "text-slate-300";
  }

  return (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden h-full">
      {/* Background glow effect */}
      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 transition-all opacity-20",
        condition.includes('sun') ? "bg-amber-500" : "bg-blue-500")}
      />

      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn("w-5 h-5", iconColor)} />
        <h3 className="font-bold text-lg text-slate-200 tracking-tight">KTM Weather</h3>
      </div>

      <div className="flex items-end gap-3 mb-6">
        <span className="text-4xl font-mono font-bold text-white text-glow">
          {Math.round(weather.temp_celsius)}°
        </span>
        <span className="text-sm text-slate-400 pb-1 mb-1 capitalize">
          {weather.conditions}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center bg-white/5 rounded-lg p-2 border border-white/5">
          <Wind className="w-4 h-4 text-slate-400 mb-1" />
          <span className="text-xs font-mono text-white">{Math.round(weather.wind_speed_kmh)}</span>
          <span className="text-[10px] text-slate-500">km/h</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 rounded-lg p-2 border border-white/5">
          <Eye className="w-4 h-4 text-slate-400 mb-1" />
          <span className="text-xs font-mono text-white">{weather.visibility_km}</span>
          <span className="text-[10px] text-slate-500">km</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 rounded-lg p-2 border border-white/5">
          <Droplets className="w-4 h-4 text-slate-400 mb-1" />
          <span className="text-xs font-mono text-white">{weather.humidity_percent}%</span>
          <span className="text-[10px] text-slate-500">hum</span>
        </div>
      </div>

      <div className="mt-4 text-[10px] text-slate-600 text-center">
        Updated: {new Date(weather.observed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </div>
    </div>
  );
}
