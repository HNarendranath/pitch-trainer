// Right/wrong cues: sound and vibration, each switchable in Settings.
//
// The sounds are deliberately unpitched (filtered noise, no tone). A chime at
// a fixed pitch would hand perfect-pitch practice a reference note, and could
// colour the next interval you hear.
import * as Tone from 'tone';
import { useSettings } from '../state/settings';

let tick: Tone.NoiseSynth | undefined;
let thud: Tone.NoiseSynth | undefined;

function voices() {
  if (!tick) {
    const hp = new Tone.Filter({ frequency: 5200, type: 'highpass', rolloff: -24 }).toDestination();
    tick = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 }, volume: -16 }).connect(hp);
    const lp = new Tone.Filter({ frequency: 260, type: 'lowpass', rolloff: -24 }).toDestination();
    thud = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.004, decay: 0.16, sustain: 0, release: 0.05 }, volume: -4 }).connect(lp);
  }
  return { tick: tick!, thud: thud! };
}

/** Patterns in ms. Android only: iOS web apps can't vibrate. */
const BUZZ = { correct: 14, wrong: [36, 50, 36], unlock: [20, 40, 20, 40, 70] } as const;

export function buzz(kind: keyof typeof BUZZ): void {
  if (!useSettings.getState().haptics) return;
  try {
    navigator.vibrate?.(BUZZ[kind] as number | number[]);
  } catch {
    // Some browsers throw if vibration isn't allowed yet; never break a tap over it.
  }
}

/** Play the cue for an answer. Call from the tap that answered (audio is unlocked by then). */
export function answerFeedback(correct: boolean): void {
  buzz(correct ? 'correct' : 'wrong');
  if (!useSettings.getState().feedbackSounds || Tone.getContext().state !== 'running') return;
  const { tick, thud } = voices();
  const now = Tone.now();
  if (correct) {
    tick.triggerAttackRelease(0.03, now);
    tick.triggerAttackRelease(0.03, now + 0.075);
  } else {
    thud.triggerAttackRelease(0.14, now);
  }
}
