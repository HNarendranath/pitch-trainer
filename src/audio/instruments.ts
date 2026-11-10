import * as Tone from 'tone';
import { INSTRUMENT_META, type InstrumentId } from '../theory/instruments';

export type { InstrumentId };

interface InstrumentDef {
  id: InstrumentId;
  baseUrl: string;
  /** Sample files present in public/samples/<id>/ ("Ds3" = D#3). */
  files: readonly string[];
  release: number;
  /** Gain trim in dB so instruments sound equally loud. */
  volume: number;
}

const DEFS: Record<InstrumentId, InstrumentDef> = {
  // Salamander Grand Piano, sampled every minor third.
  piano: {
    id: 'piano',
    baseUrl: '/samples/piano/',
    files: [1, 2, 3, 4, 5, 6].flatMap((o) => [`C${o}`, `Ds${o}`, `Fs${o}`, `A${o}`]).concat('C7'),
    release: 1.2,
    volume: 0,
  },
  // The rest are from nbrosowsky/tonejs-instruments (CC BY 3.0).
  guitar: {
    id: 'guitar',
    baseUrl: '/samples/guitar/',
    files: ['E2', 'G2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'D5'],
    release: 1,
    volume: 1,
  },
  strings: {
    id: 'strings',
    baseUrl: '/samples/strings/',
    files: ['C2', 'E2', 'A2', 'Ds3', 'A3', 'C4', 'E4', 'A4', 'E5', 'A5', 'E6', 'C7'],
    release: 0.6,
    volume: -3,
  },
  organ: {
    id: 'organ',
    baseUrl: '/samples/organ/',
    files: ['C2', 'Fs2', 'C3', 'Fs3', 'C4', 'Fs4', 'C5', 'Fs5', 'C6'],
    release: 0.4,
    volume: -8,
  },
  flute: {
    id: 'flute',
    baseUrl: '/samples/flute/',
    files: ['C4', 'E4', 'A4', 'C5', 'E5', 'A5', 'C6', 'E6', 'C7'],
    release: 0.5,
    volume: -2,
  },
};

export function instrumentName(id: InstrumentId): string {
  return INSTRUMENT_META[id].name;
}

/** "Ds3" → "D#3" (Tone note name) */
function toneName(file: string): string {
  return file.replace('s', '#');
}

const cache = new Map<InstrumentId, Promise<Tone.Sampler>>();

export function getInstrument(id: InstrumentId): Promise<Tone.Sampler> {
  let p = cache.get(id);
  if (!p) {
    const def = DEFS[id];
    p = new Promise<Tone.Sampler>((resolve, reject) => {
      const sampler = new Tone.Sampler({
        urls: Object.fromEntries(def.files.map((f) => [toneName(f), `${f}.mp3`])),
        baseUrl: def.baseUrl,
        release: def.release,
        volume: def.volume,
        onload: () => resolve(sampler),
        onerror: (err) => {
          cache.delete(id);
          reject(err);
        },
      }).toDestination();
    });
    cache.set(id, p);
  }
  return p;
}

/** Start downloading/decoding an instrument without waiting for it. */
export function preloadInstrument(id: InstrumentId): void {
  getInstrument(id).catch(() => {
    /* surfaced when actually played */
  });
}
