// A Sequence is the platform-neutral description of "what to play" for a question.
// The audio layer turns it into scheduled notes; tests can inspect it directly.
import type { Midi } from './notes';

export interface NoteEvent {
  /** One or more notes sounded together. */
  notes: Midi[];
  /** Start time in seconds, relative to the start of the sequence. */
  at: number;
  /** Held duration in seconds. */
  dur: number;
  /** 0–1 loudness. */
  velocity?: number;
}

export type Sequence = NoteEvent[];

export function sequenceLength(seq: Sequence): number {
  return seq.reduce((end, e) => Math.max(end, e.at + e.dur), 0);
}

/** Notes one after another. */
export function melodic(notes: Midi[], step = 0.75, dur = 1.1, startAt = 0): Sequence {
  return notes.map((n, i) => ({ notes: [n], at: startAt + i * step, dur }));
}

/** Notes together. */
export function harmonic(notes: Midi[], dur = 1.8, startAt = 0): Sequence {
  return [{ notes, at: startAt, dur }];
}

/** Each chord one after another (progressions, cadences). */
export function chordSequence(chords: Midi[][], step = 1.1, dur = 1.2, startAt = 0): Sequence {
  return chords.map((notes, i) => ({ notes, at: startAt + i * step, dur }));
}

export function concat(...parts: Sequence[]): Sequence {
  const out: Sequence = [];
  let offset = 0;
  for (const part of parts) {
    for (const e of part) out.push({ ...e, at: e.at + offset });
    offset += sequenceLength(part) + 0.25;
  }
  return out;
}
