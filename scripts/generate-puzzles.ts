/**
 * generate-puzzles.ts — Pangram-first bitmask puzzle generator
 *
 * Loads SCOWL-60 ∩ ENABLE2K words (no S, 4–7 letters), applies bitmask algorithm
 * to find all valid puzzle variants, filters against LDNOOBW blocklist, deterministically
 * shuffles with a seeded PRNG, selects 730 puzzles, and writes public/schedule.json.
 *
 * Usage:
 *   npm run puzzle:generate
 *   npm run puzzle:generate -- --seed=123
 *
 * Decisions from CONTEXT.md respected:
 *   D-01: letters only in schedule.json — no embedded answers
 *   D-02: epoch hardcoded as 2026-05-12
 *   D-03: 730 puzzles (2 years)
 *   D-05: 25 words minimum per puzzle
 *   D-06: LDNOOBW + scripts/blocklist.txt offensive word filter
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { PuzzleEntry, Schedule, PuzzleCandidate } from './types';

// ─── Constants ───────────────────────────────────────────────────────────────

const CHAR_A = 'a'.charCodeAt(0);
const LDNOOBW_URL =
  'https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en';
const EPOCH = '2026-05-12';
const TARGET_PUZZLES = 730;
const MIN_WORDS = 25;
const DEFAULT_SEED = 42;

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

/**
 * mulberry32 — fast, good-quality seeded PRNG.
 * Same seed always produces the same sequence (Pitfall 6 mitigation).
 */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Bitmask utilities ────────────────────────────────────────────────────────

/**
 * Encode a word as a 26-bit integer.
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
 * Hamming weight (count set bits) — faster than iterating.
 * Uses the standard 32-bit parallel reduction formula.
 */
function bitCount(n: number): number {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/**
 * Convert a bitmask back to an array of uppercase letters (alphabetically sorted).
 * letterMaskToArray(0b111) → ['A','B','C']
 */
function letterMaskToArray(mask: number): string[] {
  const letters: string[] = [];
  for (let bit = 0; bit < 26; bit++) {
    if (mask & (1 << bit)) {
      letters.push(String.fromCharCode(CHAR_A + bit).toUpperCase());
    }
  }
  return letters;
}

// ─── Word loading ─────────────────────────────────────────────────────────────

/**
 * Load SCOWL-60 ∩ ENABLE2K words for puzzle generation.
 *
 * - SCOWL-60 is the source of puzzle-quality words (from local cache written by process-dict.ts).
 * - ENABLE2K (dictionary.json) is used to intersect so all puzzle answers are submittable.
 * - S is excluded from puzzle letter sets (Pitfall 3 — S exclusion is for puzzle sets only).
 * - Length 4–7, all-lowercase-alpha only.
 */
async function loadPuzzleWords(): Promise<string[]> {
  const scowlRaw = await readFile(
    join(process.cwd(), 'data', 'scowl-60-raw.txt'),
    'utf8'
  );

  const scowlWords = scowlRaw
    .split('\n')
    .map((w) => w.trim().normalize('NFC').toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w) && w.length >= 4 && w.length <= 7)
    .filter((w) => !w.includes('s')); // S exclusion — puzzle letter sets only

  // Compute SCOWL-60 ∩ ENABLE2K: ensures every puzzle answer is submittable
  const dictRaw = await readFile(
    join(process.cwd(), 'public', 'dictionary.json'),
    'utf8'
  );
  const dictSet = new Set<string>(JSON.parse(dictRaw) as string[]);

  return scowlWords.filter((w) => dictSet.has(w));
}

// ─── Blocklist loading ────────────────────────────────────────────────────────

/**
 * Load offensive word blocklist from LDNOOBW (remote) + scripts/blocklist.txt (local).
 *
 * - Remote fetch failures log a warning and fall back to empty remote list (T-03-05 mitigation).
 * - Local file missing is handled gracefully (T-03-02 accepted risk).
 * - All entries validated with /^[a-z]+$/ (T-03-01 mitigation).
 */
async function loadBlocklist(): Promise<Set<string>> {
  const remotePromise = fetch(LDNOOBW_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`LDNOOBW fetch failed: HTTP ${r.status}`);
      return r.text();
    })
    .catch((err: unknown) => {
      console.warn(
        `Warning: Could not fetch LDNOOBW blocklist (${String(err)}). Using empty remote list.`
      );
      return '';
    });

  const localPromise = readFile(
    join(process.cwd(), 'scripts', 'blocklist.txt'),
    'utf8'
  ).catch(() => '');

  const [remote, local] = await Promise.all([remotePromise, localPromise]);

  const entries = [...remote.split('\n'), ...local.split('\n')]
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w)); // T-03-01: validate blocklist entries

  return new Set(entries);
}

// ─── Puzzle generation ────────────────────────────────────────────────────────

/**
 * Find all valid puzzle candidates using the pangram-first bitmask algorithm.
 *
 * Algorithm (RESEARCH.md Pattern 2):
 *   1. Pre-compute 26-bit bitmasks for all words.
 *   2. Extract distinct puzzle sets from pangram words (bitCount === 7).
 *   3. For each puzzle set, try each of its 7 letters as the center letter.
 *   4. Count valid words (all letters in set, contains center); reject if < MIN_WORDS.
 */
