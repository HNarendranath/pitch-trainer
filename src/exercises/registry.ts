import type { ExerciseDef } from './types';
import type { ModeId } from './modes';
import { intervals } from './intervals';
import { chords } from './chords';
import { noteId } from './noteId';
import { scaleDegrees } from './scaleDegrees';
import { scales } from './scales';
import { progressions } from './progressions';

/** Modes that are playable. The rest show a "coming soon" screen. */
export const EXERCISES: Partial<Record<ModeId, ExerciseDef>> = {
  intervals,
  chords,
  'note-id': noteId,
  'scale-degrees': scaleDegrees,
  scales,
  progressions,
};

export function exerciseFor(id: string): ExerciseDef | undefined {
  return EXERCISES[id as ModeId];
}
