/**
 * src/components/LetterGrid.tsx
 * 2-3-2 letter grid.
 *
 * Physical keyboard input is handled by the document-level keydown listener
 * in GameLayout (App.tsx), so no hidden input or focus management is needed here.
 * Tile taps dispatch LETTER_APPEND directly.
 */

import React from 'react';
import { LetterTile } from './LetterTile';
import { useGameState, useGameDispatch } from '../context/GameContext';

export function LetterGrid(): React.JSX.Element {
  const state = useGameState();
  const dispatch = useGameDispatch();

  if (!state.puzzle) return <></>;

  const { surroundingOrder } = state;
  const centerLetter = state.puzzle.centerLetter.toLowerCase();
  const [a, b, c, d, e, f] = surroundingOrder;

  function handleTileClick(letter: string): void {
    dispatch({ type: 'LETTER_APPEND', letter });
  }

  return (
    <div className="letter-grid">
      <div className="grid-row">
        <LetterTile letter={a} onTap={handleTileClick} />
        <LetterTile letter={b} onTap={handleTileClick} />
      </div>
      <div className="grid-row">
        <LetterTile letter={c} onTap={handleTileClick} />
        <LetterTile letter={centerLetter} onTap={handleTileClick} isCenter />
        <LetterTile letter={d} onTap={handleTileClick} />
      </div>
      <div className="grid-row">
        <LetterTile letter={e} onTap={handleTileClick} />
        <LetterTile letter={f} onTap={handleTileClick} />
      </div>
    </div>
  );
}
