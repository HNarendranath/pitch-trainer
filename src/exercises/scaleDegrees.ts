import { Note } from 'tonal';
import { keyName, majorCadence } from '../theory/keys';
import { pick, prettyAccidentals, randInt } from '../theory/notes';
import { chordSequence, concat, melodic } from '../theory/sequence';
import type { ExerciseDef, Level, Question, Rand } from './types';

interface Degree {
  id: string;
  label: string;
  solfege: string;
  semitones: number;
  /** Interval from the tonic in tonal notation, for spelling. */
  interval: string;
}

const DEGREES: readonly Degree[] = [
  { id: '1', label: '1', solfege: 'do', semitones: 0, interval: '1P' },
  { id: 'b2', label: '♭2', solfege: 'ra', semitones: 1, interval: '2m' },
  { id: '2', label: '2', solfege: 're', semitones: 2, interval: '2M' },
  { id: 'b3', label: '♭3', solfege: 'me', semitones: 3, interval: '3m' },
  { id: '3', label: '3', solfege: 'mi', semitones: 4, interval: '3M' },
  { id: '4', label: '4', solfege: 'fa', semitones: 5, interval: '4P' },
  { id: '#4', label: '♯4', solfege: 'fi', semitones: 6, interval: '4A' },
  { id: '5', label: '5', solfege: 'sol', semitones: 7, interval: '5P' },
  { id: 'b6', label: '♭6', solfege: 'le', semitones: 8, interval: '6m' },
  { id: '6', label: '6', solfege: 'la', semitones: 9, interval: '6M' },
  { id: 'b7', label: '♭7', solfege: 'te', semitones: 10, interval: '7m' },
  { id: '7', label: '7', solfege: 'ti', semitones: 11, interval: '7M' },
];

const byId = new Map(DEGREES.map((d) => [d.id, d]));
export function degree(id: string): Degree {
  const d = byId.get(id);
  if (!d) throw new Error(`Unknown degree ${id}`);
  return d;
}

interface DegreeLevel extends Level {
  /** Octave offsets (in octaves) the target note may be moved by. */
  octaves: readonly number[];
}

const DIATONIC = ['1', '2', '3', '4', '5', '6', '7'];

const LEVELS: readonly DegreeLevel[] = [
  { n: 1, name: 'Home notes', description: 'Do, mi and sol: the notes of the home chord', items: ['1', '3', '5'], octaves: [0] },
  { n: 2, name: 'First five', description: 'Do, re, mi, fa and sol', items: ['1', '2', '3', '4', '5'], octaves: [0] },
  { n: 3, name: 'Whole scale', description: 'All seven notes of the major scale', items: DIATONIC, octaves: [0] },
  { n: 4, name: 'Any octave', description: 'All seven, above or below the key', items: DIATONIC, octaves: [-1, 0, 1] },
  { n: 5, name: 'Chromatic', description: 'All twelve, including ra, me, fi, le and te', items: DEGREES.map((d) => d.id), octaves: [0] },
];

export const scaleDegrees: ExerciseDef = {
  id: 'scale-degrees',
  levels: LEVELS,

  options(level) {
    return level.items.map((id) => {
      const d = degree(id);
      return { id, label: d.label, sublabel: d.solfege };
    });
  },

  generate(itemId, level, rand: Rand = Math.random): Question {
    const lvl = level as DegreeLevel;
    const d = degree(itemId);
    const tonic = randInt(55, 66, rand); // G3–F#4 keeps the cadence comfortable
    const options = lvl.octaves.map((o) => tonic + d.semitones + 12 * o).filter((m) => m >= 45 && m <= 84);
    const target = pick(options.length ? options : [tonic + d.semitones], rand);
    const cadence = chordSequence(majorCadence(tonic), 0.75, 0.8);
    const key = keyName(tonic);
    const name = Note.pitchClass(Note.transpose(key, d.interval));
    return {
      itemId,
      answerId: itemId,
      sequence: concat(cadence, melodic([target], 0, 1.5, 0.35)),
      prompt: 'Four chords set the key, then one note. Where does it sit?',
      reveal: `Key of ${prettyAccidentals(key)} major: ${d.label} (${d.solfege}) is ${prettyAccidentals(name)}`,
    };
  },
};
