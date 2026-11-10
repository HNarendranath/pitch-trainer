import { describe, expect, it } from 'vitest';
import { generateSing, SING_LEVELS, VOICE_RANGES, itemLabel, type VoiceRange } from './singing';
import { centsOff, Hold, median } from './pitchMatch';
import { INTERVALS } from '../theory/intervals';
import { MODES } from './modes';
import { pitchClass } from '../theory/notes';
import { sequenceNotes } from '../theory/sequence';
import { seeded } from '../test/rand';

describe('singing questions', () => {
  it('has the level count shown on Home', () => {
    expect(SING_LEVELS.length).toBe(MODES.find((m) => m.id === 'singing')!.levels);
  });

  it('keeps reference and target inside the voice, at the asked distance', () => {
    const rand = seeded(7);
    for (const voice of ['low', 'high'] as VoiceRange[]) {
      const { low, high } = VOICE_RANGES[voice];
      for (const level of SING_LEVELS)
        for (const item of level.items)
          for (let i = 0; i < 20; i++) {
            const q = generateSing(item, level, voice, rand);
            expect(q.target).toBeGreaterThanOrEqual(low);
            expect(q.target).toBeLessThanOrEqual(high);
            expect(q.tolerance).toBe(level.tolerance);
            expect(q.reveal).not.toMatch(/undefined|NaN/);
            expect(itemLabel(level, item)).toBeTruthy();
            if (level.kind === 'recall') {
              expect(q.reference).toBeNull();
              expect(q.blind).toBe(true);
              expect(pitchClass(q.target)).toBe(Number(item));
              continue;
            }
            const [ref] = sequenceNotes(q.reference!);
            expect(ref).toBeGreaterThanOrEqual(low);
            expect(ref).toBeLessThanOrEqual(high);
            const semis = level.kind === 'echo' ? 0 : INTERVALS.find((x) => x.short === item)!.semitones;
            expect(q.target - ref!).toBe(level.kind === 'down' ? -semis : semis);
          }
    }
  });

  it('spells interval answers from the reference note', () => {
    const q = generateSing('P4', SING_LEVELS[1]!, 'low', () => 0.5);
    expect(q.reveal).toMatch(/^A perfect fourth above [A-G][♯♭]?\d is [A-G][♯♭]?\d$/);
  });
});

describe('cents', () => {
  it('measures from the nearest octave of the target', () => {
    expect(centsOff(60.1, 60)).toBeCloseTo(10);
    expect(centsOff(71.8, 60)).toBeCloseTo(-20); // B4, 20¢ under C5
    expect(centsOff(48.25, 60)).toBeCloseTo(25);
    expect(Math.abs(centsOff(66, 60))).toBeCloseTo(600);
  });

  it('takes the median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('holding a note', () => {
  const run = (hold: Hold, readings: [number | null, number][]) => readings.map(([m, t]) => hold.push(m, t)).at(-1)!;
  const steady = (midi: number | null, from: number, to: number, step = 20): [number | null, number][] => {
    const out: [number | null, number][] = [];
    for (let t = from; t <= to; t += step) out.push([midi, t]);
    return out;
  };

  it('completes after the hold time in tune, in any octave', () => {
    const s = run(new Hold({ target: 57, tolerance: 30 }), steady(45.1, 0, 800));
    expect(s.done).toBe(true);
    expect(s.heldMidi).toBeCloseTo(45.1);
  });

  it('does not complete out of tune or too short', () => {
    expect(run(new Hold({ target: 57, tolerance: 30 }), steady(57.4, 0, 2000)).done).toBe(false);
    expect(run(new Hold({ target: 57, tolerance: 30 }), steady(57, 0, 700)).progress).toBeLessThan(1);
  });

  it('rides out short wobbles but restarts after a long one', () => {
    const blip = [...steady(57, 0, 400), ...steady(57.6, 420, 500), ...steady(57, 520, 820)];
    expect(run(new Hold({ target: 57, tolerance: 30 }), blip).done).toBe(true);
    const long = [...steady(57, 0, 400), ...steady(null, 420, 800), ...steady(57, 820, 1400)];
    const s = run(new Hold({ target: 57, tolerance: 30 }), long);
    expect(s.done).toBe(false);
    expect(s.progress).toBeGreaterThan(0.6);
  });

  it('never finishes on an out-of-tune reading, even inside the grace window', () => {
    const hold = new Hold({ target: 57, tolerance: 30 });
    run(hold, steady(57, 0, 700));
    const slid = run(hold, steady(58, 720, 860)); // a semitone off, past the hold time
    expect(slid.done).toBe(false);
    run(hold, steady(58, 880, 960)); // off for longer than the grace window
    expect(run(hold, steady(57, 980, 1000)).done).toBe(false); // so the hold restarted
  });

  it('without a target, judges any steady note and reports it', () => {
    const slide = [...steady(50, 0, 300), ...steady(53.2, 320, 1400)];
    const s = run(new Hold({ tolerance: 40 }), slide);
    expect(s.done).toBe(true);
    expect(s.heldMidi).toBeCloseTo(53.2);
    expect(s.cents).toBeNull();
  });

  it('stays finished once done', () => {
    const hold = new Hold({ target: 60, tolerance: 30 });
    run(hold, steady(60, 0, 820));
    expect(hold.push(null, 900).done).toBe(true);
  });
});
