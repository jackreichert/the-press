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

import type { PersistedState, HistoryEntry, PendingPuzzle } from './types';
// Re-export so existing consumers that import these types from storage still compile.
export type { PersistedState, HistoryEntry, PendingPuzzle } from './types';

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

// ─── Keys & versioning ────────────────────────────────────────────────────────

const SCHEMA_VERSION = 1 as const;

const STORAGE_KEYS = {
  state:   'thepress_state_v1',
  history: 'thepress_history_v1',
  pending: 'thepress_pending_v1',
} as const;

// ─── Storage adapter factory ──────────────────────────────────────────────────
// Each factory call returns a fresh adapter with its own in-memory fallback Map.
// This lets tests (or future isolated contexts) get completely independent storage
// without sharing the module-level state.
//
// Usage in tests:
//   const storage = createStorageAdapter();
//   storage.appendHistory(entry);
//   // ... assertions without touching module-level localStorage state

export interface StorageAdapter {
  readState(): PersistedState | null;
  saveState(data: Omit<PersistedState, 'v'>): void;
  clearState(): void;
  readHistory(): HistoryEntry[];
  appendHistory(entry: HistoryEntry): void;
  readPending(): PendingPuzzle | null;
  savePending(data: Omit<PendingPuzzle, 'v'>): void;
  clearPending(): void;
}

export function createStorageAdapter(): StorageAdapter {
  const mem = new Map<string, string>();

  function get(key: string): string | null {
    try { return lsAvailable ? window.localStorage.getItem(key) : (mem.get(key) ?? null); }
    catch { return mem.get(key) ?? null; }
  }
  function set(key: string, value: string): void {
    try { if (lsAvailable) window.localStorage.setItem(key, value); else mem.set(key, value); }
    catch { mem.set(key, value); }
  }
  function remove(key: string): void {
    try { if (lsAvailable) window.localStorage.removeItem(key); else mem.delete(key); }
    catch { mem.delete(key); }
  }

  const adapter: StorageAdapter = {
    readState(): PersistedState | null {
      const raw = get(STORAGE_KEYS.state);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(fromBase64(raw)) as PersistedState;
        return parsed.v === SCHEMA_VERSION ? parsed : null;
      } catch { return null; }
    },
    saveState(data: Omit<PersistedState, 'v'>): void {
      set(STORAGE_KEYS.state, toBase64(JSON.stringify({ v: SCHEMA_VERSION, ...data })));
    },
    clearState(): void { remove(STORAGE_KEYS.state); },

    readHistory(): HistoryEntry[] {
      const raw = get(STORAGE_KEYS.history);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(fromBase64(raw)) as HistoryEntry[];
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    },
    appendHistory(entry: HistoryEntry): void {
      const history = adapter.readHistory();
      history.push(entry);
      set(STORAGE_KEYS.history, toBase64(JSON.stringify(history)));
    },

    readPending(): PendingPuzzle | null {
      const raw = get(STORAGE_KEYS.pending);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(fromBase64(raw)) as PendingPuzzle;
        return parsed.v === SCHEMA_VERSION ? parsed : null;
      } catch { return null; }
    },
    savePending(data: Omit<PendingPuzzle, 'v'>): void {
      set(STORAGE_KEYS.pending, toBase64(JSON.stringify({ v: SCHEMA_VERSION, ...data })));
    },
    clearPending(): void { remove(STORAGE_KEYS.pending); },
  };
  return adapter;
}

// ─── Module-level default instance ───────────────────────────────────────────
// All app imports (readState, saveState, etc.) delegate here. No call-site changes.

const _default = createStorageAdapter();

export function readState(): PersistedState | null        { return _default.readState(); }
export function saveState(data: Omit<PersistedState, 'v'>): void { _default.saveState(data); }
export function clearState(): void                        { _default.clearState(); }
export function readHistory(): HistoryEntry[]             { return _default.readHistory(); }
export function appendHistory(entry: HistoryEntry): void  { _default.appendHistory(entry); }
export function readPending(): PendingPuzzle | null       { return _default.readPending(); }
export function savePending(data: Omit<PendingPuzzle, 'v'>): void { _default.savePending(data); }
export function clearPending(): void                      { _default.clearPending(); }
