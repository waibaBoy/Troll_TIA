import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timeStr: string | null) {
  if (!timeStr) return '--:--';
  // Check if it's HH:mm:ss
  if (timeStr.length === 8) return timeStr.substring(0, 5);
  return timeStr;
}

export function getStatusColor(status: string | null, delay: number | null) {
  if (!status) return 'text-slate-500';

  const s = status.toLowerCase();
  if (s.includes('cancel')) return 'text-status-cancelled';
  if (s.includes('land') || s.includes('depart') || s.includes('complete')) {
    if (delay && delay > 15) return 'text-status-delayed';
    return 'text-status-ontime';
  }
  if (delay && delay > 15) return 'text-status-delayed';
  return 'text-slate-700';
}
