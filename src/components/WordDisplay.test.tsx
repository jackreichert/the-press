import React from 'react';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame } from '../test/helpers';
import { WordDisplay } from './WordDisplay';
import { ActionRow } from './ActionRow';
import type { PuzzleEntry } from '../types';

const TEST_PUZZLE: PuzzleEntry = {
  index: 0,
  letters: ['D', 'E', 'I', 'N', 'P', 'R', 'T'],
  centerLetter: 'P',
};
const TEST_WORDS = ['drip', 'pine', 'pier', 'pint', 'pride', 'print', 'printed', 'ripe', 'trip'];
const PUZZLE_LOADED = { type: 'PUZZLE_LOADED' as const, puzzle: TEST_PUZZLE };
const DICT_LOADED = { type: 'DICT_LOADED' as const, words: TEST_WORDS };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WordDisplay rendering', () => {
  it('shows placeholder — when no letters typed', () => {
    renderWithGame(<WordDisplay />, { initialActions: [PUZZLE_LOADED, DICT_LOADED] });
    const dashEl = screen.getByText('—');
    expect(dashEl).toBeInTheDocument();
    expect(dashEl).toHaveClass('word-display--placeholder');
  });

  it('shows typed letters in uppercase', () => {
    const LETTER_D = { type: 'LETTER_APPEND' as const, letter: 'd' };
    const LETTER_R = { type: 'LETTER_APPEND' as const, letter: 'r' };
    renderWithGame(<WordDisplay />, {
      initialActions: [PUZZLE_LOADED, DICT_LOADED, LETTER_D, LETTER_R],
    });
    expect(screen.getByText('DR')).toBeInTheDocument();
  });

  it('error message paragraph is always present in DOM', () => {
    renderWithGame(<WordDisplay />, { initialActions: [PUZZLE_LOADED, DICT_LOADED] });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('WordDisplay error animation', () => {
  it('adds shake class after an invalid submission', async () => {
    // D-05: fake timers needed — shake uses setTimeout
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const LETTER_P = { type: 'LETTER_APPEND' as const, letter: 'p' };
    const LETTER_I = { type: 'LETTER_APPEND' as const, letter: 'i' };
    const LETTER_N = { type: 'LETTER_APPEND' as const, letter: 'n' };
    renderWithGame(
      <>
        <WordDisplay />
        <ActionRow />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, LETTER_P, LETTER_I, LETTER_N] },
    );

    const submitBtn = screen.getByRole('button', { name: /Submit word/i });
    await user.click(submitBtn);

    // shake class appears immediately after error
    const wordDiv = document.querySelector('.word-display') as HTMLElement;
    expect(wordDiv).toHaveClass('shake');

    // error message appears
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });

  it('removes shake class after 400ms', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const LETTER_P = { type: 'LETTER_APPEND' as const, letter: 'p' };
    const LETTER_I = { type: 'LETTER_APPEND' as const, letter: 'i' };
    const LETTER_N = { type: 'LETTER_APPEND' as const, letter: 'n' };
    renderWithGame(
      <>
        <WordDisplay />
        <ActionRow />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, LETTER_P, LETTER_I, LETTER_N] },
    );
    await user.click(screen.getByRole('button', { name: /Submit word/i }));

    act(() => { vi.advanceTimersByTime(401); });
    const wordDiv = document.querySelector('.word-display') as HTMLElement;
    expect(wordDiv).not.toHaveClass('shake');
  });

  it('clears the current word after 700ms following an error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const LETTER_P = { type: 'LETTER_APPEND' as const, letter: 'p' };
    const LETTER_I = { type: 'LETTER_APPEND' as const, letter: 'i' };
    const LETTER_N = { type: 'LETTER_APPEND' as const, letter: 'n' };
    renderWithGame(
      <>
        <WordDisplay />
        <ActionRow />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, LETTER_P, LETTER_I, LETTER_N] },
    );
    await user.click(screen.getByRole('button', { name: /Submit word/i }));

    // Word still visible immediately after error
    expect(screen.getByText('PIN')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(701); });

    // Word cleared — placeholder shows
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
