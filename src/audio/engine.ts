// Audio engine: owns the Tone.js context, the iOS audio-session quirks and
// sequence playback. UI code only calls `playSequence` / `stopAll`.
import * as Tone from 'tone';
import type { Sequence } from '../theory/sequence';
import { sequenceLength } from '../theory/sequence';
import { midiToFreq } from '../theory/notes';
import { getInstrument, type InstrumentId } from './instruments';

type AudioSessionType = 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record';

declare global {
  interface Navigator {
    // Safari 16.4+: lets web audio ignore the ringer/silent switch on iPhone.
    audioSession?: { type: AudioSessionType };
  }
}

export const supportsAudioSession = typeof navigator !== 'undefined' && 'audioSession' in navigator;

export function setAudioSession(type: AudioSessionType): void {
  if (navigator.audioSession) navigator.audioSession.type = type;
}

let unlocked = false;

/**
 * Must be called from a user gesture (tap) before the first sound:
 * mobile browsers keep the AudioContext suspended until then.
 */
export async function unlockAudio(): Promise<void> {
  // Set the session *before* resuming so iOS routes audio as media playback,
  // which is not muted by the silent switch.
  setAudioSession('playback');
  if (Tone.getContext().state !== 'running') await Tone.start();
  if (!unlocked) {
    unlocked = true;
    Tone.getContext().lookAhead = 0.05;
  }
}

let activeTimer: ReturnType<typeof setTimeout> | undefined;
let activeInstrument: InstrumentId | undefined;

/**
 * Play a sequence and resolve when it has finished sounding.
 * Starting a new sequence cuts off the previous one.
 */
export async function playSequence(seq: Sequence, instrument: InstrumentId = 'piano'): Promise<void> {
  await unlockAudio();
  stopAll();
  const sampler = await getInstrument(instrument);
  activeInstrument = instrument;
  const t0 = Tone.now() + 0.06;
  for (const ev of seq) {
    sampler.triggerAttackRelease(
      ev.notes.map((n) => midiToFreq(n)),
      ev.dur,
      t0 + ev.at,
      ev.velocity ?? 0.8,
    );
  }
  const ms = (sequenceLength(seq) + 0.1) * 1000;
  return new Promise((resolve) => {
    activeTimer = setTimeout(resolve, ms);
  });
}

export function stopAll(): void {
  if (activeTimer) clearTimeout(activeTimer);
  activeTimer = undefined;
  if (activeInstrument) {
    void getInstrument(activeInstrument).then((s) => s.releaseAll());
  }
}
