'use client';

import React, { useState } from 'react';
import { FlightSummary } from '@/lib/data';
import { cn, formatTime } from '@/lib/utils';
import { Plane, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface FlightListProps {
  flights: FlightSummary[];
}

export function FlightList({ flights }: FlightListProps) {
  const [filter, setFilter] = useState<'all' | 'arrival' | 'departure'>('all');
  const [sort, setSort] = useState<'time' | 'delay' | 'status'>('time');

  const filteredFlights = flights.filter(f => {
    if (filter === 'all') return true;
    return f.direction === filter;
  }).sort((a, b) => {
    if (sort === 'time') {
      return a.scheduled_time.localeCompare(b.scheduled_time);
    }
    if (sort === 'delay') {
      const delayA = a.predicted_delay_minutes || a.actual_delay_minutes || 0;
      const delayB = b.predicted_delay_minutes || b.actual_delay_minutes || 0;
      return delayB - delayA; // Descending
    }
    if (sort === 'status') {
      const statusA = a.final_status || 'On Time';
      const statusB = b.final_status || 'On Time';
      return statusA.localeCompare(statusB);
    }
    return 0;
  });

  return (
    <div className="glass-panel rounded-2xl p-6 h-full min-h-[600px]">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Live Flight Board</h2>

        <div className="flex items-center gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Sort by:</span>
            <select
              className="bg-slate-800 border border-white/5 rounded-md px-2 py-1 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
            >
              <option value="time">Scheduled Time</option>
              <option value="delay">High Delays</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="flex space-x-2 bg-slate-800/50 p-1 rounded-lg border border-white/5">
            {['all', 'arrival', 'departure'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  filter === f
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}s
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredFlights.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No active flights found for this filter.
          </div>
        ) : (
          filteredFlights.map((flight) => (
            <FlightCard key={flight.instance_id} flight={flight} />
          ))
        )}
      </div>
    </div>
  );
}

function FlightCard({ flight }: { flight: FlightSummary }) {
  const isDelayed = (flight.predicted_delay_minutes || 0) > 15;
  const isCancelled = flight.final_status?.toLowerCase().includes('cancel') || flight.is_cancelled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl bg-slate-800/30 border border-white/5 hover:border-white/10 transition-colors p-5 group"
    >
      {/* Background Gradient for Delay */}
      {isDelayed && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-status-delayed" />
      )}
      {isCancelled && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-status-cancelled" />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Flight Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center border border-white/5">
            <Plane className={cn(
              "w-6 h-6",
              flight.direction === 'arrival' ? "rotate-135 text-blue-400" : "-rotate-45 text-emerald-400"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg text-white">{flight.flight_number}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {flight.airline_name}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
              <span>{flight.origin}</span>
              <ArrowRight className="w-3 h-3" />
              <span>{flight.destination}</span>
              {flight.origin_city && (
                <span className="text-slate-500 hidden sm:inline">
                  ({flight.direction === 'arrival' ? flight.origin_city : flight.destination_city})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Time & Status */}
        <div className="flex-1 w-full md:w-auto flex justify-between md:justify-end items-center gap-8">
          {/* Time Block */}
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-white">
                {formatTime(flight.estimated_time || flight.scheduled_time)}
              </span>
              <span className="text-xs text-slate-500 uppercase">EST</span>
            </div>
            <div className="text-xs text-slate-500">
              Sch: {formatTime(flight.scheduled_time)}
            </div>
          </div>

          {/* Status Badge */}
          <div className={cn(
            "px-3 py-1.5 rounded-lg border text-sm font-medium flex items-center gap-2 min-w-[120px] justify-center",
            isCancelled ? "bg-status-cancelled/10 border-status-cancelled/20 text-status-cancelled" :
            isDelayed ? "bg-status-delayed/10 border-status-delayed/20 text-status-delayed" :
            "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          )}>
            {isCancelled ? <AlertTriangle className="w-4 h-4" /> :
             isDelayed ? <AlertTriangle className="w-4 h-4" /> :
             <CheckCircle className="w-4 h-4" />}

            <span>
              {isCancelled ? 'Cancelled' :
               isDelayed ? `Delayed +${flight.predicted_delay_minutes}m` :
               flight.final_status || 'On Time'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Visual Flair) */}
      <div className="mt-4 h-1 w-full bg-slate-700/30 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full relative",
            isCancelled ? "bg-status-cancelled" :
            isDelayed ? "bg-status-delayed" : "bg-emerald-500"
          )}
          style={{ width: '60%' }} // Mock progress for now, could calculate based on current time
        >
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30" />
        </div>
      </div>

    </motion.div>
  );
}
