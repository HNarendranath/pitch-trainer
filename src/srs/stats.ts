// Numbers for the Stats screen. Pure: attempts in, summaries out.
import type { AttemptLite } from './scheduler';
import { startOfDay } from './streak';

export interface ItemStat {
  item: string;
  /** Answers counted for accuracy (the most recent, up to `recentN`). */
  recent: number;
  correct: number;
  /** All answers for this item. */
  total: number;
}

/**
 * Accuracy per item over its most recent answers, in `order` (the order the
 * exercise shows its answer keys). Items never asked are left out.
 */
export function itemStats(attempts: readonly AttemptLite[], order: readonly string[], recentN = 20): ItemStat[] {
  const byItem = new Map<string, boolean[]>();
  for (const a of attempts) {
    const list = byItem.get(a.item) ?? [];
    list.push(a.correct);
    byItem.set(a.item, list);
  }
  const known = order.filter((id) => byItem.has(id));
  const extra = [...byItem.keys()].filter((id) => !order.includes(id));
  return [...known, ...extra].map((item) => {
    const all = byItem.get(item)!;
    const recent = all.slice(-recentN);
    return { item, recent: recent.length, correct: recent.filter(Boolean).length, total: all.length };
  });
}

export interface Confusion {
  asked: string;
  answered: string;
  count: number;
}

/** Wrong answers grouped by what was asked and what was answered, most frequent first. */
export function confusions(attempts: readonly AttemptLite[]): Confusion[] {
  const counts = new Map<string, Confusion>();
  for (const a of attempts) {
    if (a.correct) continue;
    const key = `${a.item}\u0000${a.answer}`;
    const c = counts.get(key) ?? { asked: a.item, answered: a.answer, count: 0 };
    c.count++;
    counts.set(key, c);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export interface DayCount {
  /** Local midnight. */
  day: number;
  count: number;
}

/** Answers per local day for the last `days` days, oldest first, today last. */
export function dailyCounts(timestamps: readonly number[], days: number, now: number): DayCount[] {
  const out: DayCount[] = [];
  const d = new Date(startOfDay(now));
  for (let i = 0; i < days; i++) {
    out.unshift({ day: d.getTime(), count: 0 });
    d.setDate(d.getDate() - 1); // calendar days, so DST changes don't drift
  }
  const index = new Map(out.map((c, i) => [c.day, i]));
  for (const ts of timestamps) {
    const i = index.get(startOfDay(ts));
    if (i !== undefined) out[i]!.count++;
  }
  return out;
}

/** A clean axis maximum: 10, 20, 25, 40, 50, 100, 150… at or above the data. */
export function niceMax(value: number): number {
  if (value <= 10) return 10;
  const pow = 10 ** Math.floor(Math.log10(value));
  for (const m of [1, 1.5, 2, 2.5, 4, 5, 10]) if (m * pow >= value) return m * pow;
  return 10 * pow;
}
