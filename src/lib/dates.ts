/** The calendar date at a given instant in a timezone, as YYYY-MM-DD. */
export function localDateInTz(at: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
  } catch {
    // An unknown IANA zone shouldn't break the page; fall back to UTC, which is
    // what group_local_date() does in the database for the same reason.
    return at.toISOString().slice(0, 10);
  }
}

/**
 * The timezone's UTC offset at a given instant, in milliseconds.
 *
 * Derived by formatting the instant into the zone's wall-clock time and reading
 * it back as if it were UTC. Stepping in whole hours does not work: India is
 * +5:30, Nepal +5:45, and Lord Howe shifts by 30 minutes for DST.
 */
function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);

  const f: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') f[p.type] = Number(p.value);

  // hour comes back as 24 at midnight under hour12: false.
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour % 24, f.minute, f.second);
  return asUtc - at.getTime() + (at.getTime() % 1000);
}

/**
 * The instant at which the local day containing `at` began — the streak day
 * boundary (docs/10: per-group local midnight, not UTC).
 */
export function startOfLocalDay(at: Date, timeZone: string): Date {
  try {
    const [y, m, d] = localDateInTz(at, timeZone).split('-').map(Number);
    const midnightAsUtc = Date.UTC(y, m - 1, d);

    // Two passes: the offset at the sampled instant can differ from the offset
    // at midnight when a DST transition falls between them.
    let guess = new Date(midnightAsUtc - tzOffsetMs(at, timeZone));
    guess = new Date(midnightAsUtc - tzOffsetMs(guess, timeZone));
    return guess;
  } catch {
    return new Date(`${at.toISOString().slice(0, 10)}T00:00:00Z`);
  }
}

export function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}
