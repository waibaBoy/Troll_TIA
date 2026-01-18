'use client';

import React, { useEffect, useMemo, useState } from 'react';

const NEPAL_TZ = 'Asia/Kathmandu';

interface LiveClockProps {
  initialNowIso?: string;
  label?: string;
}

export function LiveClock({ initialNowIso, label = 'Now (NPT)' }: LiveClockProps) {
  const initialMs = useMemo(() => {
    if (!initialNowIso) return Date.now();
    const parsed = Date.parse(initialNowIso);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }, [initialNowIso]);

  const [nowMs, setNowMs] = useState(initialMs);

  useEffect(() => {
    setNowMs(initialMs);
    const timer = setInterval(() => {
      setNowMs(prev => prev + 1000);
    }, 1000);
    return () => clearInterval(timer);
  }, [initialMs]);

  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: NEPAL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(nowMs));

  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: NEPAL_TZ,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(nowMs));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-mono font-semibold text-slate-900">{time}</div>
      <div className="text-xs text-slate-500">{date}</div>
    </div>
  );
}
