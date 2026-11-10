import { describe, expect, it } from 'vitest';
import { buildConfusions, buildHistory, itemWeight, pickNext, RECENT, type AttemptLite } from './scheduler';
import { seeded } from '../test/rand';

const att = (item: string, correct: boolean, answer = correct ? item : 'x', ms = 2000): AttemptLite => ({ item, answer, correct, ms });

function tally(fn: () => string, runs = 4000): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < runs; i++) {
    const k = fn();
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

describe('buildHistory', () => {
  it('keeps only the most recent results per item', () => {
    const attempts = [...Array(RECENT + 4)].map((_, i) => att('m3', i >= 4));
    const h = buildHistory(attempts).get('m3')!;
    expect(h.results).toHaveLength(RECENT);
    expect(h.results.every(Boolean)).toBe(true);
    expect(h.seen).toBe(RECENT + 4);
  });
});

describe('itemWeight', () => {
  it('ranks unseen and missed items above mastered ones', () => {
    const mastered = buildHistory([...Array(8)].map(() => att('P5', true))).get('P5');
    const missed = buildHistory([...Array(8)].map((_, i) => att('m6', i % 2 === 0))).get('m6');
    expect(itemWeight(undefined)).toBeGreaterThan(itemWeight(mastered));
    expect(itemWeight(missed)).toBeGreaterThan(itemWeight(mastered));
  });

  it('nudges slow answers up', () => {
    const fast = buildHistory([...Array(8)].map(() => att('P4', true, 'P4', 1500))).get('P4');
    const slow = buildHistory([...Array(8)].map(() => att('P4', true, 'P4', 7000))).get('P4');
    expect(itemWeight(slow)).toBeGreaterThan(itemWeight(fast));
  });
});

describe('pickNext', () => {
  const items = ['M2', 'M3', 'P4', 'P5', 'P8'];

  it('favours an item that keeps being missed', () => {
    const history = buildHistory([
      ...items.flatMap((it) => [...Array(8)].map(() => att(it, it !== 'M3'))),
    ]);
    const rand = seeded(1);
    const counts = tally(() => pickNext({ items, history, rand }));
    const m3 = counts.get('M3')!;
    for (const it of items.filter((i) => i !== 'M3')) expect(m3).toBeGreaterThan(counts.get(it)! * 2);
  });

  it('rarely repeats the last item', () => {
    const rand = seeded(2);
    const counts = tally(() => pickNext({ items, history: new Map(), last: 'P5', rand }));
    expect(counts.get('P5')! / 4000).toBeLessThan(0.06);
  });

  it('follows a mix-up with the confused answer most of the time', () => {
    const rand = seeded(4);
    const counts = tally(() => pickNext({ items, history: new Map(), last: 'M3', followUp: 'P4', rand }));
    expect(counts.get('P4')! / 4000).toBeGreaterThan(0.6);
  });

  it('ignores a follow-up that is not in this level', () => {
    const rand = seeded(5);
    for (let i = 0; i < 200; i++) expect(items).toContain(pickNext({ items, history: new Map(), followUp: 'TT', rand }));
  });
});

describe('buildConfusions', () => {
  it('counts what each item was mistaken for', () => {
    const c = buildConfusions([att('m6', false, 'M6'), att('m6', false, 'M6'), att('m6', false, 'P5'), att('m6', true)]);
    expect(c.get('m6')!.get('M6')).toBe(2);
    expect(c.get('m6')!.get('P5')).toBe(1);
  });
});
