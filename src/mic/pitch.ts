// Microphone pitch detection: getUserMedia → AnalyserNode (on Tone's context,
// so playback and listening share one clock) → pitchy (McLeod pitch method).
import * as Tone from 'tone';
import { PitchDetector } from 'pitchy';
import { setMicSession, unlockAudio } from '../audio/engine';
import { freqToMidi } from '../theory/notes';
import { median } from '../exercises/pitchMatch';

export type MicProblem = 'denied' | 'no-device' | 'busy' | 'insecure' | 'unsupported' | 'unknown';

export class MicError extends Error {
  constructor(readonly problem: MicProblem) {
    super(problem);
  }
}

/** 'granted' means we can open the mic without a prompt. */
export async function micPermission(): Promise<PermissionState | 'unknown'> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return 'unknown'; // Older Safari can't query the microphone permission.
  }
}

/** Sung pitch, smoothed; null when nothing clear is heard. */
export type PitchReading = number | null;

const FFT = 2048;
const MIN_CLARITY = 0.88;
// E2 to C6 covers any voice with room to spare; outside it is noise or harmonics.
const MIN_HZ = 75;
const MAX_HZ = 1100;
const SMOOTHING = 5;

export class PitchListener {
  private raf = 0;
  private recent: number[] = [];
  private constructor(
    private readonly stream: MediaStream,
    private readonly source: AudioNode,
    private readonly analyser: AnalyserNode,
  ) {}

  /**
   * Must be called from a tap: it also unlocks audio. Starts the audio unlock
   * and the mic request together so both happen inside the user gesture.
   */
  static async open(): Promise<PitchListener> {
    if (!window.isSecureContext) throw new MicError('insecure');
    if (!navigator.mediaDevices?.getUserMedia) throw new MicError('unsupported');
    setMicSession(true);
    const unlock = unlockAudio();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Raw signal: voice processing smears pitch and fades held notes.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      setMicSession(false);
      const name = (e as DOMException).name;
      throw new MicError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'denied'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'no-device'
            : name === 'NotReadableError' || name === 'AbortError'
              ? 'busy'
              : 'unknown',
      );
    }
    await unlock;
    const ctx = Tone.getContext();
    const source = ctx.createMediaStreamSource(stream) as unknown as AudioNode;
    const analyser = ctx.createAnalyser() as unknown as AnalyserNode;
    analyser.fftSize = FFT;
    source.connect(analyser);
    return new PitchListener(stream, source, analyser);
  }

  /** Calls back about 60 times a second with the current pitch. */
  start(onReading: (midi: PitchReading, t: number) => void): void {
    this.stopLoop();
    const detector = PitchDetector.forFloat32Array(FFT);
    detector.minVolumeDecibels = -45;
    const buf = new Float32Array(FFT);
    const rate = Tone.getContext().sampleRate;
    const tick = (t: number) => {
      this.analyser.getFloatTimeDomainData(buf);
      const [hz, clarity] = detector.findPitch(buf, rate);
      let reading: PitchReading = null;
      if (clarity >= MIN_CLARITY && hz >= MIN_HZ && hz <= MAX_HZ) {
        this.recent.push(freqToMidi(hz));
        if (this.recent.length > SMOOTHING) this.recent.shift();
        reading = median(this.recent);
      } else {
        this.recent = [];
      }
      onReading(reading, t);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stopLoop(): void {
    cancelAnimationFrame(this.raf);
    this.recent = [];
  }

  /** Stop listening and release the mic (the browser's recording indicator goes away). */
  close(): void {
    this.stopLoop();
    this.source.disconnect();
    for (const track of this.stream.getTracks()) track.stop();
    setMicSession(false);
  }
}
