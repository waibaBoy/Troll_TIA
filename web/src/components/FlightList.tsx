'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FlightSummary } from '@/lib/data';
import { cn, formatTime } from '@/lib/utils';
import { buildNepalDateTime } from '@/lib/time';
import { Plane, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface FlightListProps {
  flights: FlightSummary[];
  serverNowIso?: string;
}

type StatusFilter = 'all' | 'ontime' | 'delayed' | 'cancelled';

export function FlightList({ flights, serverNowIso }: FlightListProps) {
  const [filter, setFilter] = useState<'all' | 'arrival' | 'departure'>('all');
  const [sort, setSort] = useState<'time' | 'delay' | 'status'>('time');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [pastHours, setPastHours] = useState(2);
  const [futureHours, setFutureHours] = useState(8);
  const [includeOverdue, setIncludeOverdue] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);

  const initialNowMs = useMemo(() => {
    if (!serverNowIso) return Date.now();
    const parsed = Date.parse(serverNowIso);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }, [serverNowIso]);

  const [nowMs, setNowMs] = useState(initialNowMs);

  useEffect(() => {
    setNowMs(initialNowMs);
    const timer = setInterval(() => {
      setNowMs(prev => prev + 60 * 1000);
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [initialNowMs]);

  const normalizedSearch = search.trim().toLowerCase();

  const getStatusType = (flight: FlightSummary): StatusFilter => {
    const status = flight.final_status?.toLowerCase() || '';
    if (flight.is_cancelled || status.includes('cancel')) return 'cancelled';
    const delay = flight.predicted_delay_minutes ?? flight.actual_delay_minutes ?? 0;
    if (delay > 15) return 'delayed';
    return 'ontime';
  };

  const isCompletedFlight = (flight: FlightSummary) => {
    const status = flight.final_status?.toLowerCase() || '';
    return ['landed', 'departed', 'complete', 'canceled', 'cancelled'].some((s) => status.includes(s));
  };

  const matchesTimeWindow = (flight: FlightSummary) => {
    const scheduledMs = buildNepalDateTime(flight.flight_date, flight.scheduled_time).getTime();
    if (Number.isNaN(scheduledMs)) return true;
    const diffMins = Math.round((scheduledMs - nowMs) / 60000);
    const withinWindow = diffMins >= -pastHours * 60 && diffMins <= futureHours * 60;
    if (withinWindow) return true;
    if (!includeOverdue) return false;
    return !isCompletedFlight(flight);
  };

  const matchesSearch = (flight: FlightSummary) => {
    if (!normalizedSearch) return true;
    const haystack = [
      flight.flight_number,
      flight.airline_name,
      flight.origin,
      flight.destination,
      flight.origin_city,
      flight.destination_city,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  };

  const filteredFlights = flights.filter(f => {
    if (filter !== 'all' && f.direction !== filter) return false;
    if (hideCompleted && isCompletedFlight(f)) return false;
    if (statusFilter !== 'all' && getStatusType(f) !== statusFilter) return false;
    if (!matchesSearch(f)) return false;
    if (!matchesTimeWindow(f)) return false;
    return true;
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

  const totalCount = flights.length;
  const nowLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(nowMs));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-7 h-full min-h-[600px] relative overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-40 pointer-events-none" />
      <div className="relative">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Live flight board</p>
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-2">Arrivals + Departures</h2>
            <p className="text-sm text-slate-500 mt-1">
              {filteredFlights.length} in view · {totalCount} tracked
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Now: {nowLabel} NPT · Window: past {pastHours}h / ahead {futureHours}h
            </p>
          </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-500">
                <span className="uppercase tracking-[0.2em] text-[10px]">Sort</span>
                <select
                  className="bg-white/80 border border-slate-200 rounded-full px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                >
                  <option value="time">Scheduled Time</option>
                  <option value="delay">High Delays</option>
                  <option value="status">Status</option>
                </select>
              </label>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search flight, city, airline"
                className="w-full sm:w-60 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 p-1">
              {['all', 'arrival', 'departure'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                    filter === f
                      ? "bg-accent text-white shadow-sm shadow-accent/30"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}s
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-500">
              <span className="uppercase tracking-[0.2em] text-[10px]">Status</span>
              <select
                className="bg-white/80 border border-slate-200 rounded-full px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All</option>
                <option value="ontime">On time</option>
                <option value="delayed">Delayed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-500">
              <span className="uppercase tracking-[0.2em] text-[10px]">Past</span>
              <select
                className="bg-white/80 border border-slate-200 rounded-full px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={pastHours}
                onChange={(e) => setPastHours(Number(e.target.value))}
              >
                {[0, 1, 2, 4, 6, 12].map((h) => (
                  <option key={h} value={h}>{h}h</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-500">
              <span className="uppercase tracking-[0.2em] text-[10px]">Ahead</span>
              <select
                className="bg-white/80 border border-slate-200 rounded-full px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={futureHours}
                onChange={(e) => setFutureHours(Number(e.target.value))}
              >
                {[2, 4, 6, 8, 12, 24].map((h) => (
                  <option key={h} value={h}>{h}h</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setIncludeOverdue((prev) => !prev)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition",
                includeOverdue
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-slate-200 bg-white/70 text-slate-500"
              )}
            >
              Keep overdue
            </button>

            <button
              type="button"
              onClick={() => setHideCompleted((prev) => !prev)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition",
                hideCompleted
                  ? "border-slate-400 bg-slate-900/5 text-slate-700"
                  : "border-slate-200 bg-white/70 text-slate-500"
              )}
            >
              Hide completed
            </button>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {filteredFlights.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No active flights found for this filter.
            </div>
          ) : (
            filteredFlights.map((flight) => (
              <FlightCard key={flight.instance_id} flight={flight} nowMs={nowMs} />
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}

function FlightCard({ flight, nowMs }: { flight: FlightSummary; nowMs: number }) {
  const delayMinutes = flight.predicted_delay_minutes ?? flight.actual_delay_minutes ?? 0;
  const isDelayed = delayMinutes > 15;
  const isCancelled = flight.final_status?.toLowerCase().includes('cancel') || flight.is_cancelled;
  const timeLabel = flight.direction === 'arrival' ? 'ETA' : 'ETD';
  const scheduleLabel = flight.direction === 'arrival' ? 'STA' : 'STD';
  const scheduledMs = buildNepalDateTime(flight.flight_date, flight.scheduled_time).getTime();
  const relativeLabel = Number.isNaN(scheduledMs)
    ? null
    : formatRelativeMinutes(Math.round((scheduledMs - nowMs) / 60000));
  const updatedLabel = flight.last_updated_at
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kathmandu',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(flight.last_updated_at))
    : null;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="relative overflow-hidden rounded-2xl bg-white/85 border border-slate-100 shadow-sm hover:shadow-lg transition-all p-5 group"
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
          <div className="w-12 h-12 rounded-full bg-slate-900/5 flex items-center justify-center border border-slate-200">
            <Plane className={cn(
              "w-6 h-6",
              flight.direction === 'arrival' ? "rotate-135 text-accent-cool" : "-rotate-45 text-status-ontime"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-lg text-slate-900">{flight.flight_number}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {flight.airline_name}
              </span>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border",
                  flight.direction === 'arrival'
                    ? "bg-accent-cool/10 text-accent-cool border-accent-cool/20"
                    : "bg-status-ontime/10 text-status-ontime border-status-ontime/20"
                )}
              >
                {flight.direction === 'arrival' ? 'Arrival' : 'Departure'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <span>{flight.origin}</span>
              <ArrowRight className="w-3 h-3" />
              <span>{flight.destination}</span>
              {flight.origin_city && (
                <span className="text-slate-400 hidden sm:inline">
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
              <span className="text-2xl font-mono font-semibold text-slate-900">
                {formatTime(flight.estimated_time || flight.scheduled_time)}
              </span>
              <span className="text-xs text-slate-400 uppercase">{timeLabel}</span>
            </div>
            <div className="text-xs text-slate-400">
              {scheduleLabel}: {formatTime(flight.scheduled_time)}
            </div>
            {relativeLabel && (
              <div className="text-[11px] text-slate-500 mt-1">{relativeLabel}</div>
            )}
          </div>

          {/* Status Badge */}
          <div className={cn(
            "px-3 py-1.5 rounded-lg border text-sm font-medium flex items-center gap-2 min-w-[120px] justify-center",
            isCancelled ? "bg-status-cancelled/10 border-status-cancelled/20 text-status-cancelled" :
            isDelayed ? "bg-status-delayed/10 border-status-delayed/20 text-status-delayed" :
            "bg-status-ontime/10 border-status-ontime/20 text-status-ontime"
          )}>
            {isCancelled ? <AlertTriangle className="w-4 h-4" /> :
             isDelayed ? <AlertTriangle className="w-4 h-4" /> :
             <CheckCircle className="w-4 h-4" />}

            <span>
              {isCancelled ? 'Cancelled' :
               isDelayed ? `Delayed +${delayMinutes}m` :
               flight.final_status || 'On Time'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Visual Flair) */}
      <div className="mt-4 h-1 w-full bg-slate-200/70 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full relative",
            isCancelled ? "bg-status-cancelled" :
            isDelayed ? "bg-status-delayed" : "bg-status-ontime"
          )}
          style={{ width: '60%' }} // Mock progress for now, could calculate based on current time
        >
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/60" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">
        {updatedLabel && <span>Updated {updatedLabel} NPT</span>}
        <span>Scheduled {formatTime(flight.scheduled_time)} NPT</span>
      </div>

    </motion.div>
  );
}

function formatRelativeMinutes(diffMins: number) {
  const abs = Math.abs(diffMins);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (mins || parts.length === 0) parts.push(`${mins}m`);
  const base = parts.join(' ');
  return diffMins >= 0 ? `Due in ${base}` : `${base} ago`;
}
