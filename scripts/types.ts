/**
 * Shared TypeScript types for the data pipeline scripts.
 * All three scripts (process-dict.ts, generate-puzzles.ts, check-puzzles.ts) import from here.
 *
 * IMPORTANT: PuzzleEntry shape is the D-01 contract.
 * The game client (Phase 2) depends on this exact structure.
 * Do not add an `answers` field — answers are derived at runtime from dictionary.json.
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

/**
 * Internal puzzle candidate — used during generation, not written to disk.
 * After blocklist filtering and selection, candidates become PuzzleEntry values.
 */
export interface PuzzleCandidate {
  /** Bitmask of the 7 puzzle letters (26-bit, bit N set = letter at alphabet position N present) */
  puzzleMask: number;
  /** Bitmask of the center letter only (single bit set) */
  centerBit: number;
  /** Center letter, uppercase */
  centerLetter: string;
  /** All 7 puzzle letters uppercase, alphabetically sorted — stored in PuzzleEntry.letters */
  letters: string[];
  /** Number of valid words for this puzzle variant. Must be >= 25 (D-05). */
  wordCount: number;
}
