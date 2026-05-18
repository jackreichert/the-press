/**
 * src/utils/stats.ts
 * Stats computation from persisted history.
 *
 * D-07: Streak increments if at least one word found (not completion required).
 * D-08: Missing a day resets streak; streak = consecutive days ending today OR yesterday.
 * D-09: Incomplete days (completed: false) count toward streak if foundCount > 0.
 * D-11: avgScore is a rounded integer.
 */

import type { HistoryEntry } from '../types';
import { getLocalDateStr } from './date';

// ─── Streak computation ───────────────────────────────────────────────────────

function computeStreak(history: HistoryEntry[]): number {
  if (history.length === 0) return 0;
  const todayStr = getLocalDateStr(new Date());
  // Pitfall 4: exclude future-dated entries before building the played-dates Set
  const playedDates = new Set(
    history.filter(e => e.date <= todayStr).map(e => e.date)
  );
  // D-08: start from today if played; otherwise try yesterday.
  // Use local calendar arithmetic (not ms subtraction) to avoid DST boundary errors.
  const yesterday = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  })();
  const startDate = playedDates.has(todayStr)
    ? todayStr
    : getLocalDateStr(yesterday);
  if (!playedDates.has(startDate)) return 0;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  let cursorDate = new Date(sy, sm - 1, sd);
  let streak = 0;
  while (playedDates.has(getLocalDateStr(cursorDate))) {
    streak++;
    cursorDate = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate() - 1);
  }
  return streak;
}

// ─── Stats result ─────────────────────────────────────────────────────────────

export interface StatsResult {
  streak: number;
  gamesPlayed: number;
  avgScore: number;
}

// ─── computeStats ─────────────────────────────────────────────────────────────

/**
 * Derive streak, games played, and average score from persisted history.
 * Empty history returns { streak: 0, gamesPlayed: 0, avgScore: 0 } without throwing.
 */
export function computeStats(history: HistoryEntry[]): StatsResult {
  if (history.length === 0) return { streak: 0, gamesPlayed: 0, avgScore: 0 };
  const gamesPlayed = history.length;
  const avgScore = Math.round(history.reduce((s, e) => s + e.score, 0) / gamesPlayed);
  const streak = computeStreak(history);
  return { streak, gamesPlayed, avgScore };
}
