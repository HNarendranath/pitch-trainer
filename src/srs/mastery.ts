// When a level counts as mastered, unlocking the next one. Pure.

export const UNLOCK_WINDOW = 20;
export const UNLOCK_ACCURACY = 0.85;

export interface Readiness {
  /** Answers counted (at most UNLOCK_WINDOW). */
  counted: number;
  /** Accuracy over the counted answers, 0–1 (0 when none). */
  accuracy: number;
  ready: boolean;
}

/** `results` are this level's answers in chronological order. */
export function levelReadiness(results: readonly boolean[]): Readiness {
  const recent = results.slice(-UNLOCK_WINDOW);
  const counted = recent.length;
  const accuracy = counted === 0 ? 0 : recent.filter(Boolean).length / counted;
  return { counted, accuracy, ready: counted >= UNLOCK_WINDOW && accuracy >= UNLOCK_ACCURACY };
}

/** Plain-language progress line for the summary and level list. */
export function readinessText(r: Readiness): string {
  const pct = Math.round(r.accuracy * 100);
  if (r.ready) return `${pct}% over your last ${UNLOCK_WINDOW}. Next level unlocked.`;
  if (r.counted < UNLOCK_WINDOW) {
    return `${r.counted} of ${UNLOCK_WINDOW} answers so far. Reach ${UNLOCK_ACCURACY * 100}% over ${UNLOCK_WINDOW} to unlock the next level.`;
  }
  return `${pct}% over your last ${UNLOCK_WINDOW}. Reach ${UNLOCK_ACCURACY * 100}% to unlock the next level.`;
}
