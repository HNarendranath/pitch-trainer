// Pitch matching: the learner sings and the mic checks the pitch. Pure: the
// question says what to play and which pitch to hit; the UI does the listening.
import { INTERVALS, spellInterval, type IntervalInfo } from '../theory/intervals';
import { noteName, pitchClass, pitchClassName, prettyAccidentals, randInt, type Midi } from '../theory/notes';
import { melodic, type Sequence } from '../theory/sequence';
import type { Level, Rand } from './types';

export type VoiceRange = 'low' | 'high';

/** Comfortable ranges: roughly bass–baritone and alto–soprano, kept modest. */
export const VOICE_RANGES: Record<VoiceRange, { low: Midi; high: Midi; name: string }> = {
  low: { low: 45, high: 64, name: 'Lower' }, // A2–E4
  high: { low: 57, high: 76, name: 'Higher' }, // A3–E5
};

export interface SingLevel extends Level {
  kind: 'echo' | 'up' | 'down' | 'recall';
  /** How close counts as in tune, in cents either side. */
  tolerance: number;
}

export interface SingQuestion {
  itemId: string;
  /** What to play first; null for singing from memory. */
  reference: Sequence | null;
  target: Midi;
  /** The target spelled for display, e.g. "G♯3" (no octave when any octave counts). */
  targetName: string;
  tolerance: number;
  /**
   * Recall questions give no live guidance: the learner holds any steady
   * note and that note is judged.
   */
  blind: boolean;
  prompt: string;
  /** Shown once matched, or after a miss. */
  reveal: string;
}

const STEPS = ['M2', 'M3', 'P4', 'P5'];
const ALL_UP = ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7'];
const DOWN = ['M2', 'm3', 'M3', 'P4', 'P5', 'M6'];
const PITCH_CLASSES = Array.from({ length: 12 }, (_, i) => String(i));

export const SING_LEVELS: readonly SingLevel[] = [
  { n: 1, name: 'Sing it back', description: 'Hear a note, then sing the same note', items: ['P1'], kind: 'echo', tolerance: 35 },
  { n: 2, name: 'Small steps up', description: 'Sing a second, third, fourth or fifth above the note you hear', items: STEPS, kind: 'up', tolerance: 30 },
  { n: 3, name: 'Every interval up', description: 'Any interval from a minor second to a major seventh, going up', items: ALL_UP, kind: 'up', tolerance: 30 },
  { n: 4, name: 'Going down', description: 'Sing intervals below the note you hear', items: DOWN, kind: 'down', tolerance: 30 },
  { n: 5, name: 'From memory', description: 'Sing a named note with nothing to start from. Any octave counts', items: PITCH_CLASSES, kind: 'recall', tolerance: 40 },
];

/** Interval items are the short labels used on the interval keys ("M3"). */
function intervalFor(id: string): IntervalInfo {
  const info = INTERVALS.find((i) => i.short === id);
  if (!info) throw new Error(`Unknown interval ${id}`);
  return info;
}

/** Spelling a singer would read: C♯, E♭, F♯, A♭, B♭. */
export const singerNoteName = (pc: number) => prettyAccidentals(pitchClassName(pc, [3, 8, 10].includes(pc)));

export function itemLabel(level: SingLevel, itemId: string): string {
  if (level.kind === 'echo') return 'Same note';
  if (level.kind === 'recall') return singerNoteName(Number(itemId));
  return intervalFor(itemId).name;
}

const pretty = (name: string) => prettyAccidentals(name);

export function generateSing(itemId: string, level: SingLevel, voice: VoiceRange, rand: Rand = Math.random): SingQuestion {
  const range = VOICE_RANGES[voice];
  const base = { itemId, tolerance: level.tolerance };

  if (level.kind === 'recall') {
    const pc = Number(itemId);
    // The octave of this pitch class nearest the middle of the voice.
    const mid = Math.round((range.low + range.high) / 2);
    const below = mid - pitchClass(mid - pc);
    const target = mid - below > 6 ? below + 12 : below;
    const name = singerNoteName(pc);
    return {
      ...base,
      reference: null,
      target,
      targetName: name,
      blind: true,
      prompt: `Sing ${/^[AEF]/.test(name) ? 'an' : 'a'} ${name}. Hold a steady note.`,
      reveal: `That was ${name}`,
    };
  }

  if (level.kind === 'echo') {
    const ref = randInt(range.low, range.high, rand);
    return {
      ...base,
      reference: melodic([ref], 0, 1.2),
      target: ref,
      targetName: pretty(noteName(ref, true)),
      blind: false,
      prompt: 'Listen, then sing the same note.',
      reveal: `That was ${pretty(noteName(ref, true))}`,
    };
  }

  const info = intervalFor(itemId);
  const up = level.kind === 'up';
  const ref = up ? randInt(range.low, range.high - info.semitones, rand) : randInt(range.low + info.semitones, range.high, rand);
  const target = up ? ref + info.semitones : ref - info.semitones;
  const [lowName, highName] = spellInterval(Math.min(ref, target), info);
  const [refName, targetName] = up ? [lowName, highName] : [highName, lowName];
  const what = info.name.toLowerCase();
  return {
    ...base,
    reference: melodic([ref], 0, 1.2),
    target,
    targetName: pretty(targetName),
    blind: false,
    prompt: `Sing a ${what} ${up ? 'above' : 'below'} this note.`,
    reveal: `A ${what} ${up ? 'above' : 'below'} ${pretty(refName)} is ${pretty(targetName)}`,
  };
}

export const singing = {
  id: 'singing' as const,
  levels: SING_LEVELS,
};
