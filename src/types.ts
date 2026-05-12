/**
 * src/types.ts
 * Browser-side type definitions for The Press game.
 *
 * These mirror scripts/types.ts. Redeclared (not imported) because
 * tsconfig.app.json and tsconfig.node.json are separate compilation units.
 * If scripts/types.ts changes, update this file to match.
 */

// ─── Puzzle Contract ──────────────────────────────────────────────────────────

/** One puzzle entry as stored in public/schedule.json */
export interface PuzzleEntry {
  /** Days since game epoch (2026-05-12 local midnight). Index 0 = first puzzle. */
  index: number;
  /** All 7 puzzle letters, uppercase, alphabetically sorted. */
  letters: string[];
  /** The required center letter. Must appear in every valid submission. Uppercase. */
  centerLetter: string;
}

/** Root structure of public/schedule.json */
export interface Schedule {
  /** Game epoch ISO date string — client uses this for date-to-index calculation */
  epoch: string; // "2026-05-12"
  /** Seed used for deterministic shuffle */
  seed: number;
  /** Total count of puzzles */
  count: number;
  /** Puzzle entries ordered by index. puzzles[i].index === i is always true. */
  puzzles: PuzzleEntry[];
}

/** public/dictionary.json is a sorted JSON array of lowercase strings */
export type DictionaryFile = string[];
