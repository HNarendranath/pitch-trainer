import { keyName, voiceProgression } from '../theory/keys';
import { prettyAccidentals, randInt } from '../theory/notes';
import { chordSequence, concat, harmonic } from '../theory/sequence';
import type { ExerciseDef, Level, Question, Rand } from './types';

/** Item ids are the progressions themselves, written with en dashes. */
const split = (p: string) => p.split('–');
const isMinor = (p: string) => split(p)[0] === 'i';

const L1 = ['I–IV–V–I', 'I–V–vi–IV', 'I–vi–IV–V'];
const L2 = [...L1, 'I–IV–I–V', 'I–ii–V–I'];
const L3 = [...L2, 'vi–IV–I–V', 'I–iii–IV–V', 'I–V–IV–I'];
const L4 = [...L3, 'I–IV–vi–V', 'I–vi–ii–V'];
const MINOR = ['i–iv–v–i', 'i–iv–V–i', 'i–VI–III–VII', 'i–VII–VI–V', 'i–VI–VII–i'];

const LEVELS: readonly Level[] = [
  { n: 1, name: 'Three classics', description: 'I–IV–V–I, I–V–vi–IV and I–vi–IV–V', items: L1 },
  { n: 2, name: 'Five', description: 'Adds I–IV–I–V and I–ii–V–I', items: L2 },
  { n: 3, name: 'Eight', description: 'Adds vi–IV–I–V, I–iii–IV–V and I–V–IV–I', items: L3 },
  { n: 4, name: 'Ten', description: 'Adds I–IV–vi–V and I–vi–ii–V', items: L4 },
  { n: 5, name: 'Minor keys', description: 'Five common progressions in minor', items: MINOR },
];

export const progressions: ExerciseDef = {
  id: 'progressions',
  levels: LEVELS,
  columns: 2,

  options(level) {
    return level.items.map((id) => ({ id, label: id }));
  },

  generate(itemId, _level, rand: Rand = Math.random): Question {
    const tonic = randInt(55, 62, rand);
    const minor = isMinor(itemId);
    const keyChord = voiceProgression(tonic, [minor ? 'i' : 'I'])[0]!;
    const chords = voiceProgression(tonic, split(itemId));
    return {
      itemId,
      answerId: itemId,
      sequence: concat(harmonic(keyChord, 1.1), chordSequence(chords, 1.05, 1.1, 0.5)),
      prompt: 'The home chord, then four chords. Which progression?',
      reveal: `${itemId} in ${prettyAccidentals(keyName(tonic))} ${minor ? 'minor' : 'major'}`,
    };
  },
};
