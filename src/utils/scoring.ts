/**
 * src/utils/scoring.ts
 * Score computation, rank lookup, and progress bar percentage.
 * D-14: max score computed from full derived word set.
 * D-15: 10 rank tiers with exact thresholds.
 * D-16: progress bar fill formula.
 */

import type { PuzzleEntry } from '../types';
import { puzzleMaskFromLetters, wordMask, isPangram } from './puzzle';

// ─── Rank tiers ───────────────────────────────────────────────────────────────
// Use `as const` — enum is forbidden by erasableSyntaxOnly in tsconfig.app.json

export const RANK_TIERS = [
  { name: "Printer's Devil", threshold: 0  },
  { name: 'Apprentice',      threshold: 2  },
  { name: 'Journeyman',      threshold: 5  },
  { name: 'Typesetter',      threshold: 22 },
  { name: 'Editor',          threshold: 35 },
  { name: 'Wordsmith',       threshold: 50 },
  { name: 'Novelist',        threshold: 68 },
  { name: 'Laureate',        threshold: 89 },
] as const;

/** Exported rank name constants — use these instead of string literals for comparisons. */
export const RANK = {
  PRINTERS_DEVIL: "Printer's Devil",
  APPRENTICE:     'Apprentice',
  JOURNEYMAN:     'Journeyman',
  TYPESETTER:     'Typesetter',
  EDITOR:         'Editor',
  WORDSMITH:      'Wordsmith',
  NOVELIST:       'Novelist',
  LAUREATE:       'Laureate',
  GRAND_COLOPHON: 'Grand Colophon',
  UNRANKED:       '—',
} as const;

export type RankName = typeof RANK[keyof typeof RANK];

/** Percentage threshold at which the player reaches Laureate rank. */
export const LAUREATE_THRESHOLD_PCT = 89;

// ─── Scoring formulas ─────────────────────────────────────────────────────────

/**
 * Score one word: 4-letter = 1pt; 5+-letter = word length; pangram = score + 7.
 * D-14 scoring formula.
 */
export function scoreWord(word: string, isPangramWord: boolean): number {
  const base = word.length === 4 ? 1 : word.length;
  return isPangramWord ? base + 7 : base;
}

/**
 * Compute the maximum possible score for a puzzle by scoring all valid words.
 * Called once in DICT_LOADED action; result stored as state.maxScore.
 */
export function computeMaxScore(allWords: string[], puzzle: PuzzleEntry): number {
  const puzzleMask = puzzleMaskFromLetters(puzzle.letters);
  return allWords.reduce((sum, w) => {
    const wm = wordMask(w);
    return sum + scoreWord(w, isPangram(wm, puzzleMask));
  }, 0);
}

// ─── Rank computation ─────────────────────────────────────────────────────────

export interface RankResult {
  name: string;
  current: number;   // current tier threshold (%)
  next: number;      // next tier threshold (%)
  nextName: string;  // name of the next tier
}

/**
 * Return the player's current rank name and tier thresholds for the progress bar.
 * Editor in Chief is the top rank. Grand Colophon is not surfaced in the UI.
 * Returns name '—' with current=0,next=0 when maxScore is 0 (dict not loaded).
 * D-15 threshold formula: Math.floor(score / maxScore * 100).
 */
export function getRank(score: number, maxScore: number): RankResult {
  if (maxScore === 0 || score === 0) return { name: '—', current: 0, next: 0, nextName: '' };
  const pct = Math.floor((score / maxScore) * 100);
  let tierIdx = -1;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (pct >= RANK_TIERS[i].threshold) tierIdx = i;
  }
  if (tierIdx === -1) return { name: RANK_TIERS[0].name, current: 0, next: RANK_TIERS[0].threshold, nextName: RANK_TIERS[0].name };
  const tier = RANK_TIERS[tierIdx];
  const nextTier = RANK_TIERS[tierIdx + 1];
  return { name: tier.name, current: tier.threshold, next: nextTier?.threshold ?? 100, nextName: nextTier?.name ?? '' };
}

/**
 * Progress bar fill: overall score as a percentage of max score (0–100).
 * Within-tier formula was discarded — first tier spans only 2% of max score,
 * making the bar jump to 50% after earning just 1% of total score.
 * The rank name already communicates tier; the bar shows raw completion progress.
 */
export function getProgressPct(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((score / maxScore) * 100)));
}

/** Point threshold for each rank tier, computed from maxScore. */
export function getRankLadder(maxScore: number): { name: string; pts: number }[] {
  return RANK_TIERS.map(t => ({
    name: t.name,
    pts: Math.max(1, Math.ceil((t.threshold / 100) * maxScore)),
  }));
}
