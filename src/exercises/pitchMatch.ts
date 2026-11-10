// Judging a sung pitch over time. Pure: readings come in as fractional MIDI
// numbers with timestamps; no audio code here.
import type { Midi } from '../theory/notes';

/** How long a note must be held to count. */
export const HOLD_MS = 800;
/** Wobbles and dropouts shorter than this don't break a hold. */
export const GRACE_MS = 200;

/**
 * Cents from the target, ignoring octaves (any octave of the note counts, so
 * low and high voices sing the same exercise). Range −600…+600.
 */
export function centsOff(sung: number, target: Midi): number {
  const d = (sung - target) * 100;
  return ((((d + 600) % 1200) + 1200) % 1200) - 600;
}

export interface HoldOptions {
  /** Cents either side that count as in tune. */
  tolerance: number;
  /** The pitch to hold. Leave out to accept any steady note (singing from memory). */
  target?: Midi;
  holdMs?: number;
  graceMs?: number;
}

export interface HoldState {
  /** Cents from the target, or null when there's no voice (or no target). */
  cents: number | null;
  inTune: boolean;
  /** 0…1 towards a completed hold. */
  progress: number;
  done: boolean;
  /** Average pitch over the current hold. */
  heldMidi: number | null;
}

/**
 * Feed it readings; it reports when the singer has held a note for long
 * enough. With a target, the note must stay within tolerance of it. Without
 * one, it must stay within tolerance of its own running average.
 */
export class Hold {
  private start = -1;
  private lastGood = -1;
  private sum = 0;
  private n = 0;
  private finished: HoldState | null = null;
  private readonly holdMs: number;
  private readonly graceMs: number;

  constructor(private readonly opts: HoldOptions) {
    this.holdMs = opts.holdMs ?? HOLD_MS;
    this.graceMs = opts.graceMs ?? GRACE_MS;
  }

  push(midi: number | null, t: number): HoldState {
    if (this.finished) return this.finished;
    const { target, tolerance } = this.opts;
    const cents = midi !== null && target !== undefined ? centsOff(midi, target) : null;

    let ok = false;
    if (midi !== null) {
      if (target !== undefined) ok = Math.abs(cents!) <= tolerance;
      else ok = this.start < 0 || Math.abs(midi - this.sum / this.n) * 100 <= tolerance;
    }

    if (ok) {
      if (this.start < 0) this.begin(t);
      this.lastGood = t;
      this.sum += midi!;
      this.n++;
    } else if (this.start >= 0 && t - this.lastGood > this.graceMs) {
      this.reset();
      // A steady-note hold restarts from the new pitch straight away.
      if (target === undefined && midi !== null) {
        this.begin(t);
        this.lastGood = t;
        this.sum = midi;
        this.n = 1;
      }
    }

    const progress = this.start < 0 ? 0 : Math.min(1, (t - this.start) / this.holdMs);
    const state: HoldState = {
      cents,
      inTune: ok,
      progress,
      // Only finish on an in-tune reading: sliding off at the end mustn't count.
      done: progress >= 1 && ok,
      heldMidi: this.n > 0 ? this.sum / this.n : null,
    };
    if (state.done) this.finished = state;
    return state;
  }

  private begin(t: number) {
    this.start = t;
    this.sum = 0;
    this.n = 0;
  }

  private reset() {
    this.start = -1;
    this.lastGood = -1;
    this.sum = 0;
    this.n = 0;
  }
}

/** Median of recent readings: steadies the needle without much lag. */
export function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
