// Mode catalogue shown on Home. Pure data, shared with any future native build.
export type ModeId =
  | 'intervals'
  | 'chords'
  | 'note-id'
  | 'scale-degrees'
  | 'scales'
  | 'progressions'
  | 'singing';

export interface ModeMeta {
  id: ModeId;
  name: string;
  /** One line, from the learner's point of view. */
  blurb: string;
  group: 'listen' | 'sing';
  /** Number of levels; drawn as frets on the mode's string. */
  levels: number;
}

export const MODES: readonly ModeMeta[] = [
  { id: 'intervals', name: 'Intervals', blurb: 'Name the distance between two notes', group: 'listen', levels: 6 },
  { id: 'chords', name: 'Chords', blurb: 'Hear major, minor, sevenths and inversions', group: 'listen', levels: 6 },
  { id: 'note-id', name: 'Perfect pitch', blurb: 'Name a note with nothing to compare it to', group: 'listen', levels: 8 },
  { id: 'scale-degrees', name: 'Scale degrees', blurb: 'Hear a key, then find where a note sits in it', group: 'listen', levels: 5 },
  { id: 'scales', name: 'Scales and modes', blurb: 'Tell major, minor and the modes apart', group: 'listen', levels: 5 },
  { id: 'progressions', name: 'Progressions', blurb: 'Follow the chords in a short progression', group: 'listen', levels: 5 },
  { id: 'singing', name: 'Pitch matching', blurb: 'Sing a note or interval and watch the needle', group: 'sing', levels: 5 },
];

export function modeById(id: string): ModeMeta | undefined {
  return MODES.find((m) => m.id === id);
}
