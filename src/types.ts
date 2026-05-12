/**
 * src/types.ts
 * Shared browser-side type definitions.
 * Redeclared (not imported) from scripts/types.ts to avoid cross-tsconfig-boundary imports.
 * Shape is the D-01 contract — do not add an `answers` field to PuzzleEntry.
 */

/** One puzzle entry stored in public/schedule.json */
export interface PuzzleEntry {
  /** Days since game epoch (2026-05-12 local midnight). Index 0 = first puzzle. */
  index: number;
  /** All 7 puzzle letters, uppercase, alphabetically sorted. E.g. ["A","B","C","D","E","F","G"] */
  letters: string[];
  /** The required center letter. Must appear in every valid submission. Uppercase. */
  centerLetter: string;
}

/** Root structure of public/schedule.json */
export interface Schedule {
  /** Game epoch ISO date — client uses this as the base for date-to-index calculation */
  epoch: string; // "2026-05-12"
  /** Seed used for deterministic shuffle — store for reproducibility */
  seed: number;
  /** Total count of puzzles */
  count: number;
  /** Puzzle entries ordered by index. puzzles[i].index === i is always true. */
  puzzles: PuzzleEntry[];
}

/** public/dictionary.json is a sorted JSON array of lowercase strings */
export type DictionaryFile = string[];
