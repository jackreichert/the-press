/**
 * src/utils/date.ts
 * Local-midnight puzzle index calculator.
 *
 * CRITICAL: Do NOT use new Date('YYYY-MM-DD') — that parses as UTC midnight.
 * For users in UTC-N, UTC midnight is in the afternoon of the previous local day,
 * which produces the wrong puzzle index.
 * Always decompose the string and construct new Date(y, m-1, d) for local midnight.
 */

// ─── Date utilities ───────────────────────────────────────────────────────────

/**
 * Compute today's puzzle index from the game epoch string.
 * Both epoch and "today" are computed as local midnight to match the player's calendar date.
 *
 * @param epochDateStr - ISO date string from schedule.json, e.g. "2026-05-12"
 * @returns Days since epoch (0-based). Returns 0 if today is before epoch.
 */
export function getTodayPuzzleIndex(epochDateStr: string): number {
  const parts = epochDateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const epochMs = new Date(y, m - 1, d).getTime(); // local midnight of epoch date
  const todayMs = new Date().setHours(0, 0, 0, 0); // local midnight today
  return Math.max(0, Math.floor((todayMs - epochMs) / 86400000));
}
