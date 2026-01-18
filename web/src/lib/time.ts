export const NEPAL_OFFSET_MINUTES = 345; // UTC +05:45

const NEPAL_TZ = 'Asia/Kathmandu';

export function getNepalNow() {
  return new Date();
}

export function toNepalDateString(date: Date = getNepalNow()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: NEPAL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatNepalTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: NEPAL_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatNepalDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: NEPAL_TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function buildNepalDateTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}+05:45`);
}
