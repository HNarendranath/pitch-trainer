import Dexie from 'dexie';
import { db, type Attempt, type ModeProgress } from './db';
import type { ModeId } from '../exercises/modes';
import { levelReadiness, UNLOCK_WINDOW } from '../srs/mastery';
import { dayKey, startOfDay, streakLength } from '../srs/streak';

const DAY = 86_400_000;

export function defaultProgress(mode: ModeId): ModeProgress {
  return { mode, unlocked: 1, lastLevel: 1 };
}

export async function getProgress(mode: ModeId): Promise<ModeProgress> {
  return (await db.progress.get(mode)) ?? defaultProgress(mode);
}

export async function allProgress(): Promise<Map<ModeId, ModeProgress>> {
  const rows = await db.progress.toArray();
  return new Map(rows.map((r) => [r.mode, r]));
}

export async function setLastLevel(mode: ModeId, level: number): Promise<void> {
  await db.transaction('rw', db.progress, async () => {
    const p = await getProgress(mode);
    await db.progress.put({ ...p, lastLevel: level });
  });
}

/** This level's attempts, oldest first (most recent `limit`). */
export async function levelAttempts(mode: ModeId, level: number, limit = 200): Promise<Attempt[]> {
  const rows = await db.attempts
    .where('[mode+level+ts]')
    .between([mode, level, Dexie.minKey], [mode, level, Dexie.maxKey])
    .reverse()
    .limit(limit)
    .toArray();
  return rows.reverse();
}

export interface RecordResult {
  /** Set when this answer unlocked a new level. */
  unlocked?: number;
}

/**
 * Save an answer. If its level is now mastered, unlock the level after it
 * (capped at `maxLevel`). Any level can be practised, so mastering one above
 * your current level moves you straight up to it.
 */
export async function recordAttempt(a: Omit<Attempt, 'id'>, maxLevel: number): Promise<RecordResult> {
  return db.transaction('rw', db.attempts, db.progress, async () => {
    await db.attempts.add(a);
    const progress = await getProgress(a.mode);
    if (a.level < progress.unlocked) return {};
    const unlocked = Math.min(a.level + 1, maxLevel);
    if (unlocked <= progress.unlocked) return {};
    const recent = await levelAttempts(a.mode, a.level, UNLOCK_WINDOW);
    if (!levelReadiness(recent.map((r) => r.correct)).ready) return {};
    await db.progress.put({ ...progress, unlocked });
    return { unlocked };
  });
}

export async function answeredToday(now = Date.now()): Promise<number> {
  return db.attempts.where('ts').aboveOrEqual(startOfDay(now)).count();
}

export async function currentStreak(now = Date.now()): Promise<number> {
  const since = startOfDay(now) - 400 * DAY;
  const days = new Set<string>();
  await db.attempts
    .where('ts')
    .aboveOrEqual(since)
    .eachKey((ts) => {
      days.add(dayKey(ts as number));
    });
  return streakLength(days, now);
}

export interface ModeSummary {
  mode: ModeId;
  answers: number;
  /** Accuracy over the most recent answers (up to RECENT_FOR_STATS). */
  recentAccuracy: number;
  recentCount: number;
  lastTs: number;
}

export const RECENT_FOR_STATS = 50;

/** Per-exercise totals and recent accuracy, most recently practised first. */
export async function modeSummaries(): Promise<ModeSummary[]> {
  const byMode = new Map<ModeId, { answers: number; recent: boolean[]; lastTs: number }>();
  // Newest first, so the first RECENT_FOR_STATS seen per mode are the recent ones.
  await db.attempts
    .orderBy('ts')
    .reverse()
    .each((a) => {
      const m = byMode.get(a.mode) ?? { answers: 0, recent: [], lastTs: a.ts };
      m.answers++;
      if (m.recent.length < RECENT_FOR_STATS) m.recent.push(a.correct);
      byMode.set(a.mode, m);
    });
  return [...byMode.entries()]
    .map(([mode, m]) => ({
      mode,
      answers: m.answers,
      recentCount: m.recent.length,
      recentAccuracy: m.recent.filter(Boolean).length / m.recent.length,
      lastTs: m.lastTs,
    }))
    .sort((a, b) => b.lastTs - a.lastTs);
}
