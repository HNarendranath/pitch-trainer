import { describe, expect, it } from 'vitest';
import { levelReadiness } from './mastery';
import { dayKey, streakLength } from './streak';

const results = (right: number, wrong: number) => [...Array(right).fill(true), ...Array(wrong).fill(false)];

describe('levelReadiness', () => {
  it('needs 20 answers', () => {
    expect(levelReadiness(results(19, 0)).ready).toBe(false);
    expect(levelReadiness(results(20, 0)).ready).toBe(true);
  });

  it('needs 85% over the last 20 only', () => {
    expect(levelReadiness(results(17, 3)).ready).toBe(true); // 85%
    expect(levelReadiness(results(16, 4)).ready).toBe(false); // 80%
    // Old misses outside the window don't count.
    expect(levelReadiness([...results(0, 30), ...results(20, 0)]).ready).toBe(true);
  });
});

describe('streakLength', () => {
  const day = (offset: number, base = new Date(2026, 10, 10, 15).getTime()) => {
    const d = new Date(base);
    d.setDate(d.getDate() - offset);
    return d.getTime();
  };
  const now = day(0);
  const set = (...offsets: number[]) => new Set(offsets.map((o) => dayKey(day(o))));

  it('counts consecutive days ending today', () => {
    expect(streakLength(set(0, 1, 2), now)).toBe(3);
  });

  it("isn't broken until today is over", () => {
    expect(streakLength(set(1, 2), now)).toBe(2);
  });

  it('stops at a gap', () => {
    expect(streakLength(set(0, 2, 3), now)).toBe(1);
    expect(streakLength(set(2, 3), now)).toBe(0);
  });
});
