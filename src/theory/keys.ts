// Keys, roman-numeral harmony and voice leading. Pure.
import type { Midi } from './notes';
import { pitchClass } from './notes';

/** Conventional key names for each pitch class (ASCII accidentals). */
export const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export function keyName(tonic: Midi): string {
  return KEY_NAMES[pitchClass(tonic)]!;
}

interface Numeral {
  /** Semitones above the tonic. */
  root: number;
  third: 3 | 4;
  fifth: 6 | 7;
}

const maj = (root: number): Numeral => ({ root, third: 4, fifth: 7 });
const min = (root: number): Numeral => ({ root, third: 3, fifth: 7 });
const dim = (root: number): Numeral => ({ root, third: 3, fifth: 6 });

export const NUMERALS: Record<string, Numeral> = {
  // Major keys
  I: maj(0),
  ii: min(2),
  iii: min(4),
  IV: maj(5),
  V: maj(7),
  vi: min(9),
  'vii°': dim(11),
  // Minor keys
  i: min(0),
  'ii°': dim(2),
  III: maj(3),
  iv: min(5),
  v: min(7),
  VI: maj(8),
  VII: maj(10),
};

export function numeral(n: string): Numeral {
  const found = NUMERALS[n];
  if (!found) throw new Error(`Unknown numeral ${n}`);
  return found;
}

/** Pitch classes (0–11, relative to C) of a numeral's triad in a key. */
export function numeralPitchClasses(tonic: Midi, n: string): number[] {
  const { root, third, fifth } = numeral(n);
  return [root, root + third, root + fifth].map((i) => pitchClass(tonic + i));
}

/** Close voicings (three notes) of a triad with the lowest note in [lo, lo + 11]. */
function closeVoicings(pcs: readonly number[], lo: Midi): Midi[][] {
  const out: Midi[][] = [];
  for (let r = 0; r < pcs.length; r++) {
    const order = [...pcs.slice(r), ...pcs.slice(0, r)];
    let prev = lo + ((order[0]! - pitchClass(lo) + 12) % 12);
    const notes = [prev];
    for (const pc of order.slice(1)) {
      prev = prev + ((pc - pitchClass(prev) + 12) % 12 || 12);
      notes.push(prev);
    }
    out.push(notes);
  }
  return out;
}

const distance = (a: readonly Midi[], b: readonly Midi[]) => a.reduce((s, n, i) => s + Math.abs(n - (b[i] ?? n)), 0);

/**
 * Voice a progression the way a pianist would: bass plays the root low, the
 * three upper voices move as little as possible from chord to chord.
 * `tonic` should be around G3–F#4.
 */
export function voiceProgression(tonic: Midi, numerals: readonly string[]): Midi[][] {
  const bassBase = tonic - 12;
  let prevUpper: Midi[] | undefined;
  return numerals.map((n) => {
    const { root } = numeral(n);
    let bass = bassBase + root;
    if (bass > bassBase + 7) bass -= 12; // keep the bass line low and close
    const pcs = numeralPitchClasses(tonic, n);
    const candidates = closeVoicings(pcs, tonic - 3);
    const upper = prevUpper
      ? candidates.reduce((best, c) => (distance(c, prevUpper!) < distance(best, prevUpper!) ? c : best))
      : candidates[0]!;
    prevUpper = upper;
    return [bass, ...upper];
  });
}

/** I–IV–V–I in close position with a bass, to establish a major key. */
export function majorCadence(tonic: Midi): Midi[][] {
  return voiceProgression(tonic, ['I', 'IV', 'V', 'I']);
}
