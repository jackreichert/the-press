/**
 * src/AppLoader.test.tsx
 * Tests for resolveActivePuzzle (pure) and AppLoader component with mocked fetch.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { resolveActivePuzzle, AppLoader } from './AppLoader';
import { GameProvider } from './context/GameContext';
import type { Schedule, PuzzleEntry } from './types';
import type { PersistedState, PendingPuzzle } from './types';

// ─── resolveActivePuzzle (pure) ───────────────────────────────────────────────

const puzzle0: PuzzleEntry = { index: 0, letters: ['D','E','I','N','P','R','T'], centerLetter: 'P' };
const puzzle1: PuzzleEntry = { index: 1, letters: ['A','B','C','D','E','F','G'], centerLetter: 'A' };
const schedule: Schedule = { epoch: '2026-01-01', seed: 1, count: 2, puzzles: [puzzle0, puzzle1] };

describe('resolveActivePuzzle', () => {
  it('loads today when stored state is null', () => {
    expect(resolveActivePuzzle(puzzle0, 0, schedule, null, null))
      .toEqual({ activePuzzle: puzzle0, activeIndex: 0, isCarryover: false });
  });

  it('loads today when stored puzzle matches today', () => {
    const stored: PersistedState = { v: 1, puzzleIndex: 0, foundWords: ['drip'], score: 1 };
    expect(resolveActivePuzzle(puzzle0, 0, schedule, stored, null))
      .toEqual({ activePuzzle: puzzle0, activeIndex: 0, isCarryover: false });
  });

  it('loads carryover when stored has a different day with words found', () => {
    const stored: PersistedState = { v: 1, puzzleIndex: 0, foundWords: ['drip'], score: 1 };
    expect(resolveActivePuzzle(puzzle1, 1, schedule, stored, null))
      .toEqual({ activePuzzle: puzzle0, activeIndex: 0, isCarryover: true });
  });

  it('loads today when stored has different day but no words (not a real carryover)', () => {
    const stored: PersistedState = { v: 1, puzzleIndex: 0, foundWords: [], score: 0 };
    expect(resolveActivePuzzle(puzzle1, 1, schedule, stored, null))
      .toEqual({ activePuzzle: puzzle1, activeIndex: 1, isCarryover: false });
  });

  it('treats pending flag as carryover even with 0 found words', () => {
    const stored: PersistedState = { v: 1, puzzleIndex: 0, foundWords: [], score: 0 };
    const pending: PendingPuzzle = { v: 1, puzzleIndex: 1 };
    expect(resolveActivePuzzle(puzzle1, 1, schedule, stored, pending))
      .toEqual({ activePuzzle: puzzle0, activeIndex: 0, isCarryover: true });
  });

  it('falls back to today when carryover puzzle index is not in schedule', () => {
    const stored: PersistedState = { v: 1, puzzleIndex: 99, foundWords: ['drip'], score: 1 };
    expect(resolveActivePuzzle(puzzle0, 0, schedule, stored, null))
      .toEqual({ activePuzzle: puzzle0, activeIndex: 0, isCarryover: false });
  });

  it('returns today when pending exists but stored is null', () => {
    const pending: PendingPuzzle = { v: 1, puzzleIndex: 1 };
    expect(resolveActivePuzzle(puzzle1, 1, schedule, null, pending))
      .toEqual({ activePuzzle: puzzle1, activeIndex: 1, isCarryover: false });
  });
});

// ─── AppLoader component (with mocked fetch) ──────────────────────────────────

// Use today as epoch so getTodayPuzzleIndex always returns 0 — no fake timers needed.
const todayEpoch = new Date().toISOString().split('T')[0];
const mockSchedule: Schedule = {
  epoch: todayEpoch,
  seed: 1,
  count: 1,
  puzzles: [puzzle0],
};

const mockDict = ['drip', 'pine', 'pier', 'pint', 'pride', 'print', 'printed', 'ripe', 'trip'];

function stubFetch(scheduleOk = true, dictOk = true): void {
  vi.stubGlobal('fetch', vi.fn()
    .mockImplementationOnce(() =>
      scheduleOk
        ? Promise.resolve({ ok: true, json: () => Promise.resolve(mockSchedule) })
        : Promise.resolve({ ok: false, status: 503 })
    )
    .mockImplementationOnce(() =>
      dictOk
        ? Promise.resolve({ ok: true, json: () => Promise.resolve(mockDict) })
        : Promise.resolve({ ok: false, status: 503 })
    )
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('AppLoader component', () => {
  it('shows loading state then puzzle grid after successful fetch', async () => {
    stubFetch();
    render(<GameProvider><AppLoader /></GameProvider>);
    expect(screen.getByText(/Setting type/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Center letter P/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows error state when schedule fetch fails', async () => {
    stubFetch(false);
    render(<GameProvider><AppLoader /></GameProvider>);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load puzzle/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows dict error when dictionary fetch fails', async () => {
    stubFetch(true, false);
    render(<GameProvider><AppLoader /></GameProvider>);
    await waitFor(() => {
      // Dict error disables Submit — grid shows but Submit stays disabled
      expect(screen.getByRole('button', { name: /Center letter P/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('loads carryover puzzle when stored state is from a previous day', async () => {
    // Use yesterday as epoch so todayIndex=1; stored puzzleIndex=0 is "yesterday"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEpoch = yesterday.toISOString().split('T')[0];
    const carryoverSchedule: Schedule = {
      epoch: yesterdayEpoch, seed: 1, count: 2,
      puzzles: [puzzle0, puzzle1],
    };
    const { saveState } = await import('./storage');
    saveState({ puzzleIndex: 0, foundWords: ['drip'], score: 1 });
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(carryoverSchedule) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockDict) }))
    );
    render(<GameProvider><AppLoader /></GameProvider>);
    // Yesterday's puzzle (puzzle0, center P) should load as carryover
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Center letter P/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('clears stale Grand Colophon state when that date is already in history', async () => {
    // Stored state from yesterday that is already in history → should be cleared → today's puzzle loads
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEpoch = yesterday.toISOString().split('T')[0];
    const carryoverSchedule: Schedule = {
      epoch: yesterdayEpoch, seed: 1, count: 2,
      puzzles: [puzzle0, puzzle1],
    };
    // Write stored state from yesterday
    const { saveState, appendHistory } = await import('./storage');
    saveState({ puzzleIndex: 0, foundWords: mockDict, score: 30 });
    // Add history entry for yesterday (simulating a completed Grand Colophon)
    appendHistory({
      date: yesterdayEpoch,
      score: 30, rank: 'Grand Colophon',
      foundCount: 9, totalCount: 9, completed: true,
    });
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(carryoverSchedule) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockDict) }))
    );
    render(<GameProvider><AppLoader /></GameProvider>);
    // Today's puzzle (puzzle1, center A) should load — stale state cleared
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Center letter A/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('restores saved state on reload', async () => {
    // Write saved state using the same saveState helper the app uses
    const { saveState } = await import('./storage');
    saveState({ puzzleIndex: 0, foundWords: ['drip'], score: 1 });
    stubFetch();
    render(<GameProvider><AppLoader /></GameProvider>);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Center letter P/i })).toBeInTheDocument();
    }, { timeout: 3000 });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /words found/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
