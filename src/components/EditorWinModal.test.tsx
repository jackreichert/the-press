import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame, TEST_WORDS, PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED } from '../test/helpers';
import { EditorWinModal } from './EditorWinModal';
// Restore most (not all) words so wordsLeft > 0
const RESTORE_PARTIAL = { type: 'RESTORE_STATE' as const, foundWords: ['drip', 'pine', 'pier', 'pint', 'pride', 'print', 'printed', 'ripe'], score: 29 };
// Restore all words (Laureate + Grand Colophon)
const RESTORE_ALL = { type: 'RESTORE_STATE' as const, foundWords: TEST_WORDS, score: 30 };

const writeTextMock = vi.fn();
const onKeepPlaying = vi.fn();

beforeEach(() => {
  writeTextMock.mockReset();
  writeTextMock.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
    writable: true,
    enumerable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('EditorWinModal display', () => {
  it('shows "Laureate" headline', () => {
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    expect(screen.getByRole('heading', { name: 'Laureate' })).toBeInTheDocument();
  });

  it('shows "You\'ve reached" eyebrow text', () => {
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    expect(screen.getByText(/You've reached/i)).toBeInTheDocument();
  });

  it('shows score and word count', () => {
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    expect(screen.getByText(/29 pts/i)).toBeInTheDocument();
    expect(screen.getByText(/8 of 9 words/i)).toBeInTheDocument();
  });

  it('shows words-left hint when words remain', () => {
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    expect(screen.getByText(/1 word left/i)).toBeInTheDocument();
    expect(screen.getByText(/Grand Colophon/i)).toBeInTheDocument();
  });

  it('does not show words-left hint when all words found', () => {
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_ALL] },
    );
    expect(screen.queryByText(/word.*left/i)).toBeNull();
  });

  it('renders as a dialog', () => {
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('EditorWinModal Keep Playing button', () => {
  it('calls onKeepPlaying when "Keep Playing →" button is clicked', async () => {
    const user = userEvent.setup();
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    await user.click(screen.getByRole('button', { name: 'Keep Playing →' }));
    expect(onKeepPlaying).toHaveBeenCalledTimes(1);
  });

  it('calls onKeepPlaying when the close (✕) button is clicked', async () => {
    const user = userEvent.setup();
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    await user.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(onKeepPlaying).toHaveBeenCalledTimes(1);
  });
});

describe('EditorWinModal share', () => {
  it('has a Share Result button', () => {
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    expect(screen.getByRole('button', { name: /Share result/i })).toBeInTheDocument();
  });

  it('copies share text containing LAUREATE on share click', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
      enumerable: true,
    });
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    await user.click(screen.getByRole('button', { name: /Share result/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copied to clipboard/i })).toBeInTheDocument();
    });
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('LAUREATE'));
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('thepress.app'));
  });

  it('does not include GRAND COLOPHON in Laureate share text', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
      enumerable: true,
    });
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    await user.click(screen.getByRole('button', { name: /Share result/i }));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalled());
    const shareText = writeTextMock.mock.calls[0][0] as string;
    expect(shareText).not.toContain('GRAND COLOPHON');
  });
});

describe('EditorWinModal share fallback', () => {
  it('shows fallback textarea when clipboard.writeText rejects', async () => {
    const user = userEvent.setup();
    const rejectMock = vi.fn().mockRejectedValueOnce(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: rejectMock },
      configurable: true,
      writable: true,
      enumerable: true,
    });
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    await user.click(screen.getByRole('button', { name: /Share result/i }));
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /Share text/i })).toBeInTheDocument();
    });
  });
});

describe('EditorWinModal words-left phrasing', () => {
  it('uses singular "word" when exactly 1 word remains', () => {
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, SCHEDULE_LOADED, RESTORE_PARTIAL] },
    );
    // RESTORE_PARTIAL has 8 of 9 words → 1 left
    expect(screen.getByText(/1 word left/)).toBeInTheDocument();
    expect(screen.queryByText(/1 words left/)).toBeNull();
  });

  it('uses plural "words" when more than 1 word remains', () => {
    const RESTORE_FEW = { type: 'RESTORE_STATE' as const, foundWords: ['drip', 'pine', 'pier', 'pint', 'pride', 'print'], score: 13 };
    renderWithGame(
      <EditorWinModal onKeepPlaying={onKeepPlaying} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_FEW] },
    );
    expect(screen.getByText(/3 words left/)).toBeInTheDocument();
  });
});
