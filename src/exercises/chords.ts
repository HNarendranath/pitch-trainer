import { chordQuality, INVERSION_NAMES, voiceChord } from '../theory/chords';
import { keyName } from '../theory/keys';
import { pick, prettyAccidentals, randInt } from '../theory/notes';
import { concat, harmonic, melodic } from '../theory/sequence';
import type { ExerciseDef, Level, Question, Rand } from './types';

interface ChordLevel extends Level {
  inversions: readonly number[];
  /** Arpeggiate before the block chord: easier to hear each note. */
  arpeggio: boolean;
  /** Chance of an open (spread) voicing. */
  openChance: number;
}

const TRIADS = ['maj', 'min', 'dim', 'aug'];
const SEVENTHS = ['maj7', '7', 'm7', 'm7b5', 'dim7'];

const LEVELS: readonly ChordLevel[] = [
  { n: 1, name: 'Major or minor', description: 'Major and minor triads, played note by note and then together', items: ['maj', 'min'], inversions: [0], arpeggio: true, openChance: 0 },
  { n: 2, name: 'Four triads', description: 'Adds diminished and augmented', items: TRIADS, inversions: [0], arpeggio: true, openChance: 0 },
  { n: 3, name: 'Inversions', description: 'The four triads with any note in the bass, played together', items: TRIADS, inversions: [0, 1, 2], arpeggio: false, openChance: 0 },
  { n: 4, name: 'Sevenths', description: 'Major 7th, dominant 7th, minor 7th, half-diminished and diminished 7th', items: SEVENTHS, inversions: [0], arpeggio: true, openChance: 0 },
  { n: 5, name: 'Seventh inversions', description: 'The five sevenths in any inversion, played together', items: SEVENTHS, inversions: [0, 1, 2, 3], arpeggio: false, openChance: 0 },
  {
    n: 6,
    name: 'Everything',
    description: 'Triads, suspended chords and sevenths, any inversion, close or spread',
    items: [...TRIADS, 'sus2', 'sus4', ...SEVENTHS],
    inversions: [0, 1, 2, 3],
    arpeggio: false,
    openChance: 0.5,
  },
];

const LOW = 45; // A2
const HIGH = 84; // C6

export const chords: ExerciseDef = {
  id: 'chords',
  levels: LEVELS,

  options(level) {
    return level.items.map((id) => {
      const q = chordQuality(id);
      return { id, label: q.symbol, sublabel: q.name };
    });
  },

  generate(itemId, level, rand: Rand = Math.random): Question {
    const lvl = level as ChordLevel;
    const quality = chordQuality(itemId);
    const inversion = pick(lvl.inversions, rand) % quality.intervals.length;
    const open = rand() < lvl.openChance;
    // Find a root that keeps the whole voicing in range.
    let notes: number[] = [];
    let root = 0;
    for (let tries = 0; tries < 50; tries++) {
      root = randInt(LOW, 64, rand);
      notes = voiceChord(root, quality.intervals, inversion, open);
      if (notes[0]! >= LOW && notes.at(-1)! <= HIGH) break;
    }
    const sequence = lvl.arpeggio ? concat(melodic(notes, 0.32, 0.9), harmonic(notes, 1.8)) : harmonic(notes, 2);
    const where = [INVERSION_NAMES[inversion], open ? 'spread' : null].filter(Boolean).join(', ');
    const octave = Math.floor(root / 12) - 1;
    return {
      itemId,
      answerId: itemId,
      sequence,
      prompt: lvl.arpeggio ? 'A chord, note by note and then together.' : 'A chord.',
      reveal: `${quality.name}${['maj', 'min', 'dim', 'aug'].includes(itemId) ? ' triad' : ''} on ${prettyAccidentals(keyName(root))}${octave}, ${where}`,
    };
  },
};
