/**
 * src/utils/stats.ts
 * Stats computation from persisted history.
 *
 * D-07: Streak increments if at least one word found (not completion required).
 * D-08: Missing a day resets streak; streak = consecutive days ending today OR yesterday.
 * D-09: Incomplete days (completed: false) count toward streak if foundCount > 0.
 * D-11: avgScore is a rounded integer.
 */

import type { HistoryEntry } from '../storage';

// ─── Local date helper ────────────────────────────────────────────────────────

function getLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Streak computation ───────────────────────────────────────────────────────

function computeStreak(history: HistoryEntry[]): number {
  if (history.length === 0) return 0;
  const todayStr = getLocalDateStr(new Date());
  // Pitfall 4: exclude future-dated entries before building the played-dates Set
  const playedDates = new Set(
    history.filter(e => e.date <= todayStr).map(e => e.date)
  );
  // D-08: start from today if played; otherwise try yesterday
  const startDate = playedDates.has(todayStr)
    ? todayStr
    : getLocalDateStr(new Date(Date.now() - 86400000));
  if (!playedDates.has(startDate)) return 0;
  const parts = startDate.split('-').map(Number);
  let cursor = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  let streak = 0;
  while (playedDates.has(getLocalDateStr(new Date(cursor)))) {
    streak++;
    cursor -= 86400000;
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
