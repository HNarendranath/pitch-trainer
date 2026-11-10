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

interface Playback {
  done: Promise<void>;
  finish: () => void;
  timer: ReturnType<typeof setTimeout>;
  sampler: Tone.Sampler;
}

let current: Playback | undefined;
/** Set while a play() call is loading/unlocking, so rapid taps can't race it. */
let starting: Promise<void> | undefined;
/** Bumped on every play/stop; a play that was superseded while loading never sounds. */
let generation = 0;

export function isPlaying(): boolean {
  return current !== undefined || starting !== undefined;
}

export interface PlayOptions {
  instrument?: InstrumentId;
  /**
   * false (default): if something is already playing, this call is ignored and
   * returns the in-flight playback, so repeated taps never overlap.
   * true: cut off whatever is playing (e.g. moving to the next question).
   */
  interrupt?: boolean;
  /** Leave out noise bursts (used for replays, where the reset isn't needed). */
  skipNoise?: boolean;
}

/** Play a sequence; resolves when it has finished sounding (or was stopped). */
export function playSequence(input: Sequence, { instrument = 'piano', interrupt = false, skipNoise = false }: PlayOptions = {}): Promise<void> {
  const seq = skipNoise ? withoutNoise(input) : input;
  if (!interrupt) {
    if (current) return current.done;
    if (starting) return starting;
  }
  stopAll();
  const gen = generation;
  let run!: Promise<void>;
  run = (async () => {
    await unlockAudio();
    const sampler = await getInstrument(instrument);
    if (gen !== generation) return; // stopped or replaced while loading
    // Notes go on the Transport rather than straight onto the audio clock so
    // that stopAll() can cancel notes that haven't started yet.
    const transport = Tone.getTransport();
    for (const ev of seq) {
      if (ev.noise) {
        const burst = getNoise();
        transport.schedule((time) => burst.triggerAttackRelease(ev.dur, time), ev.at);
        continue;
      }
      const freqs = ev.notes.map((n) => midiToFreq(n));
      transport.schedule((time) => sampler.triggerAttackRelease(freqs, ev.dur, time, ev.velocity ?? 0.8), ev.at);
    }
    transport.start('+0.06', 0);

    let finish!: () => void;
    const done = new Promise<void>((resolve) => (finish = resolve));
    const timer = setTimeout(() => {
      if (current?.done === done) {
        stopTransport();
        current = undefined;
      }
      finish();
    }, (sequenceLength(seq) + 0.15) * 1000);
    current = { done, finish, timer, sampler };
    if (starting === run) starting = undefined;
    return done;
  })();
  starting = run;
  void run.finally(() => {
    if (starting === run) starting = undefined;
  });
  return run;
}

let noise: Tone.NoiseSynth | undefined;
function getNoise(): Tone.NoiseSynth {
  noise ??= new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.25 },
    volume: -26,
  }).toDestination();
  return noise;
}

/** Drop noise events and shift the rest so playback starts straight away. */
function withoutNoise(seq: Sequence): Sequence {
  const notes = seq.filter((e) => !e.noise);
  const start = Math.min(...notes.map((e) => e.at));
  return Number.isFinite(start) ? notes.map((e) => ({ ...e, at: e.at - start })) : notes;
}

function stopTransport(): void {
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel(0);
}

/** Cut off any playback immediately, including notes not yet started. */
export function stopAll(): void {
  generation++;
  starting = undefined;
  if (!current) {
    stopTransport();
    return;
  }
  const { timer, sampler, finish } = current;
  current = undefined;
  clearTimeout(timer);
  stopTransport();
  sampler.releaseAll();
  finish();
}
