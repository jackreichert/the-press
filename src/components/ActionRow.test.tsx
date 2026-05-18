import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame, PUZZLE_LOADED, DICT_LOADED } from '../test/helpers';
import { ActionRow } from './ActionRow';
import { WordDisplay } from './WordDisplay';
import { LetterGrid } from './LetterGrid';
const LETTER_P = { type: 'LETTER_APPEND' as const, letter: 'p' };
const LETTER_I = { type: 'LETTER_APPEND' as const, letter: 'i' };
const LETTER_N = { type: 'LETTER_APPEND' as const, letter: 'n' };

describe('ActionRow — Submit button disabled state', () => {
  it('is disabled with aria-label "Loading dictionary" before DICT_LOADED', () => {
    renderWithGame(<ActionRow />, { initialActions: [PUZZLE_LOADED] });
    const btn = screen.getByRole('button', { name: /Loading dictionary/i });
    expect(btn).toBeDisabled();
  });

  it('is enabled with aria-label "Submit word" after DICT_LOADED', () => {
    renderWithGame(<ActionRow />, { initialActions: [PUZZLE_LOADED, DICT_LOADED] });
    const btn = screen.getByRole('button', { name: /Submit word/i });
    expect(btn).not.toBeDisabled();
  });
});

describe('ActionRow — button dispatches', () => {
  it('Delete button removes last typed letter', async () => {
    const user = userEvent.setup();
    renderWithGame(
      <>
        <WordDisplay />
        <ActionRow />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, LETTER_P, LETTER_I] },
    );
    expect(screen.getByText('PI')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Delete last letter/i }));
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('Clear button empties currentWord', async () => {
    const user = userEvent.setup();
    renderWithGame(
      <>
        <WordDisplay />
        <ActionRow />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, LETTER_P, LETTER_I, LETTER_N] },
    );
    await user.click(screen.getByRole('button', { name: /Clear word/i }));
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('Submit triggers WORD_SUBMIT — too-short word shows error', async () => {
    const user = userEvent.setup();
    renderWithGame(
      <>
        <WordDisplay />
        <ActionRow />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, LETTER_P, LETTER_I, LETTER_N] },
    );
    await user.click(screen.getByRole('button', { name: /Submit word/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });

  it('Shuffle button reorders letters — same set of tiles present', async () => {
    const user = userEvent.setup();
    renderWithGame(
      <>
        <LetterGrid />
        <ActionRow />
      </>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED] },
    );
    // All 6 surrounding letter tiles should still be present after shuffle
    await user.click(screen.getByRole('button', { name: /Shuffle surrounding letters/i }));
    // Non-center tiles have aria-label "Letter X"
    const tiles = screen.getAllByRole('button', { name: /^Letter /i });
    expect(tiles).toHaveLength(6);
  });
});
