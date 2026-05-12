/**
 * check-puzzles.ts — Developer spot-check CLI for puzzle word quality review
 *
 * Loads public/dictionary.json and public/schedule.json, re-derives the valid
 * word set for each selected puzzle using bitmask logic, and pretty-prints the
 * preview to stdout. Answers are NOT stored in schedule.json (D-01); this tool
 * validates that the runtime derivation contract works correctly end-to-end.
 *
 * Usage:
 *   npm run puzzle:check -- 5           → print 5 random puzzle previews
 *   npm run puzzle:check -- --index 0   → print the puzzle at index 0
 *   npm run puzzle:check -- --index=42  → also accepted
 *
 * The `--` is required by npm to pass args through to the script.
 *
 * Threat mitigations:
 *   T-04-01: --index validated as non-negative integer (parseInt + isNaN + >= 0 check)
 *   T-04-02: count capped to 1–100 range to prevent stdout flooding
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { PuzzleEntry, Schedule, DictionaryFile } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAR_A = 'a'.charCodeAt(0);
const DEFAULT_COUNT = 5;
const MAX_COUNT = 100;

// ─── Bitmask utilities ────────────────────────────────────────────────────────

/**
 * Encode a lowercase word as a 26-bit integer.
 * Bit N is set if the letter at alphabet position N appears in the word.
 */
function wordMask(word: string): number {
  let mask = 0;
  for (let i = 0; i < word.length; i++) {
    mask |= 1 << (word.charCodeAt(i) - CHAR_A);
  }
  return mask;
}

/**
 * Build a puzzle bitmask from the letters array (uppercase in schedule.json).
 * Converts each letter to lowercase before computing bit position.
 */
function puzzleMaskFromLetters(letters: string[]): number {
  return letters.reduce(
    (m, l) => m | (1 << (l.toLowerCase().charCodeAt(0) - CHAR_A)),
    0
  );
}

/**
 * Return true if a word is valid for this puzzle:
 *   - All letters in the word are within the puzzle's letter set (wm subset of puzzleMask)
 *   - The word contains the center letter (centerBit set in wm)
 */
function isValid(wm: number, puzzleMask: number, centerBit: number): boolean {
  return (wm & puzzleMask) === wm && (wm & centerBit) !== 0;
}

/**
 * Return true if a word uses all 7 puzzle letters (pangram).
 */
function isPangram(wm: number, puzzleMask: number): boolean {
  return (wm & puzzleMask) === puzzleMask;
}

// ─── Word derivation ──────────────────────────────────────────────────────────

interface WordSet {
  words: string[];
  pangrams: string[];
}

/**
 * Re-derive all valid words for a puzzle from the dictionary.
 * This is the D-01 contract: answers are NOT stored in schedule.json;
 * they are always derived at runtime by applying bitmask logic against dictionary.json.
 */
function deriveWordSet(puzzle: PuzzleEntry, dictWords: string[]): WordSet {
  const puzzleMask = puzzleMaskFromLetters(puzzle.letters);
  const centerBit = 1 << (puzzle.centerLetter.toLowerCase().charCodeAt(0) - CHAR_A);

  const words: string[] = [];
  const pangrams: string[] = [];

  for (const word of dictWords) {
    const wm = wordMask(word);
    if (isValid(wm, puzzleMask, centerBit)) {
      words.push(word);
      if (isPangram(wm, puzzleMask)) {
        pangrams.push(word);
      }
    }
  }

  return { words, pangrams };
}

// ─── Display ─────────────────────────────────────────────────────────────────

/**
 * Print a formatted puzzle preview to stdout.
 * Groups words by length for readability.
 */
