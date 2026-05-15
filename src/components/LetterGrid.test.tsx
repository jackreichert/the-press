import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame } from '../test/helpers.tsx';
import { LetterGrid } from './LetterGrid';
import { WordDisplay } from './WordDisplay';
import type { PuzzleEntry } from '../types';

const TEST_PUZZLE: PuzzleEntry = {
  index: 0,
  letters: ['D','E','I','N','P','R','T'],
  centerLetter: 'P',
};
const TEST_WORDS = ['drip','pine','pier','pint','pride','print','printed','ripe','trip'];
const PUZZLE_LOADED = { type: 'PUZZLE_LOADED' as const, puzzle: TEST_PUZZLE };
const DICT_LOADED = { type: 'DICT_LOADED' as const, words: TEST_WORDS };

describe('LetterGrid rendering', () => {
  it('renders nothing when puzzle not loaded', () => {
    renderWithGame(<LetterGrid />);
    expect(document.querySelector('.letter-grid')).toBeNull();
  });

  it('renders 6 surrounding letter tiles when puzzle loaded', () => {
    renderWithGame(<LetterGrid />, { initialActions: [PUZZLE_LOADED, DICT_LOADED] });
    const tiles = screen.getAllByRole('button', { name: /^Letter /i });
    expect(tiles).toHaveLength(6);
  });

  it('renders center letter P tile', () => {
    renderWithGame(<LetterGrid />, { initialActions: [PUZZLE_LOADED, DICT_LOADED] });
    expect(screen.getByRole('button', { name: /Center letter P/i })).toBeInTheDocument();
  });
});

describe('LetterGrid tile click', () => {
  it('clicking Letter D appends d to current word', async () => {
    const user = userEvent.setup();
    renderWithGame(
      <>
        <WordDisplay />
        <LetterGrid />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED] },
    );
    await user.click(screen.getByRole('button', { name: /Letter D/i }));
    // The word-display div shows the uppercased current word
    const wordDisplay = document.querySelector('.word-display') as HTMLElement;
    expect(wordDisplay).toHaveTextContent('D');
  });

  it('clicking Center letter P appends p to current word', async () => {
    const user = userEvent.setup();
    renderWithGame(
      <>
        <WordDisplay />
        <LetterGrid />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED] },
    );
    await user.click(screen.getByRole('button', { name: /Center letter P/i }));
    // The word-display div shows the uppercased current word (not the tile button text)
    const wordDisplay = document.querySelector('.word-display') as HTMLElement;
    expect(wordDisplay).toHaveTextContent('P');
  });
});

describe('LetterGrid keyboard input (hidden input)', () => {
  it('hidden input exists with aria-hidden="true"', () => {
    renderWithGame(<LetterGrid />, { initialActions: [PUZZLE_LOADED, DICT_LOADED] });
    const hiddenInput = document.querySelector('input[aria-hidden="true"]');
    expect(hiddenInput).not.toBeNull();
  });

  it('typing p in hidden input appends p to current word', async () => {
    // pointer-events: none on hidden input — skip pointer events check so userEvent can type into it
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithGame(
      <>
        <WordDisplay />
        <LetterGrid />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED] },
    );
    const hiddenInput = document.querySelector('input[aria-hidden="true"]') as HTMLInputElement;
    await user.type(hiddenInput, 'p');
    // The word-display div shows the uppercased current word
    const wordDisplay = document.querySelector('.word-display') as HTMLElement;
    expect(wordDisplay).toHaveTextContent('P');
  });

  it('pressing Enter in hidden input dispatches WORD_SUBMIT', async () => {
    // pointerEventsCheck: 0 allows keyboard interaction on aria-hidden="true" input
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    // Seed 'pin' via initialActions so WORD_SUBMIT produces 'Too short' error
    renderWithGame(
      <>
        <WordDisplay />
        <LetterGrid />
      </>,
      { initialActions: [
          PUZZLE_LOADED,
          DICT_LOADED,
          { type: 'LETTER_APPEND' as const, letter: 'p' },
          { type: 'LETTER_APPEND' as const, letter: 'i' },
          { type: 'LETTER_APPEND' as const, letter: 'n' },
      ]},
    );
    const hiddenInput = document.querySelector('input[aria-hidden="true"]') as HTMLInputElement;
    hiddenInput.focus();
    await user.keyboard('{Enter}');
    // The error message appears synchronously — errorMsg is set by WORD_SUBMIT handler
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });
});
