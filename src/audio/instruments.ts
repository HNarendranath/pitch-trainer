import * as Tone from 'tone';

export type InstrumentId = 'piano';

interface InstrumentDef {
  id: InstrumentId;
  name: string;
  baseUrl: string;
  /** Tone note name → file name. Tone pitch-shifts to fill the gaps. */
  urls: Record<string, string>;
  release: number;
}

/** Salamander samples are recorded every minor third (C, D#, F#, A). */
function minorThirdSet(lowOct: number, highOct: number, extra: string[] = []): Record<string, string> {
  const map: Record<string, string> = {};
  for (let o = lowOct; o <= highOct; o++) {
    for (const [note, file] of [['C', 'C'], ['D#', 'Ds'], ['F#', 'Fs'], ['A', 'A']] as const) {
      map[`${note}${o}`] = `${file}${o}.mp3`;
    }
  }
  for (const n of extra) map[n] = `${n}.mp3`;
  return map;
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentDef> = {
  piano: {
    id: 'piano',
    name: 'Piano',
    baseUrl: '/samples/piano/',
    urls: minorThirdSet(1, 6, ['C7']),
    release: 1.2,
  },
};

const cache = new Map<InstrumentId, Promise<Tone.Sampler>>();

export function getInstrument(id: InstrumentId): Promise<Tone.Sampler> {
  let p = cache.get(id);
  if (!p) {
    const def = INSTRUMENTS[id];
    p = new Promise<Tone.Sampler>((resolve, reject) => {
      const sampler = new Tone.Sampler({
        urls: def.urls,
        baseUrl: def.baseUrl,
        release: def.release,
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
