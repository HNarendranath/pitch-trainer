export interface ScaleDef {
  id: string;
  name: string;
  /** Short hint shown under the name. */
  hint: string;
  /** Semitones above the tonic, ascending, without the octave. */
  intervals: readonly number[];
}

export const SCALES: readonly ScaleDef[] = [
  { id: 'major', name: 'Major', hint: 'Ionian', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', name: 'Natural minor', hint: 'Aeolian', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'harmonic', name: 'Harmonic minor', hint: 'Minor, raised 7th', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodic', name: 'Melodic minor', hint: 'Minor, raised 6th and 7th', intervals: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'dorian', name: 'Dorian', hint: 'Minor, raised 6th', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', name: 'Phrygian', hint: 'Minor, flat 2nd', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', name: 'Lydian', hint: 'Major, raised 4th', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', name: 'Mixolydian', hint: 'Major, flat 7th', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'locrian', name: 'Locrian', hint: 'Flat 2nd and 5th', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'majpent', name: 'Major pentatonic', hint: 'Five notes, no 4th or 7th', intervals: [0, 2, 4, 7, 9] },
  { id: 'minpent', name: 'Minor pentatonic', hint: 'Five notes, no 2nd or 6th', intervals: [0, 3, 5, 7, 10] },
  { id: 'blues', name: 'Blues', hint: 'Minor pentatonic plus ♭5', intervals: [0, 3, 5, 6, 7, 10] },
  { id: 'wholetone', name: 'Whole tone', hint: 'All whole steps', intervals: [0, 2, 4, 6, 8, 10] },
];

const byId = new Map(SCALES.map((s) => [s.id, s]));

export function scaleDef(id: string): ScaleDef {
  const s = byId.get(id);
  if (!s) throw new Error(`Unknown scale ${id}`);
  return s;
}
