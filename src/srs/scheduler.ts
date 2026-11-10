// Adaptive item selection. Pure: callers pass history in, get an item id out.
import type { Rand } from '../exercises/types';

export interface AttemptLite {
  item: string;
  answer: string;
  correct: boolean;
  /** Time from first hearing the question to answering. */
  ms: number;
}

export interface ItemHistory {
  /** Most recent results, oldest first, capped at RECENT. */
  results: boolean[];
  seen: number;
  avgMs: number;
}

export const RECENT = 8;
const SLOW_MS = 5000;

/** Fold chronological attempts into per-item recent history. */
export function buildHistory(attempts: readonly AttemptLite[]): Map<string, ItemHistory> {
  const map = new Map<string, ItemHistory & { totalMs: number }>();
  for (const a of attempts) {
    let h = map.get(a.item);
    if (!h) {
      h = { results: [], seen: 0, avgMs: 0, totalMs: 0 };
      map.set(a.item, h);
    }
    h.results.push(a.correct);
    if (h.results.length > RECENT) h.results.shift();
    h.seen++;
    h.totalMs += a.ms;
    h.avgMs = h.totalMs / h.seen;
  }
  return map;
}

/** item → (what it was mistaken for → count). */
export function buildConfusions(attempts: readonly AttemptLite[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const a of attempts) {
    if (a.correct) continue;
    let inner = map.get(a.item);
    if (!inner) map.set(a.item, (inner = new Map()));
    inner.set(a.answer, (inner.get(a.answer) ?? 0) + 1);
  }
  return map;
}

/**
 * How strongly an item should be favoured. Unseen and recently-missed items
 * weigh most; items answered right and quickly settle to a low floor (they
 * still come up, so they stay fresh).
 */
export function itemWeight(h: ItemHistory | undefined): number {
  if (!h || h.seen === 0) return 2.5;
  const acc = h.results.filter(Boolean).length / h.results.length;
  let w = 0.6 + 3 * (1 - acc);
  if (h.seen < 3) w += 1;
  if (h.avgMs > SLOW_MS) w += 0.4;
  return w;
}

export interface PickInput {
  items: readonly string[];
  history: Map<string, ItemHistory>;
  /** Item asked last; heavily down-weighted so it rarely repeats back to back. */
  last?: string;
  /**
   * After a mistake (A heard as B), B is offered next so the two are heard
   * close together.
   */
  followUp?: string;
  rand?: Rand;
}

export const FOLLOW_UP_CHANCE = 0.6;

export function pickNext({ items, history, last, followUp, rand = Math.random }: PickInput): string {
  if (items.length === 0) throw new Error('pickNext: no items');
  if (items.length === 1) return items[0]!;
  if (followUp && followUp !== last && items.includes(followUp) && rand() < FOLLOW_UP_CHANCE) return followUp;

  const weights = items.map((it) => itemWeight(history.get(it)) * (it === last ? 0.15 : 1));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r < 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
