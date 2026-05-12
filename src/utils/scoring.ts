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

const RANK_TIERS = [
  { name: 'Apprentice',   threshold: 2   },
  { name: 'Journeyman',   threshold: 5   },
  { name: 'Typesetter',   threshold: 8   },
  { name: 'Compositor',   threshold: 15  },
  { name: 'Pressman',     threshold: 25  },
  { name: 'Pressmaster',  threshold: 40  },
  { name: 'Editor',       threshold: 50  },
  { name: 'Chief Editor', threshold: 70  },
  { name: 'Publisher',    threshold: 100 },
] as const;

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
  current: number;  // current tier threshold (%)
  next: number;     // next tier threshold (%)
}

/**
 * Return the player's current rank name and tier thresholds for the progress bar.
 * Grand Colophon requires 100% score AND all words found.
 * Returns name '—' with current=0,next=0 when maxScore is 0 (dict not loaded).
 * D-15 threshold formula: Math.floor(score / maxScore * 100).
 */
export function getRank(
  score: number,
  maxScore: number,
  foundCount: number,
  totalCount: number,
): RankResult {
  if (maxScore === 0) return { name: '—', current: 0, next: 0 };
  if (score >= maxScore && foundCount === totalCount) {
    return { name: 'Grand Colophon', current: 100, next: 100 };
  }
  const pct = Math.floor((score / maxScore) * 100);
  let tierIdx = -1;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (pct >= RANK_TIERS[i].threshold) tierIdx = i;
  }
  if (tierIdx === -1) return { name: 'Apprentice', current: 0, next: RANK_TIERS[0].threshold };
  const tier = RANK_TIERS[tierIdx];
  const next = RANK_TIERS[tierIdx + 1]?.threshold ?? 100;
  return { name: tier.name, current: tier.threshold, next };
}

/**
 * Progress bar fill percentage toward next rank tier.
 * D-16 formula: (score_pct - currentTierThreshold) / (nextTierThreshold - currentTierThreshold) * 100
 * Returns 0 when maxScore === 0 (pre-dict-load guard).
 * Returns 100 when current === next (Grand Colophon).
 */
export function getProgressPct(
  score: number,
  maxScore: number,
  foundCount: number,
  totalCount: number,
): number {
  if (maxScore === 0) return 0;
  const rank = getRank(score, maxScore, foundCount, totalCount);
  if (rank.current === rank.next) return 100;
  const scorePct = Math.floor((score / maxScore) * 100);
  return Math.min(100, Math.max(0,
    ((scorePct - rank.current) / (rank.next - rank.current)) * 100
  ));
}
