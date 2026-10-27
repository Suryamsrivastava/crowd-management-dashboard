// Timezone-aware helpers. All API ranges are UTC epoch millis, but a "day"
// is defined in the selected site's own timezone (a Dubai mall's "today").

const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;

/** Offset (ms) of `tz` from UTC at instant `ts`. */
function tzOffset(ts, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ts));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** "YYYY-MM-DD" of instant `ts` in timezone `tz`. */
export function dateKeyInTz(ts, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts));
}

/** UTC millis of local midnight of `dateKey` (YYYY-MM-DD) in `tz`. */
export function startOfDayInTz(dateKey, tz) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let start = guess - tzOffset(guess, tz);
  // second pass handles DST transitions
  start = guess - tzOffset(start, tz);
  return start;
}

/**
 * Range for a selected day. For today the range ends "now" so the
 * comparison with yesterday is like-for-like (same elapsed hours).
 */
export function dayRange(dateKey, tz, now = Date.now()) {
  const from = startOfDayInTz(dateKey, tz);
  const end = from + DAY - 1;
  const isToday = dateKey === dateKeyInTz(now, tz);
  return { fromUtc: from, toUtc: isToday ? now : end, isToday };
}

export function shiftDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatInTz(ts, tz, opts) {
  if (ts == null) return '--';
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }).format(new Date(ts));
}

export const formatTime = (ts, tz) =>
  formatInTz(ts, tz, { hour: 'numeric', minute: '2-digit', hour12: true });

export const formatHour = (ts, tz) =>
  formatInTz(ts, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const formatDateTime = (ts, tz) =>
  formatInTz(ts, tz, { month: 'short', day: '2-digit', year: 'numeric' }) +
  '  ' +
  formatInTz(ts, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** 22.25 -> "22min 15sec" */
export function formatDwell(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return '--';
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}h ${pad(m)}min` : `${pad(m)}min ${pad(s)}sec`;
}

export function percentChange(current, previous) {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