function printPuzzle(puzzle: PuzzleEntry, dictWords: string[]): void {
  const { words, pangrams } = deriveWordSet(puzzle, dictWords);

  console.log('');
  console.log(`=== Puzzle #${puzzle.index} ===`);
  console.log(`Letters:  [${puzzle.letters.join(', ')}]`);
  console.log(`Center:   ${puzzle.centerLetter}`);
  console.log(`Words:    ${words.length} total, ${pangrams.length} pangram(s)`);
  console.log(`Pangrams: ${pangrams.length > 0 ? pangrams.join(', ') : '(none)'}`);
  console.log('');

  // Group words by length and display in ascending length order
  const byLength = new Map<number, string[]>();
  for (const w of [...words].sort()) {
    const len = w.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len)!.push(w);
  }

  for (const [len, ws] of [...byLength.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${len}-letter: ${ws.join(', ')}`);
  }
}

// ─── Argument parsing ─────────────────────────────────────────────────────────

interface ParsedArgs {
  specificIndex: number | null;
  count: number;
}

/**
 * Parse process.argv for --index and count arguments.
 * Supports: --index=N, --index N, and a bare integer for count.
 * Returns null specificIndex if not specified; count defaults to DEFAULT_COUNT.
 */
function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // strip 'node' and script path

  // Detect --index in two forms: --index=N or --index N
  const indexFlagPos = args.findIndex((a) => a === '--index' || a.startsWith('--index='));
  let specificIndex: number | null = null;

  if (indexFlagPos !== -1) {
    const flag = args[indexFlagPos];
    const raw = flag.startsWith('--index=')
      ? flag.split('=')[1]
      : args[indexFlagPos + 1];

    const parsed = parseInt(raw ?? '', 10);
    if (isNaN(parsed) || parsed < 0) {
      console.error(`Error: --index must be a non-negative integer (got: ${raw ?? 'nothing'})`);
      process.exit(1);
    }
    specificIndex = parsed;
  }

  // Detect bare positive integer for count (first numeric-only arg, not part of --index)
  const countArg = args.find((a, i) => {
    if (/^\d+$/.test(a)) {
      // Skip if this integer is the value after --index
      if (indexFlagPos !== -1 && args[indexFlagPos] === '--index' && i === indexFlagPos + 1) {
        return false;
      }
      return true;
    }
    return false;
  });

  let count = DEFAULT_COUNT;
  if (countArg !== undefined) {
    const parsed = parseInt(countArg, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > MAX_COUNT) {
      console.error(`Error: count must be between 1 and ${MAX_COUNT} (got: ${countArg})`);
      process.exit(1);
    }
    count = parsed;
  }

  return { specificIndex, count };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function checkPuzzles(): Promise<void> {
  const { specificIndex, count } = parseArgs(process.argv);

  // Load dictionary and schedule in parallel
  const [dictRaw, schedRaw] = await Promise.all([
    readFile(join(process.cwd(), 'public', 'dictionary.json'), 'utf8'),
    readFile(join(process.cwd(), 'public', 'schedule.json'), 'utf8'),
  ]).catch((err: unknown) => {
    console.error(`Error loading data files: ${String(err)}`);
    console.error('Make sure to run `npm run pipeline` first to generate public/dictionary.json and public/schedule.json.');
    process.exit(1);
  }) as [string, string];

  const dictWords: DictionaryFile = JSON.parse(dictRaw);
  const schedule: Schedule = JSON.parse(schedRaw);

  console.log(`Loaded: ${dictWords.length} dictionary words, ${schedule.count} puzzles`);
  console.log(`Epoch: ${schedule.epoch} | Seed: ${schedule.seed}`);

  if (specificIndex !== null) {
    // Show the specific puzzle requested by --index
    const puzzle = schedule.puzzles.find((p) => p.index === specificIndex);
    if (!puzzle) {
      console.error(
        `Error: puzzle index ${specificIndex} not found. Schedule has indices 0–${schedule.puzzles.length - 1}.`
      );
      process.exit(1);
    }
    printPuzzle(puzzle, dictWords);
  } else {
    // Show N random puzzles, sorted by index for readability
    const shuffled = [...schedule.puzzles].sort(() => Math.random() - 0.5);
    const selected = shuffled
      .slice(0, Math.min(count, schedule.puzzles.length))
      .sort((a, b) => a.index - b.index);

    console.log(`\nShowing ${selected.length} random puzzles:`);
    for (const puzzle of selected) {
      printPuzzle(puzzle, dictWords);
    }
  }
}

checkPuzzles().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
