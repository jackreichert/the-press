/**
 * src/utils/puzzle.ts
 * Bitmask word-validation utilities.
 * Copied verbatim from scripts/check-puzzles.ts (lines 27-102) and exported.
 * These functions are validated against 3,650 puzzles — do not rewrite.
 */

import type { PuzzleEntry } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAR_A = 'a'.charCodeAt(0);

// ─── Bitmask utilities ────────────────────────────────────────────────────────

/** Encode a lowercase word as a 26-bit integer. */
export function wordMask(word: string): number {
  let mask = 0;
  for (let i = 0; i < word.length; i++) {
    mask |= 1 << (word.charCodeAt(i) - CHAR_A);
  }
  return mask;
}

/** Build a puzzle bitmask from the letters array (uppercase in schedule.json). */
export function puzzleMaskFromLetters(letters: string[]): number {
  return letters.reduce(
    (m, l) => m | (1 << (l.toLowerCase().charCodeAt(0) - CHAR_A)),
    0
  );
}

/** Return true if a word is valid: all letters in puzzle set AND contains center letter. */
export function isValid(wm: number, puzzleMask: number, centerBit: number): boolean {
  return (wm & puzzleMask) === wm && (wm & centerBit) !== 0;
}

/** Return true if a word uses all 7 puzzle letters (pangram). */
export function isPangram(wm: number, puzzleMask: number): boolean {
  return (wm & puzzleMask) === puzzleMask;
}

// ─── Word derivation ──────────────────────────────────────────────────────────

export interface WordSet {
  words: string[];
  pangrams: string[];
}

/** Re-derive all valid words for a puzzle from the dictionary. */
export function deriveWordSet(puzzle: PuzzleEntry, dictWords: string[]): WordSet {
  const puzzleMask = puzzleMaskFromLetters(puzzle.letters);
  const centerBit = 1 << (puzzle.centerLetter.toLowerCase().charCodeAt(0) - CHAR_A);
  const words: string[] = [];
  const pangrams: string[] = [];
  for (const word of dictWords) {
    const wm = wordMask(word);
    if (isValid(wm, puzzleMask, centerBit)) {
      words.push(word);
      if (isPangram(wm, puzzleMask)) pangrams.push(word);
    }
  }
  return { words, pangrams };
}

/** Check if a found word is a pangram given the current puzzle. */
export function isFoundWordPangram(word: string, puzzle: PuzzleEntry): boolean {
  const pm = puzzleMaskFromLetters(puzzle.letters);
  return isPangram(wordMask(word), pm);
}
