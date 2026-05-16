/**
 * src/components/LetterGrid.tsx
 * 2-3-2 letter grid.
 *
 * Physical keyboard input is handled by the document-level keydown listener
 * in GameLayout (App.tsx), so no hidden input or focus management is needed here.
 * Tile taps dispatch LETTER_APPEND directly.
 */

import React, { useState, useEffect, useRef } from 'react';
import { LetterTile } from './LetterTile';
import { useGameState, useGameDispatch } from '../context/GameContext';

export function LetterGrid(): React.JSX.Element {
  const state = useGameState();
  const dispatch = useGameDispatch();

  if (!state.puzzle) return <></>;

  const { surroundingOrder } = state;

  // Animate surrounding tiles when surroundingOrder changes (Shuffle action)
  const [shuffling, setShuffling] = useState(false);
  const prevOrderRef = useRef(surroundingOrder.join(''));
  useEffect(() => {
    const curr = surroundingOrder.join('');
    if (curr !== prevOrderRef.current) {
      setShuffling(true);
      const t = setTimeout(() => setShuffling(false), 380);
      prevOrderRef.current = curr;
      return () => clearTimeout(t);
    }
    prevOrderRef.current = curr;
  });
  const centerLetter = state.puzzle.centerLetter.toLowerCase();
  const [a, b, c, d, e, f] = surroundingOrder;

  function handleTileClick(letter: string): void {
    dispatch({ type: 'LETTER_APPEND', letter });
  }

  const tileClass = shuffling ? 'tile--shuffling' : undefined;

  return (
    <div className="letter-grid">
      <div className="grid-row">
        <LetterTile letter={a} onTap={handleTileClick} extraClass={tileClass} />
        <LetterTile letter={b} onTap={handleTileClick} extraClass={tileClass} />
      </div>
      <div className="grid-row">
        <LetterTile letter={c} onTap={handleTileClick} extraClass={tileClass} />
        <LetterTile letter={centerLetter} onTap={handleTileClick} isCenter />
        <LetterTile letter={d} onTap={handleTileClick} extraClass={tileClass} />
      </div>
      <div className="grid-row">
        <LetterTile letter={e} onTap={handleTileClick} extraClass={tileClass} />
        <LetterTile letter={f} onTap={handleTileClick} extraClass={tileClass} />
      </div>
    </div>
  );
}
