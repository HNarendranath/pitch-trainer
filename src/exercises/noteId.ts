import { INSTRUMENT_IDS, instrumentsFor } from '../theory/instruments';
import { pick, pitchClass, prettyAccidentals, randInt } from '../theory/notes';
import { concat, melodic, noiseReset } from '../theory/sequence';
import type { ExerciseDef, Level, Question, Rand } from './types';

/** Item ids are pitch classes 0–11 as strings. Black keys show both spellings. */
const NAMES: readonly [string, string?][] = [
  ['C'],
  ['C#', 'Db'],
  ['D'],
  ['Eb', 'D#'],
  ['E'],
  ['F'],
  ['F#', 'Gb'],
  ['G'],
  ['Ab', 'G#'],
  ['A'],
  ['Bb', 'A#'],
  ['B'],
];

interface NoteLevel extends Level {
  low: number;
  high: number;
  /** Pick a random instrument per question instead of your chosen ones. */
  anyInstrument: boolean;
  dur: number;
}

const pcs = (...names: string[]) => names.map((n) => String(NAMES.findIndex(([a]) => a === n)));

// Notes join in an order that keeps each new one far from the ones you know.
const L1 = pcs('C', 'F#', 'A');
const L2 = [...L1, ...pcs('Eb')];
const L3 = [...L2, ...pcs('E', 'Bb')];
const L4 = [...L3, ...pcs('G', 'C#')];
const L5 = [...L4, ...pcs('D', 'Ab')];
const ALL = [...L5, ...pcs('F', 'B')];
const sorted = (ids: string[]) => [...ids].sort((a, b) => Number(a) - Number(b));

const MID = { low: 48, high: 83 }; // C3–B5
const WIDE = { low: 36, high: 95 }; // C2–B6

const LEVELS: readonly NoteLevel[] = [
  { n: 1, name: 'Three anchors', description: 'C, F♯ and A', items: sorted(L1), ...MID, anyInstrument: false, dur: 1.6 },
  { n: 2, name: 'Four', description: 'Adds E♭', items: sorted(L2), ...MID, anyInstrument: false, dur: 1.6 },
  { n: 3, name: 'Six', description: 'Adds E and B♭', items: sorted(L3), ...MID, anyInstrument: false, dur: 1.6 },
  { n: 4, name: 'Eight', description: 'Adds G and C♯', items: sorted(L4), ...MID, anyInstrument: false, dur: 1.6 },
  { n: 5, name: 'Ten', description: 'Adds D and A♭', items: sorted(L5), ...MID, anyInstrument: false, dur: 1.6 },
  { n: 6, name: 'All twelve', description: 'Adds F and B', items: sorted(ALL), ...MID, anyInstrument: false, dur: 1.6 },
  { n: 7, name: 'Any register', description: 'All twelve, from low C2 to high B6', items: sorted(ALL), ...WIDE, anyInstrument: false, dur: 1.4 },
  { n: 8, name: 'Any instrument', description: 'All twelve, any register, any instrument, shorter notes', items: sorted(ALL), ...WIDE, anyInstrument: true, dur: 0.6 },
];

export const noteId: ExerciseDef = {
  id: 'note-id',
  levels: LEVELS,

  options(level) {
    return level.items.map((id) => {
      const [name, alt] = NAMES[Number(id)]!;
      return { id, label: prettyAccidentals(name), sublabel: alt ? prettyAccidentals(alt) : undefined };
    });
  },

  generate(itemId, level, rand: Rand = Math.random): Question {
    const lvl = level as NoteLevel;
    const pc = Number(itemId);
    // Every octave of this pitch class inside the level's range.
    const octaves: number[] = [];
    for (let m = lvl.low; m <= lvl.high; m++) if (pitchClass(m) === pc) octaves.push(m);
    const note = octaves[randInt(0, octaves.length - 1, rand)]!;
    const instrument = lvl.anyInstrument ? pick(instrumentsFor([note], INSTRUMENT_IDS), rand) : undefined;
    const octave = Math.floor(note / 12) - 1;
    return {
      itemId,
      answerId: itemId,
      // Soft noise first wipes the previous note from your ear.
      sequence: concat(noiseReset(), melodic([note], 0, lvl.dur)),
      instrument,
      prompt: 'One note on its own. Name it.',
      reveal: `That was ${prettyAccidentals(NAMES[pc]![0])}${octave}`,
    };
  },
};
