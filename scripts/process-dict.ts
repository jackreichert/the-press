/**
 * process-dict.ts — Dictionary processor for The Press.
 *
 * Builds public/dictionary.json from the intersection of:
 *   - SCOWL-60 (max_proper=0): explicitly excludes proper nouns
 *   - ENABLE2K: independently curated, no proper nouns by construction
 *
 * Using the intersection gives us SCOWL's explicit proper-noun gate AND
 * ENABLE2K's independent curation. Words that slip through one list's
 * gaps (e.g. genericised acronyms like "deet") are caught by the other.
 *
 * Usage:
 *   npm run dict:build             — normal run (uses cache if present)
 *   npm run dict:build -- --refresh  — force re-download of both sources
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

// max_proper=0 explicitly excludes proper nouns from the SCOWL word list
const SCOWL_URL =
  'https://app.aspell.net/create?max_size=60&spelling=US&max_variant=1&diacritic=strip&max_proper=0&download=wordlist&encoding=utf-8&format=inline';

const SCOWL_CACHE = join(process.cwd(), 'data', 'scowl-60-no-proper.txt');

async function fetchGzip(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return (await gunzipAsync(buf)).toString('utf8').split('\n');
}

async function fetchPlain(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return (await res.text()).split('\n');
}

/**
 * Normalize and filter word lines to valid lowercase alphabetic words.
 * Removes proper nouns (capitals), possessives, out-of-range lengths, blanks.
 */
function normalizeAndFilter(lines: string[], maxLen = 15): Set<string> {
  return new Set(
    lines
      .map(w => w.trim().normalize('NFC').toLowerCase())
      .filter(w => /^[a-z]+$/.test(w) && w.length >= 4 && w.length <= maxLen)
  );
}

async function loadScowl(): Promise<string[]> {
  const forceRefresh = process.argv.includes('--refresh');

  if (!forceRefresh) {
    try {
      await access(SCOWL_CACHE);
      console.log('SCOWL-60 (no proper): using cache');
      return (await readFile(SCOWL_CACHE, 'utf8')).split('\n');
    } catch {
      // cache miss — fall through
    }
  }

  console.log('SCOWL-60 (no proper): downloading from aspell.net...');
  const lines = await fetchPlain(SCOWL_URL);
  await mkdir(join(process.cwd(), 'data'), { recursive: true });
  await writeFile(SCOWL_CACHE, lines.join('\n'), 'utf8');
  console.log('SCOWL-60 (no proper): cached to data/scowl-60-no-proper.txt');
  return lines;
}

async function buildDictionary(): Promise<void> {
  // Step 1: fetch both sources in parallel
  console.log('Fetching ENABLE2K and SCOWL-60 (no proper)...');
  const [enable2kLines, scowlLines] = await Promise.all([
    fetchGzip(ENABLE2K_URL),
    loadScowl(),
  ]);
  console.log(`ENABLE2K: ${enable2kLines.length} raw lines`);
  console.log(`SCOWL-60: ${scowlLines.length} raw lines`);

  // Step 2: filter each to clean 4-15 letter lowercase sets
  const enable2kSet = normalizeAndFilter(enable2kLines);
  const scowlSet    = normalizeAndFilter(scowlLines);

  // Step 3: intersect — word must appear in both lists
  const intersection = [...enable2kSet].filter(w => scowlSet.has(w));
  console.log(`ENABLE2K: ${enable2kSet.size} filtered words`);
  console.log(`SCOWL-60: ${scowlSet.size} filtered words`);
  console.log(`Intersection: ${intersection.length} words`);

  // Step 4: sort and write
  const sorted: DictionaryFile = intersection.sort();
  await mkdir(join(process.cwd(), 'public'), { recursive: true });
  await writeFile(
    join(process.cwd(), 'public', 'dictionary.json'),
    JSON.stringify(sorted),
    'utf8'
  );

  console.log(`dictionary.json: ${sorted.length} words written`);
}

buildDictionary().catch(err => {
  console.error(err);
  process.exit(1);
});
