import { describe, expect, it } from 'vitest';
import { EXERCISES } from './registry';
import { MODES } from './modes';
import { chordQuality } from '../theory/chords';
import { instrumentCovers } from '../theory/instruments';
import { numeralPitchClasses, voiceProgression } from '../theory/keys';
import { pitchClass } from '../theory/notes';
import { scaleDef } from '../theory/scales';
import { sequenceNotes, type Sequence } from '../theory/sequence';
import { degree } from './scaleDegrees';
import type { ExerciseDef, Question } from './types';
import { seeded } from '../test/rand';

const defs = Object.values(EXERCISES) as ExerciseDef[];

/** Every question for every item on every level, a few times over. */
function* allQuestions(def: ExerciseDef, times = 12): Generator<[Question, number]> {
  const rand = seeded(def.id.length * 97);
  for (const level of def.levels) for (const item of level.items) for (let i = 0; i < times; i++) yield [def.generate(item, level, rand), level.n];
}

const pcSet = (notes: number[]) => [...new Set(notes.map(pitchClass))].sort((a, b) => a - b);
const noteEvents = (seq: Sequence) => seq.filter((e) => !e.noise);

describe('every exercise', () => {
  it('matches the level count shown on Home', () => {
    for (const def of defs) expect(def.levels.length).toBe(MODES.find((m) => m.id === def.id)!.levels);
  });

  it('offers each level’s items as unique answer keys', () => {
    for (const def of defs)
      for (const level of def.levels) {
        const ids = def.options(level).map((o) => o.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(ids)).toEqual(new Set(level.items));
      }
  });

  it('generates playable questions: right answer, sensible range, instrument can play it', () => {
    for (const def of defs)
      for (const [q] of allQuestions(def, 4)) {
        expect(q.answerId).toBe(q.itemId);
        const notes = sequenceNotes(q.sequence);
        expect(notes.length).toBeGreaterThan(0);
        for (const n of notes) {
          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(24);
          expect(n).toBeLessThanOrEqual(96);
        }
        if (q.instrument) expect(instrumentCovers(q.instrument, notes)).toBe(true);
        expect(q.reveal).not.toMatch(/undefined|NaN/);
      }
  });
});

describe('chords', () => {
  it('plays exactly the chord quality asked for', () => {
    for (const [q] of allQuestions(EXERCISES.chords!)) {
      const block = q.sequence.at(-1)!.notes;
      const want = pcSet([...chordQuality(q.itemId).intervals]);
      // Some note of the chord is the root: transposing by it gives the quality's shape.
      const fits = block.some((root) => JSON.stringify(pcSet(block.map((n) => n - root))) === JSON.stringify(want));
      expect(fits).toBe(true);
      expect(block[0]).toBeGreaterThanOrEqual(45);
      expect(block.at(-1)).toBeLessThanOrEqual(84);
    }
  });
});

describe('perfect pitch', () => {
  it('wipes with noise, then plays the asked pitch class inside the level range', () => {
    const def = EXERCISES['note-id']!;
    for (const [q, n] of allQuestions(def)) {
      expect(q.sequence[0]!.noise).toBe(true);
      const notes = sequenceNotes(q.sequence);
      expect(notes).toHaveLength(1);
      expect(pitchClass(notes[0]!)).toBe(Number(q.itemId));
      const [lo, hi] = n <= 6 ? [48, 83] : [36, 95];
      expect(notes[0]).toBeGreaterThanOrEqual(lo);
      expect(notes[0]).toBeLessThanOrEqual(hi);
      if (n === 8) expect(q.instrument).toBeDefined();
      else expect(q.instrument).toBeUndefined();
    }
  });
});

describe('scale degrees', () => {
  it('puts the target note at the asked degree of the cadence key', () => {
    for (const [q] of allQuestions(EXERCISES['scale-degrees']!)) {
      const events = noteEvents(q.sequence);
      const tonicBass = events[0]!.notes[0]!; // bass of the opening I chord
      const target = events.at(-1)!.notes;
      expect(target).toHaveLength(1);
      expect(pitchClass(target[0]! - tonicBass)).toBe(degree(q.itemId).semitones);
      expect(events).toHaveLength(5); // I IV V I + the note
    }
  });
});

describe('scales', () => {
  it('plays the scale’s steps from tonic to octave', () => {
    for (const [q] of allQuestions(EXERCISES.scales!)) {
      const notes = sequenceNotes(q.sequence);
      const steps = notes.map((n) => n - notes[0]!);
      expect(steps).toEqual([...scaleDef(q.itemId).intervals, 12]);
    }
  });
});

describe('progressions', () => {
  it('plays the home chord then each numeral’s triad over its root', () => {
    for (const [q] of allQuestions(EXERCISES.progressions!)) {
      const events = noteEvents(q.sequence);
      const numerals = q.itemId.split('–');
      expect(events).toHaveLength(numerals.length + 1);
      const tonic = events[0]!.notes[0]! + 12;
      numerals.forEach((num, i) => {
        const chord = events[i + 1]!.notes;
        const want = numeralPitchClasses(tonic, num);
        expect(pcSet(chord)).toEqual([...new Set(want)].sort((a, b) => a - b));
        expect(pitchClass(chord[0]!)).toBe(want[0]); // root in the bass
      });
    }
  });

  it('moves the upper voices smoothly', () => {
    for (let tonic = 55; tonic <= 62; tonic++) {
      const chords = voiceProgression(tonic, ['I', 'vi', 'IV', 'V', 'I']);
      for (let i = 1; i < chords.length; i++) {
        const prev = chords[i - 1]!.slice(1);
        const cur = chords[i]!.slice(1);
        cur.forEach((n, v) => expect(Math.abs(n - prev[v]!)).toBeLessThanOrEqual(5));
      }
    }
  });
});
