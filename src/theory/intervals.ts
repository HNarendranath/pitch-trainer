export interface IntervalInfo {
  semitones: number;
  /** Short label shown on answer keys, e.g. "m3". */
  short: string;
  /** Full name, e.g. "Minor third". */
  name: string;
}

export const INTERVALS: readonly IntervalInfo[] = [
  { semitones: 0, short: 'P1', name: 'Unison' },
  { semitones: 1, short: 'm2', name: 'Minor second' },
  { semitones: 2, short: 'M2', name: 'Major second' },
  { semitones: 3, short: 'm3', name: 'Minor third' },
  { semitones: 4, short: 'M3', name: 'Major third' },
  { semitones: 5, short: 'P4', name: 'Perfect fourth' },
  { semitones: 6, short: 'TT', name: 'Tritone' },
  { semitones: 7, short: 'P5', name: 'Perfect fifth' },
  { semitones: 8, short: 'm6', name: 'Minor sixth' },
  { semitones: 9, short: 'M6', name: 'Major sixth' },
  { semitones: 10, short: 'm7', name: 'Minor seventh' },
  { semitones: 11, short: 'M7', name: 'Major seventh' },
  { semitones: 12, short: 'P8', name: 'Octave' },
  { semitones: 13, short: 'm9', name: 'Minor ninth' },
  { semitones: 14, short: 'M9', name: 'Major ninth' },
  { semitones: 15, short: 'm10', name: 'Minor tenth' },
  { semitones: 16, short: 'M10', name: 'Major tenth' },
  { semitones: 17, short: 'P11', name: 'Perfect eleventh' },
  { semitones: 19, short: 'P12', name: 'Perfect twelfth' },
];

export function intervalBySemitones(semitones: number): IntervalInfo {
  const found = INTERVALS.find((i) => i.semitones === semitones);
  if (!found) throw new Error(`No interval with ${semitones} semitones`);
  return found;
}
