import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { answeredToday, currentStreak, getProgress, levelAttempts, modeSummaries, recordAttempt, RECENT_FOR_STATS } from './queries';

const MAX = 6;
let clock = new Date(2026, 10, 10, 12).getTime();
const answer = (level: number, correct: boolean, ts = clock++) =>
  recordAttempt({ mode: 'intervals', level, item: 'P5', answer: correct ? 'P5' : 'P4', correct, ms: 1500, ts }, MAX);

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('recordAttempt', () => {
  it('unlocks the next level at 85% over 20 answers', async () => {
    for (let i = 0; i < 16; i++) expect((await answer(1, true)).unlocked).toBeUndefined();
    for (let i = 0; i < 3; i++) await answer(1, false);
    // 19 answers: not enough yet.
    expect((await getProgress('intervals')).unlocked).toBe(1);
    // 20th answer: 17/20 = 85%.
    expect((await answer(1, true)).unlocked).toBe(2);
    expect((await getProgress('intervals')).unlocked).toBe(2);
  });

  it('does not unlock from a lower level', async () => {
    await db.progress.put({ mode: 'intervals', unlocked: 3, lastLevel: 3 });
    for (let i = 0; i < 20; i++) expect((await answer(1, true)).unlocked).toBeUndefined();
    expect((await getProgress('intervals')).unlocked).toBe(3);
  });

  it('jumps up when a higher level is mastered, capped at the last level', async () => {
    let last;
    for (let i = 0; i < 20; i++) last = await answer(4, true);
    expect(last!.unlocked).toBe(5);
    for (let i = 0; i < 20; i++) last = await answer(6, true);
    expect(last!.unlocked).toBe(6);
    for (let i = 0; i < 20; i++) expect((await answer(6, true)).unlocked).toBeUndefined();
  });

  it('returns level attempts oldest first', async () => {
    await answer(2, false, 100);
    await answer(2, true, 200);
    await answer(3, true, 150);
    const rows = await levelAttempts('intervals', 2);
    expect(rows.map((r) => r.ts)).toEqual([100, 200]);
  });
});

describe('daily stats', () => {
  it('counts answers since local midnight and the streak', async () => {
    const now = new Date(2026, 10, 10, 18).getTime();
    const yesterday = new Date(2026, 10, 9, 20).getTime();
    await answer(1, true, yesterday);
    await answer(1, true, now - 1000);
    await answer(1, false, now - 500);
    expect(await answeredToday(now)).toBe(2);
    expect(await currentStreak(now)).toBe(2);
  });
});

describe('modeSummaries', () => {
  it('counts every answer but takes accuracy from the most recent ones', async () => {
    for (let i = 0; i < 30; i++) await answer(1, false);
    for (let i = 0; i < RECENT_FOR_STATS; i++) await answer(1, i % 5 !== 0); // 80% recently
    await recordAttempt({ mode: 'chords', level: 1, item: 'maj', answer: 'maj', correct: true, ms: 900, ts: clock - 1_000_000 }, MAX);
    const [first, second] = await modeSummaries();
    expect(first).toMatchObject({ mode: 'intervals', answers: 30 + RECENT_FOR_STATS, recentCount: RECENT_FOR_STATS });
    expect(first!.recentAccuracy).toBeCloseTo(0.8);
    expect(second).toMatchObject({ mode: 'chords', answers: 1, recentAccuracy: 1 });
  });
});
