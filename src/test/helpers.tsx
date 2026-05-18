import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { GameProvider, useGameDispatch, useGameState } from '../context/GameContext';
import type { GameAction } from '../reducer/gameReducer';
import type { PuzzleEntry } from '../types';

// ─── Shared test fixtures ──────────────────────────────────────────────────────

export const TEST_PUZZLE: PuzzleEntry = {
  index: 0,
  letters: ['D', 'E', 'I', 'N', 'P', 'R', 'T'],
  centerLetter: 'P',
};
export const TEST_WORDS = ['drip', 'pine', 'pier', 'pint', 'pride', 'print', 'printed', 'ripe', 'trip'];
export const PUZZLE_LOADED = { type: 'PUZZLE_LOADED' as const, puzzle: TEST_PUZZLE };
export const DICT_LOADED = { type: 'DICT_LOADED' as const, words: TEST_WORDS };
export const SCHEDULE_LOADED = { type: 'SCHEDULE_LOADED' as const, epoch: '2026-01-01' };

// ─── KeyboardConnector ────────────────────────────────────────────────────────
// Mirrors the document-level keyboard listener in App.tsx so tests can
// exercise keyboard input without rendering the full app.

export function KeyboardConnector(): null {
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

interface RenderWithGameOptions extends Omit<RenderOptions, 'wrapper'> {
  initialActions?: GameAction[];
}

function Seeder({ actions }: { actions: GameAction[] }): null {
  const dispatch = useGameDispatch();
  useEffect(() => {
    actions.forEach(a => dispatch(a));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function renderWithGame(
  ui: React.ReactElement,
  { initialActions = [], ...opts }: RenderWithGameOptions = {},
): RenderResult {
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
      <GameProvider>
        {initialActions.length > 0 && <Seeder actions={initialActions} />}
        {children}
      </GameProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...opts });
}
