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
 * CRITICAL: Do NOT use new Date(dateStr) — that parses as UTC midnight, giving wrong local date.
 * Decompose the string and construct new Date(y, m-1, d) so we always get local midnight.
 *
 * @param dateStr - ISO date string "YYYY-MM-DD"
 * @returns Milliseconds since Unix epoch at local midnight of that date.
 */
function localMidnightMs(dateStr: string): number {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  return new Date(y, m - 1, d).getTime();
}

/**
 * Formats a Date object to "YYYY-MM-DD" using local calendar date.
 */
export function getLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute today's puzzle index from the game epoch string.
 * Both epoch and "today" are computed as local midnight to match the player's calendar date.
 *
 * @param epochDateStr - ISO date string from schedule.json, e.g. "2026-05-12"
 * @returns Days since epoch (0-based). Returns 0 if today is before epoch.
 */
export function getTodayPuzzleIndex(epochDateStr: string): number {
  const epochMs = localMidnightMs(epochDateStr);
  const todayMs = new Date().setHours(0, 0, 0, 0); // local midnight today
  return Math.max(0, Math.floor((todayMs - epochMs) / 86400000));
}

/**
 * Derive the calendar date string "YYYY-MM-DD" for a puzzle.
 * Uses local-midnight construction — avoids UTC offset issues.
 * CRITICAL: Do NOT use new Date(epochDateStr) — UTC parsing gives wrong local date.
 *
 * @param epochDateStr - "YYYY-MM-DD" epoch from schedule.json (e.g. "2026-05-12")
 * @param puzzleIndex  - 0-based index from PuzzleEntry.index
 */
export function getPuzzleDateStr(epochDateStr: string, puzzleIndex: number): string {
  const epochMs = localMidnightMs(epochDateStr);
  const puzzleMs = epochMs + puzzleIndex * 86400000;
  return getLocalDateStr(new Date(puzzleMs));
}
