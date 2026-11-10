// Pure note helpers. No DOM / React imports: this module is shared with any
// future native (Expo) build.
import { Midi } from 'tonal';

export type Midi = number;

export const PITCH_CLASSES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const PITCH_CLASSES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** Default comfortable listening range: C3–C6. */
export const DEFAULT_RANGE = { low: 48, high: 84 } as const;

export function pitchClass(midi: Midi): number {
  return ((midi % 12) + 12) % 12;
}

/** Scientific pitch name, e.g. 60 → "C4", 61 → "C#4" (or "Db4" with flats). */
export function noteName(midi: Midi, flats = false): string {
  return Midi.midiToNoteName(midi, { sharps: !flats });
}

export function pitchClassName(pc: number, flats = false): string {
  const list = flats ? PITCH_CLASSES_FLAT : PITCH_CLASSES_SHARP;
  return list[pitchClass(pc)]!;
}

/** Replace ASCII accidentals with real music glyphs for display. */
export function prettyAccidentals(name: string): string {
  return name.replace(/#/g, '♯').replace(/(?<=[A-G])b/g, '♭');
}

export function midiToFreq(midi: Midi, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/** Fractional MIDI number for a frequency (69 = A4). */
export function freqToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}

export function randInt(lo: number, hi: number, rand: () => number = Math.random): number {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

export function pick<T>(items: readonly T[], rand: () => number = Math.random): T {
  if (items.length === 0) throw new Error('pick() from empty list');
  return items[Math.floor(rand() * items.length)]!;
}
