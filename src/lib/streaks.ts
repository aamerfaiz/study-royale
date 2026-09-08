/**
 * Length of the group's current streak from its evaluated days.
 *
 * The evaluator writes one row per group per completed local day and backfills
 * any it missed, so rows should be contiguous — but this counts dates rather
 * than trusting row order, because a gap must break a streak rather than be
 * silently stepped over.
 */
export function currentStreak(
  rows: Array<{ date: string; hit_goal: boolean }>,
  /** Most recently completed local day, as YYYY-MM-DD. */
  today: string,
): number {
  const byDate = new Map(rows.map((r) => [r.date, r.hit_goal]));

  // The streak may end yesterday (today isn't evaluated until it's over) or
  // today, depending on when the job last ran.
  let cursor = byDate.has(today) ? today : previousDay(today);
  let streak = 0;

  while (byDate.get(cursor) === true) {
    streak++;
    cursor = previousDay(cursor);
  }

  return streak;
}

function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
