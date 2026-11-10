import { describe, expect, it } from 'vitest';
import { confusions, dailyCounts, itemStats, niceMax } from './stats';
import type { AttemptLite } from './scheduler';

const a = (item: string, answer: string): AttemptLite => ({ item, answer, correct: item === answer, ms: 1000 });

describe('itemStats', () => {
  it('reports recent accuracy per item in the exercise order', () => {
    const attempts = [a('m3', 'M3'), a('M3', 'M3'), a('m3', 'm3'), a('P5', 'P5'), ...Array.from({ length: 25 }, () => a('M3', 'M3'))];
    const stats = itemStats(attempts, ['m3', 'M3', 'P4', 'P5'], 20);
    expect(stats.map((s) => s.item)).toEqual(['m3', 'M3', 'P5']);
    expect(stats[0]).toEqual({ item: 'm3', recent: 2, correct: 1, total: 2 });
    expect(stats[1]).toEqual({ item: 'M3', recent: 20, correct: 20, total: 26 });
  });
});

describe('confusions', () => {
  it('counts each asked → answered pair, most frequent first', () => {
    const list = confusions([a('m6', 'M6'), a('m6', 'M6'), a('m6', 'P5'), a('M6', 'M6'), a('P4', 'TT')]);
    expect(list[0]).toEqual({ asked: 'm6', answered: 'M6', count: 2 });
    expect(list).toHaveLength(3);
  });
});

describe('dailyCounts', () => {
  it('buckets answers into the last N local days, today last', () => {
    const now = new Date(2026, 10, 10, 15).getTime();
    const days = dailyCounts(
      [new Date(2026, 10, 10, 9).getTime(), new Date(2026, 10, 10, 23, 59).getTime(), new Date(2026, 10, 8, 0, 1).getTime(), new Date(2026, 9, 1).getTime()],
      30,
      now,
    );
    expect(days).toHaveLength(30);
    expect(days.at(-1)).toEqual({ day: new Date(2026, 10, 10).getTime(), count: 2 });
    expect(days.at(-3)!.count).toBe(1);
    expect(days.reduce((n, d) => n + d.count, 0)).toBe(3); // October 1 is out of range
  });
});

describe('niceMax', () => {
  it('rounds up to a clean axis value', () => {
    expect([3, 12, 37, 40, 41, 120, 260].map(niceMax)).toEqual([10, 15, 40, 40, 50, 150, 400]);
  });
});
