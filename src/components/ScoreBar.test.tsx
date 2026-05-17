import React, { createRef } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame } from '../test/helpers';
import { ScoreBar } from './ScoreBar';
import { appendHistory } from '../storage';
import type { PuzzleEntry } from '../types';
import type { HistoryEntry } from '../storage';

const TEST_PUZZLE: PuzzleEntry = {
  index: 0,
  letters: ['D', 'E', 'I', 'N', 'P', 'R', 'T'],
  centerLetter: 'P',
};
const TEST_WORDS = ['drip', 'pine', 'pier', 'pint', 'pride', 'print', 'printed', 'ripe', 'trip'];
const PUZZLE_LOADED = { type: 'PUZZLE_LOADED' as const, puzzle: TEST_PUZZLE };
const DICT_LOADED = { type: 'DICT_LOADED' as const, words: TEST_WORDS };

const onOpenModal = vi.fn();
const onOpenStats = vi.fn();
const epochRef = (() => {
  const ref = createRef<string | null>();
  (ref as React.MutableRefObject<string | null>).current = '2026-01-01';
  return ref;
})();

afterEach(() => {
  vi.clearAllMocks();
});

describe('ScoreBar rank display', () => {
  it('shows dash rank before dict is loaded (maxScore=0)', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED],
    });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it("shows Printer's Devil rank at 0 score after dict loaded", () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    // pct=0 → below first tier threshold → Printer's Devil
    expect(screen.getByText("Printer's Devil")).toBeInTheDocument();
  });

  it('renders a progressbar element', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('ScoreBar score-count button', () => {
  it('shows score and word count', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByText(/0 words · 0\/\d+ pts/)).toBeInTheDocument();
  });

  it('shows pts out of laureate target (84% of maxScore), not total maxScore', () => {
    // maxScore for TEST_WORDS = 30; laureateTarget = ceil(0.84 * 30) = 26
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByText('0 words · 0/26 pts ▾')).toBeInTheDocument();
    expect(screen.queryByText(/\/30 pts/)).toBeNull();
  });

  it('calls onOpenModal when score button is clicked', async () => {
    const user = userEvent.setup();
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /words found.*score/i }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});

describe('ScoreBar streak counter', () => {
  it('shows streak 0 with empty history', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByRole('button', { name: /Streak: 0 days/i })).toBeInTheDocument();
  });

  it('shows streak 1 when history has entry today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));
    const entry: HistoryEntry = {
      date: '2026-05-15',
      score: 10,
      rank: 'Compositor',
      foundCount: 3,
      totalCount: 9,
      completed: true,
    };
    appendHistory(entry);
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByRole('button', { name: /Streak: 1 days/i })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('calls onOpenStats when streak button is clicked', async () => {
    const user = userEvent.setup();
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /Streak:.*days/i }));
    expect(onOpenStats).toHaveBeenCalledTimes(1);
  });
});

describe('ScoreBar rank popover', () => {
  it('does not list Grand Colophon in the rank popover', async () => {
    const user = userEvent.setup();
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /Show rank thresholds/i }));
    expect(screen.queryByText('Grand Colophon')).toBeNull();
  });

  it('lists Laureate in the rank popover', async () => {
    const user = userEvent.setup();
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /Show rank thresholds/i }));
    expect(screen.getByText('Laureate')).toBeInTheDocument();
  });
});

describe('ScoreBar Grand Colophon rank', () => {
  const ALL_WORDS_ACTIONS = [
    PUZZLE_LOADED,
    DICT_LOADED,
    { type: 'RESTORE_STATE' as const, foundWords: TEST_WORDS, score: 30 },
  ];

  it('shows "Grand Colophon" as rank name when all words are found', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: ALL_WORDS_ACTIONS,
    });
    expect(screen.getByText('Grand Colophon')).toBeInTheDocument();
  });

  it('shows full score without a denominator when Grand Colophon', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: ALL_WORDS_ACTIONS,
    });
    expect(screen.getByText(/9 words · 30 pts ▾/)).toBeInTheDocument();
    expect(screen.queryByText(/\/\d+ pts/)).toBeNull();
  });

  it('does not show a next-rank hint when Grand Colophon', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: ALL_WORDS_ACTIONS,
    });
    expect(screen.queryByText(/pts to/i)).toBeNull();
  });

  it('does not show "Grand Colophon" rank before all words are found', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.queryByText('Grand Colophon')).toBeNull();
  });
});

describe('ScoreBar Grand Colophon day-after hint', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows Grand Colophon hint the day after all words were found', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 12, 0, 0)); // today = 2026-05-16
    const entry: HistoryEntry = {
      date: '2026-05-15', // yesterday
      score: 30,
      rank: 'Laureate',
      foundCount: 9,
      totalCount: 9, // all words found
      completed: true,
    };
    appendHistory(entry);
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByText(/Grand Colophon yesterday · 30 pts/i)).toBeInTheDocument();
  });

  it('does not show hint when yesterday\'s game did not find all words', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 12, 0, 0)); // today = 2026-05-16
    const entry: HistoryEntry = {
      date: '2026-05-15',
      score: 20,
      rank: 'Editor',
      foundCount: 7,
      totalCount: 9, // not all found
      completed: true,
    };
    appendHistory(entry);
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.queryByText(/Grand Colophon yesterday/i)).toBeNull();
  });

  it('does not show hint when all-words entry is 2 days ago (not yesterday)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 12, 0, 0)); // today = 2026-05-16
    const entry: HistoryEntry = {
      date: '2026-05-14', // two days ago
      score: 30,
      rank: 'Laureate',
      foundCount: 9,
      totalCount: 9,
      completed: true,
    };
    appendHistory(entry);
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} epochRef={epochRef} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.queryByText(/Grand Colophon yesterday/i)).toBeNull();
  });
});
