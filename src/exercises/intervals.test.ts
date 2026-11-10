import { describe, expect, it } from 'vitest';
import { intervals, intervalInfo } from './intervals';
import { DEFAULT_RANGE } from '../theory/notes';
import { seeded } from '../test/rand';

describe('intervals exercise', () => {
  it('has six numbered levels whose items are all known intervals', () => {
    expect(intervals.levels.map((l) => l.n)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const level of intervals.levels) for (const item of level.items) expect(() => intervalInfo(item)).not.toThrow();
  });

  it('offers answer keys for exactly the level items, ordered by size', () => {
    for (const level of intervals.levels) {
      const opts = intervals.options(level);
      expect(new Set(opts.map((o) => o.id))).toEqual(new Set(level.items));
      const sizes = opts.map((o) => intervalInfo(o.id).semitones);
      expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    }
  });

  it('generates the right distance, inside the range, in the level’s direction', () => {
    const rand = seeded(7);
    for (const level of intervals.levels) {
      for (const item of level.items) {
        for (let i = 0; i < 25; i++) {
          const q = intervals.generate(item, level, rand);
          expect(q.answerId).toBe(item);
          const notes = q.sequence.flatMap((e) => e.notes);
          expect(notes).toHaveLength(2);
          const [a, b] = notes as [number, number];
          expect(Math.abs(b - a)).toBe(intervalInfo(item).semitones);
          for (const n of notes) {
            expect(n).toBeGreaterThanOrEqual(DEFAULT_RANGE.low);
            expect(n).toBeLessThanOrEqual(DEFAULT_RANGE.high);
          }
          const together = q.sequence.length === 1;
          if (level.n <= 3) expect(!together && b > a).toBe(true);
          if (level.n === 4) expect(!together && b < a).toBe(true);
          if (level.n === 5) expect(together).toBe(true);
        }
      }
    }
  });

  it('level 6 uses every direction', () => {
    const rand = seeded(3);
    const level = intervals.levels[5]!;
    const kinds = new Set<string>();
    for (let i = 0; i < 60; i++) kinds.add(intervals.generate('P5', level, rand).prompt);
    expect(kinds.size).toBe(3);
  });
});
