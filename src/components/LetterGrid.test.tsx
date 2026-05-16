import React from 'react';
import { screen, act } from '@testing-library/react';
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

// Keyboard input moved to a document-level listener in GameLayout (App.tsx).
// KeyboardConnector replicates that listener so these tests work without rendering the full app.
import { useEffect } from 'react';
import { useGameDispatch, useGameState } from '../context/GameContext';

function KeyboardConnector(): null {
  const dispatch = useGameDispatch();
  const { gameOver } = useGameState();
  useEffect(() => {
    function handle(e: KeyboardEvent): void {
      if (e.ctrlKey || e.metaKey || e.altKey || gameOver) return;
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) { e.preventDefault(); dispatch({ type: 'LETTER_APPEND', letter: key }); }
      else if (e.key === 'Backspace') { e.preventDefault(); dispatch({ type: 'LETTER_DELETE' }); }
      else if (e.key === 'Enter') { e.preventDefault(); dispatch({ type: 'WORD_SUBMIT' }); }
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [dispatch, gameOver]);
  return null;
}

describe('LetterGrid keyboard input (document listener)', () => {
  it('pressing p appends P to current word', () => {
    renderWithGame(
      <><KeyboardConnector /><WordDisplay /><LetterGrid /></>,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED] },
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    });
    expect(document.querySelector('.word-display')).toHaveTextContent('P');
  });

  it('pressing Enter dispatches WORD_SUBMIT (too short error)', () => {
    renderWithGame(
      <><KeyboardConnector /><WordDisplay /><LetterGrid /></>,
      { initialActions: [
          PUZZLE_LOADED, DICT_LOADED,
          { type: 'LETTER_APPEND' as const, letter: 'p' },
          { type: 'LETTER_APPEND' as const, letter: 'i' },
          { type: 'LETTER_APPEND' as const, letter: 'n' },
      ]},
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });
});
