export const INSTITUTIONAL_TZ = 'Asia/Kolkata';

/** Format any Date for display in the institutional timezone. */
export function formatIST(date: Date | string, withTime = true): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INSTITUTIONAL_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit', hour12: true }),
  }).format(d);
}

/**
 * ALL deadline comparisons happen server-side against UTC instants.
 * The browser timezone can never alter a deadline because the backend
 * compares `new Date()` (server clock, UTC instant) against the stored
 * UTC timestamp. This function exists only for display formatting.
 */
export function isPast(date: Date | string): boolean {
  return new Date(date).getTime() <= Date.now();
}

