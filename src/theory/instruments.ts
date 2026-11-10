// Instrument identities and playable ranges live in the pure layer so exercise
// definitions can choose instruments without importing the web audio engine.
import type { Midi } from './notes';

export type InstrumentId = 'piano' | 'guitar' | 'strings' | 'organ' | 'flute';

export interface InstrumentMeta {
  id: InstrumentId;
  name: string;
  /** Lowest and highest MIDI notes that sound natural on this instrument. */
  low: Midi;
  high: Midi;
}

export const INSTRUMENT_META: Record<InstrumentId, InstrumentMeta> = {
  piano: { id: 'piano', name: 'Piano', low: 24, high: 96 },
  guitar: { id: 'guitar', name: 'Acoustic guitar', low: 40, high: 76 },
  strings: { id: 'strings', name: 'Strings', low: 36, high: 96 },
  organ: { id: 'organ', name: 'Organ', low: 36, high: 86 },
  flute: { id: 'flute', name: 'Flute', low: 60, high: 96 },
};

export const INSTRUMENT_IDS = Object.keys(INSTRUMENT_META) as InstrumentId[];

export function instrumentCovers(id: InstrumentId, notes: readonly Midi[]): boolean {
  const m = INSTRUMENT_META[id];
  return notes.every((n) => n >= m.low && n <= m.high);
}

/** Instruments from `allowed` that can play every note; falls back to piano. */
export function instrumentsFor(notes: readonly Midi[], allowed: readonly InstrumentId[]): InstrumentId[] {
  const ok = allowed.filter((id) => instrumentCovers(id, notes));
  return ok.length > 0 ? ok : ['piano'];
}
