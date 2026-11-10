import { Midi, Note } from 'tonal';

export interface IntervalInfo {
  semitones: number;
  /** Short label shown on answer keys, e.g. "m3". */
  short: string;
  /** Full name, e.g. "Minor third". */
  name: string;
  /** Interval names in tonal's notation; several when there are enharmonic spellings. */
  spellings: readonly string[];
}

export const INTERVALS: readonly IntervalInfo[] = [
  { semitones: 0, short: 'P1', name: 'Unison', spellings: ['1P'] },
  { semitones: 1, short: 'm2', name: 'Minor second', spellings: ['2m'] },
  { semitones: 2, short: 'M2', name: 'Major second', spellings: ['2M'] },
  { semitones: 3, short: 'm3', name: 'Minor third', spellings: ['3m'] },
  { semitones: 4, short: 'M3', name: 'Major third', spellings: ['3M'] },
  { semitones: 5, short: 'P4', name: 'Perfect fourth', spellings: ['4P'] },
  { semitones: 6, short: 'TT', name: 'Tritone', spellings: ['4A', '5d'] },
  { semitones: 7, short: 'P5', name: 'Perfect fifth', spellings: ['5P'] },
  { semitones: 8, short: 'm6', name: 'Minor sixth', spellings: ['6m'] },
  { semitones: 9, short: 'M6', name: 'Major sixth', spellings: ['6M'] },
  { semitones: 10, short: 'm7', name: 'Minor seventh', spellings: ['7m'] },
  { semitones: 11, short: 'M7', name: 'Major seventh', spellings: ['7M'] },
  { semitones: 12, short: 'P8', name: 'Octave', spellings: ['8P'] },
  { semitones: 13, short: 'm9', name: 'Minor ninth', spellings: ['9m'] },
  { semitones: 14, short: 'M9', name: 'Major ninth', spellings: ['9M'] },
  { semitones: 15, short: 'm10', name: 'Minor tenth', spellings: ['10m'] },
  { semitones: 16, short: 'M10', name: 'Major tenth', spellings: ['10M'] },
  { semitones: 17, short: 'P11', name: 'Perfect eleventh', spellings: ['11P'] },
  { semitones: 19, short: 'P12', name: 'Perfect twelfth', spellings: ['12P'] },
];

export function intervalBySemitones(semitones: number): IntervalInfo {
  const found = INTERVALS.find((i) => i.semitones === semitones);
  if (!found) throw new Error(`No interval with ${semitones} semitones`);
  return found;
}

const accidentalCount = (name: string) => (name.match(/[#b]/g) ?? []).length;

/**
 * Spell an interval correctly on the staff: the top note is derived from the
 * interval (a fourth above F is B♭, not A♯), and the bottom note's spelling is
 * chosen to keep accidentals to a minimum (no D♯ + major third = F𝄪).
 * Returns scientific names such as ["F3", "Bb3"].
 */
export function spellInterval(low: number, info: IntervalInfo): [string, string] {
  const candidates: [string, string][] = [];
  for (const lowName of new Set([Midi.midiToNoteName(low, { sharps: true }), Midi.midiToNoteName(low, { sharps: false })])) {
    for (const ivl of info.spellings) {
      const high = Note.transpose(lowName, ivl);
      if (high && Note.midi(high) === low + info.semitones) candidates.push([lowName, high]);
    }
  }
  if (candidates.length === 0) {
    return [Midi.midiToNoteName(low), Midi.midiToNoteName(low + info.semitones)];
  }
  // Fewest accidentals wins; ties prefer flats on black keys, as most method books do.
  candidates.sort(
    (a, b) =>
      accidentalCount(a[0]) + accidentalCount(a[1]) - (accidentalCount(b[0]) + accidentalCount(b[1])) ||
      Number(a[0].includes('#')) - Number(b[0].includes('#')),
  );
  return candidates[0]!;
}
