import Dexie, { type EntityTable } from 'dexie';
import type { ModeId } from '../exercises/modes';

export interface Attempt {
  id?: number;
  mode: ModeId;
  level: number;
  item: string;
  /** The option chosen. */
  answer: string;
  correct: boolean;
  ms: number;
  ts: number;
}

export interface ModeProgress {
  mode: ModeId;
  /** Highest level unlocked (1-based). */
  unlocked: number;
  /** Level last practised, used as the default next time. */
  lastLevel: number;
}

export const db = new Dexie('pitch-trainer') as Dexie & {
  attempts: EntityTable<Attempt, 'id'>;
  progress: EntityTable<ModeProgress, 'mode'>;
};

db.version(1).stores({
  attempts: '++id, ts, [mode+level+ts]',
  progress: 'mode',
});
