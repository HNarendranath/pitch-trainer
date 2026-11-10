// Display names for every item of an exercise, across all its levels. Pure.
import type { ModeId } from './modes';
import { exerciseFor } from './registry';
import { itemLabel, SING_LEVELS } from './singing';

export interface ItemLabels {
  /** Items in the order the exercise shows them (fullest level first). */
  order: string[];
  short: (id: string) => string;
  long: (id: string) => string;
}

export function itemLabels(mode: ModeId): ItemLabels {
  const short = new Map<string, string>();
  const long = new Map<string, string>();
  const order: string[] = [];
  const add = (id: string, s: string, l: string) => {
    if (short.has(id)) return;
    short.set(id, s);
    long.set(id, l);
    order.push(id);
  };

  if (mode === 'singing') {
    // An interval sung up or down shares one id, so their stats combine.
    for (const level of SING_LEVELS) for (const id of level.items) add(id, itemLabel(level, id), itemLabel(level, id));
  }

  const def = exerciseFor(mode);
  if (def) {
    // The last level usually holds every item in display order.
    for (const level of [...def.levels].reverse()) for (const o of def.options(level)) add(o.id, o.label, o.sublabel ? `${o.label} (${o.sublabel})` : o.label);
  }
  return { order, short: (id) => short.get(id) ?? id, long: (id) => long.get(id) ?? id };
}
