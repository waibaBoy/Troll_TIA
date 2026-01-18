import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, Plane, Activity } from 'lucide-react';

interface StatsGridProps {
  avgDelay: number;
  totalFlights: number;
  onTimePercentage: number;
}

export function StatsGrid({ avgDelay, totalFlights, onTimePercentage }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Avg Delay Card */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-status-delayed/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-status-delayed/20" />

        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Avg Delay</p>
            <h3 className={cn(
              "text-4xl font-mono font-bold mt-1 text-glow",
              avgDelay > 15 ? "text-status-delayed" : "text-status-ontime"
            )}>
              +{Math.round(avgDelay)}<span className="text-lg text-slate-500 ml-1">m</span>
            </h3>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <Clock className={cn("w-6 h-6", avgDelay > 15 ? "text-status-delayed" : "text-status-ontime")} />
          </div>
        </div>

        <div className="flex items-center text-xs text-slate-500">
          <span className="text-status-delayed mr-2">↑ 12%</span> from last hour
        </div>
      </div>

      {/* Active Flights Card */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/20" />

        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Flights Tracked</p>
            <h3 className="text-4xl font-mono font-bold mt-1 text-white text-glow">
              {totalFlights}
            </h3>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <Plane className="w-6 h-6 text-blue-400" />
          </div>
        </div>

        <div className="flex items-center text-xs text-slate-500">
          <span className="text-emerald-400 mr-2">●</span> Live monitoring
        </div>
      </div>

      {/* On-Time Perf Card */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-status-ontime/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-status-ontime/20" />

        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">On-Time Perf</p>
            <h3 className={cn(
              "text-4xl font-mono font-bold mt-1 text-glow",
              onTimePercentage >= 80 ? "text-status-ontime" : "text-status-delayed"
            )}>
              {Math.round(onTimePercentage)}<span className="text-lg text-slate-500 ml-1">%</span>
            </h3>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <Activity className={cn("w-6 h-6", onTimePercentage >= 80 ? "text-status-ontime" : "text-status-delayed")} />
          </div>
        </div>

        <div className="flex items-center text-xs text-slate-500">
          Target: <span className="text-slate-300 ml-1">85%</span>
        </div>
      </div>
    </div>
  );
}
