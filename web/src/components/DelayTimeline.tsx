'use client';

import React from 'react';
import { FlightStatusHistory } from '@/lib/data';
import { cn, formatTime } from '@/lib/utils';
import { Clock, TrendingUp } from 'lucide-react';

interface DelayTimelineProps {
  history: FlightStatusHistory[];
}

export function DelayTimeline({ history }: DelayTimelineProps) {
  // 1. Find the flight with the most data points or highest delay
  // For demo, let's group by flight first
  const flightGroups = history.reduce((acc, curr) => {
    const key = curr.flight_number;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {} as Record<string, FlightStatusHistory[]>);

  // Find a flight with interesting history (more than 1 point, or high delay)
  const interestingFlightKey = Object.keys(flightGroups).find(key => {
    const group = flightGroups[key];
    const maxDelay = Math.max(...group.map(h => h.delay_minutes_at_observation || 0));
    return group.length > 1 || maxDelay > 15;
  }) || Object.keys(flightGroups)[0];

  const selectedFlightHistory = flightGroups[interestingFlightKey] || [];

  // Sort by time
  selectedFlightHistory.sort((a, b) =>
    new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime()
  );

  return (
    <div className="glass-panel rounded-3xl p-6 h-auto sticky top-6 relative overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-30 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-6 text-status-delayed">
        <TrendingUp className="w-5 h-5" />
        <h3 className="font-semibold text-lg tracking-tight text-slate-900">Delay Pulse</h3>
        </div>

        {selectedFlightHistory.length === 0 ? (
          <p className="text-slate-500 text-sm">No delay history available.</p>
        ) : (
          <div>
            <div className="mb-4">
              <span className="text-xs text-slate-500 uppercase tracking-widest">Focus flight</span>
              <div className="font-mono text-2xl font-semibold text-slate-900 mt-1">
                {interestingFlightKey}
              </div>
            </div>

            <div className="relative border-l border-slate-200 pl-6 ml-2 space-y-8 py-2">
              {selectedFlightHistory.map((obs) => {
                const delay = obs.delay_minutes_at_observation || 0;
                const isSignificant = delay > 15;

                return (
                  <div key={obs.observation_id} className="relative">
                    {/* Timeline Dot */}
                    <div className={cn(
                      "absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-slate-100",
                      isSignificant ? "bg-status-delayed shadow-[0_0_10px_rgba(245,158,11,0.35)]" : "bg-status-ontime"
                    )} />

                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-slate-400">
                        {new Date(obs.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {delay > 0 && (
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full",
                          isSignificant ? "bg-status-delayed/10 text-status-delayed" : "bg-status-ontime/10 text-status-ontime"
                        )}>
                          {delay > 0 ? `+${delay}m` : 'On Time'}
                        </span>
                      )}
                    </div>

                    <div className="mt-1">
                      <p className="text-sm font-medium text-slate-800">
                        {obs.status || "Status Update"}
                      </p>
                      <div className="text-xs text-slate-500 mt-1 flex gap-2">
                        <span>Est: {formatTime(obs.estimated_time_observed)}</span>
                        {obs.actual_time_observed && <span>Act: {formatTime(obs.actual_time_observed)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
              <Clock className="w-3 h-3 inline mr-1" />
              Updates every 5 minutes
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
