import { readState, saveState, clearState, readHistory, appendHistory, readPending, savePending, clearPending } from './storage';
import type { HistoryEntry } from './storage';

// Note: localStorage.clear() is called in beforeEach by src/test/setup.ts (D-08)
// so each test starts with clean storage — no explicit beforeEach needed here

describe('saveState / readState round-trip', () => {
  it('returns null when nothing saved', () => {
    expect(readState()).toBeNull();
  });

  it('persists and restores exact state data', () => {
    saveState({ puzzleIndex: 3, foundWords: ['print', 'pine'], score: 6 });
    const s = readState();
    expect(s).toEqual({ v: 1, puzzleIndex: 3, foundWords: ['print', 'pine'], score: 6 });
  });

  it('saveState automatically adds v:1 schema version field', () => {
    saveState({ puzzleIndex: 0, foundWords: [], score: 0 });
    expect(readState()?.v).toBe(1);
  });

  it('returns null after clearState', () => {
    saveState({ puzzleIndex: 3, foundWords: ['print'], score: 5 });
    clearState();
    expect(readState()).toBeNull();
  });

  it('returns null for wrong schema version (v:2)', () => {
    // Write a v:2 payload manually using the same Base64 encoding that storage.ts uses
    const payload = JSON.stringify({ v: 2, puzzleIndex: 0 });
    const encoded = btoa(
      Array.from(new TextEncoder().encode(payload), b => String.fromCodePoint(b)).join('')
    );
    localStorage.setItem('thepress_state_v1', encoded);
    expect(readState()).toBeNull();
  });

  it('returns null for corrupt Base64 string', () => {
    localStorage.setItem('thepress_state_v1', 'not-valid-base64!!!');
    expect(readState()).toBeNull();
  });

  it('overwrites previous state on second saveState call', () => {
    saveState({ puzzleIndex: 0, foundWords: ['drip'], score: 1 });
    saveState({ puzzleIndex: 0, foundWords: ['drip', 'pine'], score: 2 });
    const s = readState();
    expect(s?.foundWords).toEqual(['drip', 'pine']);
    expect(s?.score).toBe(2);
  });
});

describe('appendHistory / readHistory', () => {
  const makeEntry = (date: string): HistoryEntry => ({
    date,
    score: 30,
    rank: 'Grand Colophon',
    foundCount: 9,
    totalCount: 9,
    completed: true,
  });

  it('returns empty array when nothing saved', () => {
    expect(readHistory()).toEqual([]);
  });

  it('appends and reads back a single entry', () => {
    const entry = makeEntry('2026-05-15');
    appendHistory(entry);
    expect(readHistory()).toEqual([entry]);
  });

  it('accumulates multiple entries in insertion order', () => {
    appendHistory(makeEntry('2026-05-13'));
    appendHistory(makeEntry('2026-05-14'));
    appendHistory(makeEntry('2026-05-15'));
    const history = readHistory();
    expect(history).toHaveLength(3);
    expect(history[0].date).toBe('2026-05-13');
    expect(history[2].date).toBe('2026-05-15');
  });

  it('readHistory returns empty array for corrupt Base64 data', () => {
    localStorage.setItem('thepress_history_v1', 'CORRUPTED!!!');
    expect(readHistory()).toEqual([]);
  });
});

describe('clearState', () => {
  it('is safe to call when nothing is saved (no error thrown)', () => {
    expect(() => clearState()).not.toThrow();
  });
});

describe('savePending / readPending / clearPending', () => {
  it('returns null when nothing saved', () => {
    expect(readPending()).toBeNull();
  });

  it('persists and restores puzzle index', () => {
    savePending({ puzzleIndex: 5 });
    const p = readPending();
    expect(p).toEqual({ v: 1, puzzleIndex: 5 });
  });

  it('returns null after clearPending', () => {
    savePending({ puzzleIndex: 5 });
    clearPending();
    expect(readPending()).toBeNull();
  });

  it('clearPending is safe when nothing saved', () => {
    expect(() => clearPending()).not.toThrow();
  });

  it('returns null for corrupt data', () => {
    localStorage.setItem('thepress_pending_v1', 'CORRUPTED!!!');
    expect(readPending()).toBeNull();
  });
});
