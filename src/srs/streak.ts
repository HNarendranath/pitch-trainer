// Day keys and streaks, in the device's local time. Pure.

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function prevDay(ts: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() - 1);
  return d.getTime();
}

/**
 * Consecutive practice days ending today, or ending yesterday if you haven't
 * practised yet today (the streak isn't broken until the day is over).
 */
export function streakLength(practiceDays: ReadonlySet<string>, now: number): number {
  let cursor = startOfDay(now);
  if (!practiceDays.has(dayKey(cursor))) cursor = prevDay(cursor);
  let n = 0;
  while (practiceDays.has(dayKey(cursor))) {
    n++;
    cursor = prevDay(cursor);
  }
  return n;
}
