/**
 * src/storage.ts
 * Centralised localStorage abstraction for The Press.
 *
 * D-01: All localStorage access routes through this module with try/catch and in-memory
 *       fallback. Safari private mode (pre-11) throws SecurityError on window.localStorage
 *       property access — the guard wraps BOTH the property access and setItem.
 * D-02: Stored values are Base64-obfuscated using TextEncoder/TextDecoder wrapped btoa/atob.
 *       Goal is "not immediately human-readable in DevTools" — not encryption.
 * D-03: Schema is versioned via v:1 field so future migrations can detect and upgrade stale data.
 *
 * No Phase 3 file calls window.localStorage directly — they all import from this module.
 */

// ─── Base64 helpers ───────────────────────────────────────────────────────────

/**
 * Encode a string to Base64 using TextEncoder (Unicode-safe).
 * Plain btoa() throws InvalidCharacterError for code points > 255 — this wrapper avoids that.
 */
function toBase64(str: string): string {
  return btoa(
    Array.from(new TextEncoder().encode(str), b => String.fromCodePoint(b)).join('')
  );
}

/**
 * Decode a Base64 string using TextDecoder (Unicode-safe).
 * Inverse of toBase64.
 */
function fromBase64(b64: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(b64), c => c.codePointAt(0)!)
  );
}

// ─── Storage availability ─────────────────────────────────────────────────────

/**
 * Detect whether localStorage is usable in the current browser context.
 * Wraps BOTH window.localStorage property access AND setItem in one try/catch to handle:
 * - Old Safari (pre-11) private mode: throws SecurityError on property access
 * - Modern quota-exceeded errors: throws on setItem
 * Runs once at module load.
 */
function detectLocalStorage(): boolean {
  try {
    const s = window.localStorage;   // old Safari throws SecurityError here
    s.setItem('__tp__', '1');
    s.removeItem('__tp__');
    return true;
  } catch {
    return false;
  }
}

const lsAvailable = detectLocalStorage();

/** In-memory fallback store used when localStorage is unavailable. */
const memStore = new Map<string, string>();

// ─── Low-level access ─────────────────────────────────────────────────────────

/** Module-private: read a raw string value from storage. Returns null if not found. */
function storageGet(key: string): string | null {
  try {
    return lsAvailable ? window.localStorage.getItem(key) : (memStore.get(key) ?? null);
  } catch {
    return memStore.get(key) ?? null;
  }
}

/** Module-private: write a raw string value to storage. Falls back to memStore on error. */
function storageSet(key: string, value: string): void {
  try {
    if (lsAvailable) window.localStorage.setItem(key, value);
    else memStore.set(key, value);
  } catch {
    memStore.set(key, value);
  }
}

// ─── Schema types ─────────────────────────────────────────────────────────────

/** Today's in-progress game state persisted to localStorage. D-04. */
export interface PersistedState {
  v: 1;
  puzzleIndex: number;
  foundWords: string[];
  score: number;
}

/** One completed (or partial) day's result. D-05. */
export interface HistoryEntry {
  date: string;        // "YYYY-MM-DD" local time
  score: number;
  rank: string;
  foundCount: number;
  totalCount: number;
  completed: boolean;
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  state:   'thepress_state_v1',
  history: 'thepress_history_v1',
} as const;

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Read today's in-progress state.
 * Returns null if storage is unavailable, the key is missing, schema version
 * does not match (D-03), or the stored data is corrupt.
 */
export function readState(): PersistedState | null {
  const raw = storageGet(STORAGE_KEYS.state);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(fromBase64(raw)) as PersistedState;
    if (parsed.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Write today's in-progress state.
 * Automatically adds the v:1 schema version field (D-03).
 */
export function saveState(data: Omit<PersistedState, 'v'>): void {
  storageSet(STORAGE_KEYS.state, toBase64(JSON.stringify({ v: 1, ...data })));
}

/**
 * Remove the in-progress state key from storage.
 * Called on new-day detection and after a completed game is written to history.
 */
export function clearState(): void {
  try {
    if (lsAvailable) window.localStorage.removeItem(STORAGE_KEYS.state);
    else memStore.delete(STORAGE_KEYS.state);
  } catch { /* noop */ }
}

/**
 * Read the full history array.
 * Returns an empty array if storage is unavailable, the key is missing, or data is corrupt.
 * Never throws.
 */
export function readHistory(): HistoryEntry[] {
  const raw = storageGet(STORAGE_KEYS.history);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(fromBase64(raw)) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Append one entry to the history array.
 * Reads current history, pushes the new entry, then writes the updated array.
 */
export function appendHistory(entry: HistoryEntry): void {
  const history = readHistory();
  history.push(entry);
  storageSet(STORAGE_KEYS.history, toBase64(JSON.stringify(history)));
}
