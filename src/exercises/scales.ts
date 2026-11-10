import { keyName } from '../theory/keys';
import { prettyAccidentals, randInt } from '../theory/notes';
import { scaleDef } from '../theory/scales';
import { melodic } from '../theory/sequence';
import type { ExerciseDef, Level, Question, Rand } from './types';

const MODES = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'];

const LEVELS: readonly Level[] = [
  { n: 1, name: 'Major or minor', description: 'Major and natural minor', items: ['major', 'minor'] },
  { n: 2, name: 'Three minors', description: 'Adds harmonic and melodic minor', items: ['major', 'minor', 'harmonic', 'melodic'] },
  { n: 3, name: 'The modes', description: 'Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian and Locrian', items: MODES },
  { n: 4, name: 'Pentatonic and beyond', description: 'Pentatonics, blues and whole tone, with major and minor', items: ['major', 'minor', 'majpent', 'minpent', 'blues', 'wholetone'] },
  {
    n: 5,
    name: 'Everything',
    description: 'All thirteen scales',
    items: [...MODES.slice(0, 5), 'minor', 'harmonic', 'melodic', 'locrian', 'majpent', 'minpent', 'blues', 'wholetone'],
  },
];

export const scales: ExerciseDef = {
  id: 'scales',
  levels: LEVELS,
  columns: 2,

  options(level) {
    return level.items.map((id) => {
      const s = scaleDef(id);
      return { id, label: s.name, sublabel: s.hint };
    });
  },

  generate(itemId, _level, rand: Rand = Math.random): Question {
    const s = scaleDef(itemId);
    const tonic = randInt(48, 62, rand);
    const notes = [...s.intervals.map((i) => tonic + i), tonic + 12];
    return {
      itemId,
      answerId: itemId,
      sequence: melodic(notes, 0.3, 0.45),
      prompt: 'A scale, from the bottom up.',
      reveal: `${s.name} on ${prettyAccidentals(keyName(tonic))}`,
    };
  },
};
