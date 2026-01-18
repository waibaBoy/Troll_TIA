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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
      {/* Avg Delay Card */}
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group animate-rise [animation-delay:100ms]">
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pattern-grid pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-status-delayed/15 rounded-full blur-3xl -mr-20 -mt-20" />

        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Avg delay</p>
            <h3 className={cn(
              "text-4xl font-mono font-semibold mt-2 text-glow",
              avgDelay > 15 ? "text-status-delayed" : "text-status-ontime"
            )}>
              +{Math.round(avgDelay)}<span className="text-base text-slate-400 ml-1">min</span>
            </h3>
          </div>
          <div className={cn(
            "p-3 rounded-2xl border",
            avgDelay > 15
              ? "bg-status-delayed/10 border-status-delayed/20"
              : "bg-status-ontime/10 border-status-ontime/20"
          )}>
            <Clock className={cn("w-6 h-6", avgDelay > 15 ? "text-status-delayed" : "text-status-ontime")} />
          </div>
        </div>

        <div className="flex items-center text-xs text-slate-500">
          Delay distribution updated every 30 mins
        </div>
      </div>

      {/* Active Flights Card */}
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group animate-rise [animation-delay:200ms]">
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pattern-grid pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-accent-cool/20 rounded-full blur-3xl -mr-20 -mt-20" />

        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Flights tracked</p>
            <h3 className="text-4xl font-mono font-semibold mt-2 text-slate-900 text-glow">
              {totalFlights}
            </h3>
          </div>
          <div className="p-3 rounded-2xl bg-accent-cool/10 border border-accent-cool/20">
            <Plane className="w-6 h-6 text-accent-cool" />
          </div>
        </div>

        <div className="flex items-center text-xs text-slate-500">
          <span className="text-emerald-600 mr-2">●</span> Live monitoring active
        </div>
      </div>

      {/* On-Time Perf Card */}
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group animate-rise [animation-delay:300ms]">
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pattern-grid pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-status-ontime/15 rounded-full blur-3xl -mr-20 -mt-20" />

        <div className="flex justify-between items-start mb-4 relative">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">On-time performance</p>
            <h3 className={cn(
              "text-4xl font-mono font-semibold mt-2 text-glow",
              onTimePercentage >= 80 ? "text-status-ontime" : "text-status-delayed"
            )}>
              {Math.round(onTimePercentage)}<span className="text-base text-slate-400 ml-1">%</span>
            </h3>
          </div>
          <div className={cn(
            "p-3 rounded-2xl border",
            onTimePercentage >= 80
              ? "bg-status-ontime/10 border-status-ontime/20"
              : "bg-status-delayed/10 border-status-delayed/20"
          )}>
            <Activity className={cn("w-6 h-6", onTimePercentage >= 80 ? "text-status-ontime" : "text-status-delayed")} />
          </div>
        </div>

        <div className="flex items-center text-xs text-slate-500">
          Target benchmark: <span className="text-slate-700 ml-1">85%</span>
        </div>
      </div>
    </div>
  );
}
