'use client';

import React, { useMemo, useState } from 'react';
import { FlightStatusHistory } from '@/lib/data';
import { cn, formatTime } from '@/lib/utils';
import { Clock, TrendingUp } from 'lucide-react';

interface DelayTimelineProps {
  history: FlightStatusHistory[];
  serverNowIso?: string;
}

export function DelayTimeline({ history, serverNowIso }: DelayTimelineProps) {
  const [windowHours, setWindowHours] = useState(0);
  const nowMs = useMemo(() => {
    if (!serverNowIso) return Date.now();
    const parsed = Date.parse(serverNowIso);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }, [serverNowIso]);
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

  const cutoffMs = useMemo(() => {
    if (windowHours === 0) {
      const nepalDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kathmandu',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(nowMs));
      const startOfDayMs = Date.parse(`${nepalDate}T00:00:00+05:45`);
      return Number.isNaN(startOfDayMs) ? nowMs : startOfDayMs;
    }
    return nowMs - windowHours * 60 * 60 * 1000;
  }, [nowMs, windowHours]);
  const windowedHistory = selectedFlightHistory.filter(
    (obs) => new Date(obs.observed_at).getTime() >= cutoffMs
  );

  return (
    <div className="glass-panel rounded-3xl p-6 h-auto sticky top-6 relative overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-30 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-status-delayed">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-semibold text-lg tracking-tight text-slate-900">Delay Pulse</h3>
          </div>
          <select
            className="bg-white/80 border border-slate-200 rounded-full px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={windowHours}
            onChange={(e) => setWindowHours(Number(e.target.value))}
          >
            <option value={0}>Today</option>
            <option value={6}>Last 6h</option>
            <option value={12}>Last 12h</option>
            <option value={24}>Last 24h</option>
          </select>
        </div>

        {windowedHistory.length === 0 ? (
          <p className="text-slate-500 text-sm">No delay history in this window.</p>
        ) : (
          <div>
            <div className="mb-4">
              <span className="text-xs text-slate-500 uppercase tracking-widest">Focus flight</span>
              <div className="font-mono text-2xl font-semibold text-slate-900 mt-1">
                {interestingFlightKey}
              </div>
            </div>

            <div className="relative border-l border-slate-200 pl-6 ml-2 space-y-8 py-2">
              {windowedHistory.map((obs) => {
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
                        {new Intl.DateTimeFormat('en-GB', {
                          timeZone: 'Asia/Kathmandu',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(obs.observed_at))}
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
