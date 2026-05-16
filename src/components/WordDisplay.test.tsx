import React from 'react';
import { screen, act, fireEvent, waitFor } from '@testing-library/react';
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
  it('adds shake class after an invalid submission', () => {
    // D-05: use fireEvent (synchronous) so fake timers don't block click resolution
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

    fireEvent.click(screen.getByRole('button', { name: /Submit word/i }));

    const wordDiv = document.querySelector('.word-display') as HTMLElement;
    expect(wordDiv).toHaveClass('shake');
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });

  it('removes shake class after 400ms', () => {
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
    fireEvent.click(screen.getByRole('button', { name: /Submit word/i }));

    act(() => { vi.advanceTimersByTime(401); });
    const wordDiv = document.querySelector('.word-display') as HTMLElement;
    expect(wordDiv).not.toHaveClass('shake');
  });

  it('clears the current word after 700ms following an error (WORD_CLEAR dispatched)', () => {
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
    fireEvent.click(screen.getByRole('button', { name: /Submit word/i }));

    expect(screen.getByText('PIN')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(701); });

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('WordDisplay found-word flash', () => {
  it('shows found word with word-display--found class after valid submit', async () => {
    const DRIP = ['d','r','i','p'].map(l => ({ type: 'LETTER_APPEND' as const, letter: l }));
    renderWithGame(
      <><WordDisplay /><ActionRow /></>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, ...DRIP] },
    );
    fireEvent.click(screen.getByRole('button', { name: /Submit word/i }));
    // Flush React effects — fake timers are active so we flush with act instead of waitFor
    await act(async () => { await Promise.resolve(); });
    const wordDiv = document.querySelector('.word-display') as HTMLElement;
    expect(wordDiv).toHaveClass('word-display--found');
    expect(wordDiv).toHaveTextContent('DRIP');
  });

  it('reverts to placeholder after 950ms', async () => {
    const DRIP = ['d','r','i','p'].map(l => ({ type: 'LETTER_APPEND' as const, letter: l }));
    renderWithGame(
      <><WordDisplay /><ActionRow /></>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, ...DRIP] },
    );
    fireEvent.click(screen.getByRole('button', { name: /Submit word/i }));
    await act(async () => { await Promise.resolve(); });
    expect(document.querySelector('.word-display--found')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(951); });
    expect(document.querySelector('.word-display--placeholder')).toBeTruthy();
  });

  it('shows +N pts label (role=status) when word is found', async () => {
    const DRIP = ['d','r','i','p'].map(l => ({ type: 'LETTER_APPEND' as const, letter: l }));
    renderWithGame(
      <><WordDisplay /><ActionRow /></>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, ...DRIP] },
    );
    fireEvent.click(screen.getByRole('button', { name: /Submit word/i }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('status')).toHaveTextContent('+1');
  });
});
