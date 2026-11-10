import { INTERVALS, spellInterval, type IntervalInfo } from '../theory/intervals';
import { DEFAULT_RANGE, pick, prettyAccidentals, randInt } from '../theory/notes';
import { harmonic, melodic } from '../theory/sequence';
import type { ExerciseDef, Level, Question, Rand } from './types';

type Direction = 'up' | 'down' | 'together';

interface IntervalLevel extends Level {
  directions: readonly Direction[];
}

const SIMPLE = ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'] as const;

const LEVELS: readonly IntervalLevel[] = [
  { n: 1, name: 'First steps', description: 'Major second, major third, fourth, fifth and octave, going up', items: ['M2', 'M3', 'P4', 'P5', 'P8'], directions: ['up'] },
  { n: 2, name: 'Minor colours', description: 'Adds the minor second, minor third and major sixth, going up', items: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'P8'], directions: ['up'] },
  { n: 3, name: 'Every interval up', description: 'All twelve intervals within an octave, going up', items: SIMPLE, directions: ['up'] },
  { n: 4, name: 'Going down', description: 'All twelve intervals, high note first', items: SIMPLE, directions: ['down'] },
  { n: 5, name: 'Together', description: 'All twelve intervals played at once', items: SIMPLE, directions: ['together'] },
  {
    n: 6,
    name: 'Wider and mixed',
    description: 'Ninths, tenths, elevenths and twelfths join in, in any direction',
    items: [...SIMPLE, 'm9', 'M9', 'm10', 'M10', 'P11', 'P12'],
    directions: ['up', 'down', 'together'],
  },
];

const byShort = new Map<string, IntervalInfo>(INTERVALS.map((i) => [i.short, i]));

export function intervalInfo(short: string): IntervalInfo {
  const info = byShort.get(short);
  if (!info) throw new Error(`Unknown interval ${short}`);
  return info;
}

const PROMPTS: Record<Direction, string> = {
  up: 'Two notes, low then high.',
  down: 'Two notes, high then low.',
  together: 'Two notes at once.',
};

export const intervals: ExerciseDef = {
  id: 'intervals',
  levels: LEVELS,

  options(level) {
    return [...level.items]
      .map(intervalInfo)
      .sort((a, b) => a.semitones - b.semitones)
      .map((i) => ({ id: i.short, label: i.short, sublabel: i.name }));
  },

  generate(itemId, level, rand: Rand = Math.random): Question {
    const info = intervalInfo(itemId);
    const { semitones, name } = info;
    const dir = pick((level as IntervalLevel).directions ?? ['up'], rand);
    const low = randInt(DEFAULT_RANGE.low, DEFAULT_RANGE.high - semitones, rand);
    const high = low + semitones;
    const sequence = dir === 'together' ? harmonic([low, high]) : melodic(dir === 'up' ? [low, high] : [high, low]);
    const [lowName, highName] = spellInterval(low, info).map(prettyAccidentals) as [string, string];
    const reveal =
      dir === 'up'
        ? `${name}: ${lowName} up to ${highName}`
        : dir === 'down'
          ? `${name}: ${highName} down to ${lowName}`
          : `${name}: ${lowName} and ${highName} together`;
    return { itemId, answerId: itemId, sequence, prompt: PROMPTS[dir], reveal };
  },
};