function findValidPuzzles(words: string[]): PuzzleCandidate[] {
  const wordMasks = words.map(wordMask);

  // Step 1: Distinct 7-letter puzzle sets from pangram words
  const distinctSets = Array.from(
    new Set(
      words
        .filter((_, i) => bitCount(wordMasks[i]) === 7) // exact 7 distinct letters
        .map((_, i) => wordMasks[i])
    )
  );

  const candidates: PuzzleCandidate[] = [];

  // Step 2: For each puzzle set, try each of its 7 letters as center
  for (const puzzleMask of distinctSets) {
    for (let bit = 0; bit < 26; bit++) {
      if (!(puzzleMask & (1 << bit))) continue;

      const centerBit = 1 << bit;
      let validCount = 0;

      for (let wi = 0; wi < wordMasks.length; wi++) {
        const wm = wordMasks[wi];
        if ((wm & puzzleMask) === wm && wm & centerBit) {
          validCount++;
        }
      }

      if (validCount < MIN_WORDS) continue; // D-05: reject if fewer than 25 words

      const letters = letterMaskToArray(puzzleMask);
      const centerLetter = String.fromCharCode(CHAR_A + bit).toUpperCase();
      candidates.push({ puzzleMask, centerBit, centerLetter, letters, wordCount: validCount });
    }
  }

  return candidates;
}

// ─── Blocklist filtering ──────────────────────────────────────────────────────

/**
 * Remove puzzle candidates whose valid word set contains a blocked word.
 * Recomputes valid words per candidate to apply the filter.
 */
function filterByBlocklist(
  candidates: PuzzleCandidate[],
  words: string[],
  wMasks: number[],
  blocklist: Set<string>
): PuzzleCandidate[] {
  return candidates.filter(({ puzzleMask, centerBit }) => {
    const puzzleWords = words.filter((_, i) => {
      const wm = wMasks[i];
      return (wm & puzzleMask) === wm && wm & centerBit;
    });
    return !puzzleWords.some((w) => blocklist.has(w));
  });
}

// ─── Deterministic shuffle (Fisher-Yates) ────────────────────────────────────

/**
 * In-place Fisher-Yates shuffle using a seeded PRNG.
 * Returns a new array; does not mutate the input.
 */
function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Entry point: generate 730 puzzles and write public/schedule.json.
 *
 * Validates the --seed=N CLI flag (T-03-04 mitigation: parsed as integer, NaN becomes DEFAULT_SEED).
 */
async function generatePuzzles(): Promise<void> {
  // Parse --seed=N CLI flag; validate as integer (T-03-04)
  const seedArg = process.argv.find((a) => a.startsWith('--seed='));
  const parsedSeed = seedArg ? parseInt(seedArg.split('=')[1], 10) : NaN;
  const seed = Number.isFinite(parsedSeed) && parsedSeed > 0 ? parsedSeed : DEFAULT_SEED;

  console.log('Loading puzzle words...');
  const words = await loadPuzzleWords();
  console.log(`Puzzle candidate pool: ${words.length} words (SCOWL-60 ∩ ENABLE2K, no S)`);

  console.log('Generating puzzle candidates...');
  const start = Date.now();
  const candidates = findValidPuzzles(words);
  console.log(`Found ${candidates.length} valid puzzle variants in ${Date.now() - start}ms`);

  console.log('Loading blocklist...');
  const blocklist = await loadBlocklist();
  console.log(`Blocklist: ${blocklist.size} entries`);

  const wMasks = words.map(wordMask);
  const clean = filterByBlocklist(candidates, words, wMasks, blocklist);
  console.log(`After blocklist filter: ${clean.length} clean puzzle variants`);

  if (clean.length < TARGET_PUZZLES) {
    throw new Error(
      `Not enough puzzles: ${clean.length} < ${TARGET_PUZZLES}. ` +
        `Check SCOWL-60 cache (data/scowl-60-raw.txt) and blocklist configuration.`
    );
  }

  // Sort by canonical key before shuffle → deterministic ordering (Pitfall 6 mitigation)
  const sorted = [...clean].sort((a, b) => {
    const ak = a.puzzleMask.toString(36) + '-' + a.centerBit.toString(36);
    const bk = b.puzzleMask.toString(36) + '-' + b.centerBit.toString(36);
    return ak.localeCompare(bk);
  });

  const rand = mulberry32(seed);
  const shuffled = shuffle(sorted, rand);
  const selected = shuffled.slice(0, TARGET_PUZZLES);

  const puzzles: PuzzleEntry[] = selected.map((c, i) => ({
    index: i,
    letters: c.letters,
    centerLetter: c.centerLetter,
  }));

  const schedule: Schedule = {
    epoch: EPOCH,
    seed,
    count: puzzles.length,
    puzzles,
  };

  await writeFile(
    join(process.cwd(), 'public', 'schedule.json'),
    JSON.stringify(schedule)
  );
  console.log(`schedule.json: ${puzzles.length} puzzles written (seed=${seed}, epoch=${EPOCH})`);
}

generatePuzzles().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
