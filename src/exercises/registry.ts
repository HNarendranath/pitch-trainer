import type { ExerciseDef } from './types';
import type { ModeId } from './modes';
import { intervals } from './intervals';

/** Modes that are playable. The rest show a "coming soon" screen. */
export const EXERCISES: Partial<Record<ModeId, ExerciseDef>> = {
  intervals,
};

export function exerciseFor(id: string): ExerciseDef | undefined {
  return EXERCISES[id as ModeId];
}
