// The contract every exercise mode implements. Pure TypeScript: no DOM, no
// React, no audio engine. The UI (PracticeRunner) drives any ExerciseDef.
import type { Sequence } from '../theory/sequence';
import type { InstrumentId } from '../theory/instruments';
import type { ModeId } from './modes';

export type Rand = () => number;

export interface AnswerOption {
  id: string;
  /** Large label on the key, e.g. "m3". */
  label: string;
  /** Small line under it, e.g. "Minor third". */
  sublabel?: string;
}

export interface Question {
  /** The item being tested; stats and scheduling are keyed by this. */
  itemId: string;
  /** Option id that counts as correct. */
  answerId: string;
  sequence: Sequence;
  instrument?: InstrumentId;
  /** Short instruction shown before answering, e.g. "Two notes, low then high." */
  prompt: string;
  /** What was actually played, shown after answering, e.g. "C4 up to E♭4". */
  reveal: string;
}

export interface Level {
  /** 1-based. */
  n: number;
  name: string;
  description: string;
  /** Items drawn in this level. Also the answer keys, in display order. */
  items: readonly string[];
}

export interface ExerciseDef {
  id: ModeId;
  levels: readonly Level[];
  /** Answer keys for a level, in display order. */
  options(level: Level): AnswerOption[];
  generate(itemId: string, level: Level, rand?: Rand): Question;
  /** Answer grid columns; defaults to 3 for up to six keys, else 4. Long labels want 2. */
  columns?: number;
}

export function levelOf(def: ExerciseDef, n: number): Level {
  const level = def.levels.find((l) => l.n === n);
  if (!level) throw new Error(`${def.id} has no level ${n}`);
  return level;
}
