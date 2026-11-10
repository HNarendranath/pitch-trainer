import type { Midi } from './notes';

export interface ChordQuality {
  id: string;
  /** Compact symbol for answer keys. */
  symbol: string;
  name: string;
  /** Semitones above the root, root position, close voicing. */
  intervals: readonly number[];
}

export const CHORD_QUALITIES: readonly ChordQuality[] = [
  { id: 'maj', symbol: 'M', name: 'Major', intervals: [0, 4, 7] },
  { id: 'min', symbol: 'm', name: 'Minor', intervals: [0, 3, 7] },
  { id: 'dim', symbol: '°', name: 'Diminished', intervals: [0, 3, 6] },
  { id: 'aug', symbol: '+', name: 'Augmented', intervals: [0, 4, 8] },
  { id: 'sus2', symbol: 'sus2', name: 'Suspended 2nd', intervals: [0, 2, 7] },
  { id: 'sus4', symbol: 'sus4', name: 'Suspended 4th', intervals: [0, 5, 7] },
  { id: 'maj7', symbol: 'maj7', name: 'Major 7th', intervals: [0, 4, 7, 11] },
  { id: '7', symbol: '7', name: 'Dominant 7th', intervals: [0, 4, 7, 10] },
  { id: 'm7', symbol: 'm7', name: 'Minor 7th', intervals: [0, 3, 7, 10] },
  { id: 'm7b5', symbol: 'ø7', name: 'Half-diminished', intervals: [0, 3, 6, 10] },
  { id: 'dim7', symbol: '°7', name: 'Diminished 7th', intervals: [0, 3, 6, 9] },
];

const byId = new Map(CHORD_QUALITIES.map((q) => [q.id, q]));

export function chordQuality(id: string): ChordQuality {
  const q = byId.get(id);
  if (!q) throw new Error(`Unknown chord quality ${id}`);
  return q;
}

export const INVERSION_NAMES = ['root position', 'first inversion', 'second inversion', 'third inversion'] as const;

/**
 * Notes of a chord, low to high.
 * `inversion` moves the lowest k notes up an octave; `open` spreads a close
 * voicing by lifting its second-lowest note an octave (e.g. C–G–E).
 */
export function voiceChord(root: Midi, intervals: readonly number[], inversion = 0, open = false): Midi[] {
  const notes = intervals.map((i) => root + i);
  for (let k = 0; k < inversion % intervals.length; k++) notes.push(notes.shift()! + 12);
  if (open && notes.length >= 3) notes[1]! += 12;
  return notes.sort((a, b) => a - b);
}
