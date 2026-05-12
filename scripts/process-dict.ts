/**
 * process-dict.ts — Dictionary processor for The Press.
 *
 * Downloads ENABLE2K (gzip) from GitHub and SCOWL-60 from aspell.net,
 * filters both to valid 4-7 letter lowercase words, deduplicates, sorts,
 * and writes public/dictionary.json.
 *
 * Usage:
 *   npm run dict:build           — normal run (uses SCOWL-60 cache if present)
 *   npm run dict:build -- --refresh  — force re-download of SCOWL-60
 *
 * Why ENABLE2K for validation:
 *   ENABLE2K has no proper nouns by construction and no non-ASCII characters,
 *   making it a clean source of truth for runtime word validation. SCOWL-60
 *   includes proper nouns that would be impossible to filter cleanly.
 *
 * S-words are NOT excluded from dictionary.json. S exclusion applies only to
 * puzzle letter sets (generate-puzzles.ts). Players CAN submit words with S.
 */

import { promisify } from 'util';
import { gunzip } from 'zlib';
import { writeFile, readFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import type { DictionaryFile } from './types';

const gunzipAsync = promisify(gunzip);

const ENABLE2K_URL =
  'https://raw.githubusercontent.com/BartMassey/wordlists/main/enable2k.txt.gz';
const SCOWL60_URL =
  'https://app.aspell.net/create?max_size=60&spelling=US&max_variant=1&diacritic=strip&download=wordlist&encoding=utf-8&format=inline';
const SCOWL_CACHE = join(process.cwd(), 'data', 'scowl-60-raw.txt');

/**
 * Fetch a gzip-compressed URL and return lines as string[].
 * Throws on non-200 HTTP status.
 */
async function fetchGzip(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return (await gunzipAsync(buf)).toString('utf8').split('\n');
}

/**
 * Fetch a plain-text URL and return lines as string[].
 * Throws on non-200 HTTP status.
 */
async function fetchPlain(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return (await res.text()).split('\n');
}

/**
 * Normalize and filter word lines to valid lowercase alphabetic words.
 *
 * Removes:
 *   - Proper nouns (capital letters after lowercasing → filtered by /^[a-z]+$/)
 *   - Possessives and apostrophes (AA's → fails /^[a-z]+$/)
 *   - Words outside the 4-7 letter range
 *   - Blank lines and whitespace-only entries
 *
 * Does NOT remove words containing 's' — that filter is for puzzle generation only.
 */
function normalizeAndFilter(lines: string[], maxLen = 7): string[] {
  return lines
    .map(w => w.trim().normalize('NFC').toLowerCase())
    .filter(w => /^[a-z]+$/.test(w) && w.length >= 4 && w.length <= maxLen);
}

/**
 * Load SCOWL-60 word list, using a local cache to avoid repeated downloads.
 * Pass --refresh flag to force re-download and update cache.
 */
async function loadScowl60(): Promise<string[]> {
  const forceRefresh = process.argv.includes('--refresh');

  if (!forceRefresh) {
    try {
      await access(SCOWL_CACHE);
      console.log('SCOWL-60: using cached data/scowl-60-raw.txt');
      const cached = await readFile(SCOWL_CACHE, 'utf8');
      return cached.split('\n');
    } catch {
      // Cache miss — fall through to download
    }
  }

  console.log('SCOWL-60: downloading from aspell.net...');
  const lines = await fetchPlain(SCOWL60_URL);

  // Write raw text to cache for future runs
  await mkdir(join(process.cwd(), 'data'), { recursive: true });
  await writeFile(SCOWL_CACHE, lines.join('\n'), 'utf8');
  console.log('SCOWL-60: cached to data/scowl-60-raw.txt');

  return lines;
}

/**
 * Main entry point — builds and writes public/dictionary.json.
 *
 * Strategy:
 *   1. Download ENABLE2K (gzip) — the validation word set
 *   2. Download/cache SCOWL-60 — not used in dictionary.json, but cached here
 *      as a side effect so generate-puzzles.ts can use it without re-fetching
 *   3. Filter ENABLE2K to 4-7 letter lowercase words
 *   4. Deduplicate, sort alphabetically
 *   5. Write as compact JSON array to public/dictionary.json
 *
 * Note: SCOWL-60 is cached during dict:build as a convenience (Pitfall 7 mitigation),
 * but dictionary.json itself is derived solely from ENABLE2K. ENABLE2K is chosen
 * because it contains no proper nouns by construction and is the authoritative
 * validation source.
 */
async function buildDictionary(): Promise<void> {
  // Step 1: Fetch ENABLE2K (gzip-compressed)
  console.log('ENABLE2K: downloading...');
  const enable2kLines = await fetchGzip(ENABLE2K_URL);
  console.log(`ENABLE2K: ${enable2kLines.length} raw lines fetched`);

  // Step 2: Cache SCOWL-60 for downstream use by generate-puzzles.ts
  // SCOWL-60 is NOT used in dictionary.json — it's cached here as a convenience
  // so that running the full pipeline doesn't require a separate aspell.net download.
  await loadScowl60();

  // Step 3: Filter ENABLE2K — no S exclusion (dictionary.json must include S-words)
  const validationWords = normalizeAndFilter(enable2kLines, 7);

  // Step 4: Deduplicate and sort
  const sorted: DictionaryFile = [...new Set(validationWords)].sort();

  // Step 5: Write compact JSON (no pretty-printing for smaller file size)
  await mkdir(join(process.cwd(), 'public'), { recursive: true });
  await writeFile(
    join(process.cwd(), 'public', 'dictionary.json'),
    JSON.stringify(sorted),
    'utf8'
  );

  console.log(`dictionary.json: ${sorted.length} words`);
}

buildDictionary().catch(err => {
  console.error(err);
  process.exit(1);
});
