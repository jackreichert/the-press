import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame, TEST_PUZZLE, TEST_WORDS, PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED } from '../test/helpers';
import { ScoreBar } from './ScoreBar';
import { appendHistory } from '../storage';
import type { HistoryEntry } from '../storage';

const onOpenModal = vi.fn();
const onOpenStats = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
});

describe('ScoreBar rank display', () => {
  it('shows dash rank before dict is loaded (maxScore=0)', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED],
    });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows dash rank at 0 score after dict loaded (no rank earned yet)', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText("Printer's Devil")).toBeNull();
  });

  it('renders a progressbar element', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('ScoreBar score-count button', () => {
  it('shows score and word count', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByText(/0 words · 0\/\d+ pts/)).toBeInTheDocument();
  });

  it('shows pts out of laureate target (89% of maxScore), not total maxScore', () => {
    // maxScore for TEST_WORDS = 30; laureateTarget = ceil(0.89 * 30) = ceil(26.7) = 27
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByText('0 words · 0/27 pts ▾')).toBeInTheDocument();
    expect(screen.queryByText(/\/30 pts/)).toBeNull();
  });

  it('calls onOpenModal when score button is clicked', async () => {
    const user = userEvent.setup();
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /words found.*score/i }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});

describe('ScoreBar streak counter', () => {
  afterEach(() => { localStorage.clear(); });
  it('shows streak 0 with empty history', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
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
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByRole('button', { name: /Streak: 1 days/i })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('calls onOpenStats when streak button is clicked', async () => {
    const user = userEvent.setup();
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /Streak:.*days/i }));
    expect(onOpenStats).toHaveBeenCalledTimes(1);
  });
});

describe('ScoreBar rank popover', () => {
  it('does not list Grand Colophon in the rank popover', async () => {
    const user = userEvent.setup();
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /Show rank thresholds/i }));
    expect(screen.queryByText('Grand Colophon')).toBeNull();
  });

  it('lists Laureate in the rank popover', async () => {
    const user = userEvent.setup();
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    await user.click(screen.getByRole('button', { name: /Show rank thresholds/i }));
    expect(screen.getByText('Laureate')).toBeInTheDocument();
  });
});

describe('ScoreBar next-rank hint', () => {
  it("shows '1 pt to Printer's Devil' before the first word is found", () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.getByText("1 pt to Printer's Devil")).toBeInTheDocument();
  });

  it('shows pts-to-next-rank hint after scoring', () => {
    // score=1 (drip, 4-letter = 1pt), maxScore=30. Apprentice threshold=2%: ceil(0.6)=1pt.
    // 1pt already reaches Apprentice (pct=3>=2), so hint targets Journeyman (5%).
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED, { type: 'RESTORE_STATE', foundWords: ['drip'], score: 1 }],
    });
    expect(screen.queryByText(/Printer's Devil/)).toBeNull();
    expect(screen.getByText(/pts? to /i)).toBeInTheDocument();
  });
});

describe('ScoreBar Grand Colophon rank', () => {
  const ALL_WORDS_ACTIONS = [
    PUZZLE_LOADED,
    DICT_LOADED,
    { type: 'RESTORE_STATE' as const, foundWords: TEST_WORDS, score: 30 },
  ];

  it('shows "Grand Colophon" as rank name when all words are found', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: ALL_WORDS_ACTIONS,
    });
    expect(screen.getByText('Grand Colophon')).toBeInTheDocument();
  });

  it('shows full score without a denominator when Grand Colophon', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: ALL_WORDS_ACTIONS,
    });
    expect(screen.getByText(/9 words · 30 pts ▾/)).toBeInTheDocument();
    expect(screen.queryByText(/\/\d+ pts/)).toBeNull();
  });

  it('does not show a next-rank hint when Grand Colophon', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: ALL_WORDS_ACTIONS,
    });
    expect(screen.queryByText(/pts to/i)).toBeNull();
  });

  it('does not show "Grand Colophon" rank before all words are found', () => {
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.queryByText('Grand Colophon')).toBeNull();
  });
});

describe('ScoreBar Grand Colophon day-after hint', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
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
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
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
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
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
    renderWithGame(<ScoreBar onOpenModal={onOpenModal} onOpenStats={onOpenStats} />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED],
    });
    expect(screen.queryByText(/Grand Colophon yesterday/i)).toBeNull();
  });
});
