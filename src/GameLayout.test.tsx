/**
 * src/GameLayout.test.tsx
 * Unit tests for GameLayout — buildHistoryEntry pure function and component rendering.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame, PUZZLE_LOADED, DICT_LOADED, TEST_WORDS, SCHEDULE_LOADED } from './test/helpers';
import { buildHistoryEntry, GameLayout } from './GameLayout';
import { RANK } from './utils/scoring';
import type { PuzzleEntry } from './types';

const TEST_PUZZLE: PuzzleEntry = {
  index: 0,
  letters: ['D','E','I','N','P','R','T'],
  centerLetter: 'P',
};

const EPOCH = '2026-01-01';

// ─── buildHistoryEntry ────────────────────────────────────────────────────────

describe('buildHistoryEntry', () => {
  const base = { allWords: TEST_WORDS, maxScore: 30 };

  it('returns Grand Colophon rank when all words found and not revealed', () => {
    const entry = buildHistoryEntry(EPOCH, TEST_PUZZLE, {
      ...base, score: 30, foundWords: TEST_WORDS, revealed: false,
    });
    expect(entry.rank).toBe(RANK.GRAND_COLOPHON);
    expect(entry.completed).toBe(true);
    expect(entry.foundCount).toBe(9);
    expect(entry.totalCount).toBe(9);
    expect(entry.score).toBe(30);
    expect(entry.date).toBe('2026-01-01');
  });

  it('returns regular rank when not all words found', () => {
    const entry = buildHistoryEntry(EPOCH, TEST_PUZZLE, {
      ...base, score: 6, foundWords: ['drip','pine'], revealed: false,
    });
    expect(entry.rank).not.toBe(RANK.GRAND_COLOPHON);
    expect(entry.completed).toBe(true);
    expect(entry.foundCount).toBe(2);
  });

  it('marks completed false and does not use Grand Colophon rank when revealed', () => {
    const entry = buildHistoryEntry(EPOCH, TEST_PUZZLE, {
      ...base, score: 30, foundWords: TEST_WORDS, revealed: true,
    });
    expect(entry.rank).not.toBe(RANK.GRAND_COLOPHON);
    expect(entry.completed).toBe(false);
  });

  it('computes date from epoch + puzzle index', () => {
    const puzzle1 = { ...TEST_PUZZLE, index: 3 };
    const entry = buildHistoryEntry(EPOCH, puzzle1, {
      ...base, score: 1, foundWords: ['drip'], revealed: false,
    });
    expect(entry.date).toBe('2026-01-04');
  });
});

// ─── GameLayout rendering ──────────────────────────────────────────────────────

const noop = () => { /* no-op */ };

// Mock window.location.reload — jsdom blocks actual reloads in tests
let reloadMock: ReturnType<typeof vi.fn>;
beforeAll(() => {
  reloadMock = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: reloadMock },
  });
});
afterEach(() => { reloadMock.mockReset(); });

describe('GameLayout loading states', () => {
  it('shows loading text before puzzle loads', () => {
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />);
    expect(screen.getByText(/Setting type/i)).toBeInTheDocument();
  });

  it('shows error state on SCHEDULE_ERROR', () => {
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [{ type: 'SCHEDULE_ERROR' }],
    });
    expect(screen.getByText(/Failed to load puzzle/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('Retry button calls window.location.reload', async () => {
    const user = userEvent.setup();
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [{ type: 'SCHEDULE_ERROR' }],
    });
    await user.click(screen.getByRole('button', { name: /Retry/i }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('new-day banner button calls window.location.reload', async () => {
    const user = userEvent.setup();
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={true} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /New puzzle available/i }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});

describe('GameLayout normal game', () => {
  it('renders the letter grid when puzzle and dict loaded', () => {
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED],
    });
    expect(screen.getByRole('button', { name: /Center letter P/i })).toBeInTheDocument();
  });

  it('shows game-over screen instead of grid when gameOver', () => {
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [
        PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED,
        { type: 'RESTORE_STATE', foundWords: TEST_WORDS, score: 30 },
      ],
    });
    expect(screen.getAllByText('Grand Colophon').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Center letter P/i })).toBeNull();
  });

  it('shows new-day banner when newDayAvailable', () => {
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={true} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED],
    });
    expect(screen.getByRole('button', { name: /New puzzle available/i })).toBeInTheDocument();
  });

  it('does not show new-day banner when not available', () => {
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED],
    });
    expect(screen.queryByRole('button', { name: /New puzzle available/i })).toBeNull();
  });

  it('shows reveal button when hasPendingToday', () => {
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, { type: 'SET_PENDING_TODAY' }],
    });
    expect(screen.getByRole('button', { name: /Reveal answers/i })).toBeInTheDocument();
  });

  it('shows revealed (Better luck) game-over screen after REVEAL_REMAINING', () => {
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [
        PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED,
        { type: 'RESTORE_STATE', foundWords: ['drip', 'pine'], score: 2 },
        { type: 'REVEAL_REMAINING' },
      ],
    });
    expect(screen.getByText('Better luck next time')).toBeInTheDocument();
  });
});

describe('GameLayout modal interactions', () => {
  it('opens found-words modal when score button is clicked', async () => {
    const user = userEvent.setup();
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [
        PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED,
        { type: 'RESTORE_STATE', foundWords: ['drip', 'pine'], score: 2 },
      ],
    });
    await user.click(screen.getByRole('button', { name: /words found/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('clicking Reveal dispatches REVEAL_REMAINING and shows game-over', async () => {
    const user = userEvent.setup();
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [
        PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED,
        { type: 'RESTORE_STATE', foundWords: ['drip'], score: 1 },
        { type: 'SET_PENDING_TODAY' },
      ],
    });
    await user.click(screen.getByRole('button', { name: /Reveal answers/i }));
    expect(screen.getByText('Better luck next time')).toBeInTheDocument();
  });

  it('shows EditorWinModal when rank transitions to Laureate', async () => {
    const user = userEvent.setup();
    // Start at Novelist (score=26, maxScore=30 → pct=86, below Laureate threshold 89%)
    // foundWords sum to 26: printed(14)+print(5)+pride(5)+ripe(1)+trip(1)=26, 5/9 words
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [
        PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED,
        { type: 'RESTORE_STATE', foundWords: ['printed','print','pride','ripe','trip'], score: 26 },
      ],
    });
    // Type 'drip' + Enter → score 27 → pct=90 ≥ 89 (Laureate) → win modal
    await user.keyboard('drip{Enter}');
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Laureate/i })).toBeInTheDocument();
    });
  });

  it('opens stats modal when streak button is clicked', async () => {
    const user = userEvent.setup();
    renderWithGame(<GameLayout onPlayToday={noop} newDayAvailable={false} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /Streak/i }));
    // Stats modal renders with a heading
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
