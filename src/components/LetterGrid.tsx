/**
 * src/components/LetterGrid.tsx
 * 2-3-2 letter grid + hidden keyboard input.
 *
 * D-02: Hidden <input> captures physical keyboard via onChange (native `input` event).
 *       Tile taps dispatch LETTER_APPEND and re-focus hidden input (Pitfall 4).
 *       Enter is captured via onKeyDown — Enter fires reliably on all platforms including iOS.
 *       Letter keys use onChange, NOT onKeyDown (iOS Safari virtual keyboard unreliable for keydown).
 */

import React, { useRef, useEffect } from 'react';
import { LetterTile } from './LetterTile';
import { useGameState, useGameDispatch } from '../context/GameContext';

export function LetterGrid(): React.JSX.Element {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Focus hidden input when puzzle loads so keyboard works immediately (no tile tap required)
  useEffect(() => {
    if (state.puzzle) {
      hiddenInputRef.current?.focus();
    }
  }, [state.puzzle]);

  if (!state.puzzle) return <></>;

  const { surroundingOrder } = state;
  const centerLetter = state.puzzle.centerLetter.toLowerCase();
  const [a, b, c, d, e, f] = surroundingOrder;

  function handleTileClick(letter: string): void {
    dispatch({ type: 'LETTER_APPEND', letter });
    // Pitfall 4: re-focus hidden input after tile tap (tile <button> steals focus)
    hiddenInputRef.current?.focus();
  }

  function handleHiddenInput(e: React.ChangeEvent<HTMLInputElement>): void {
    const val = e.target.value;
    const lastChar = val.slice(-1).toLowerCase();
    if (/^[a-z]$/.test(lastChar)) {
      dispatch({ type: 'LETTER_APPEND', letter: lastChar });
    } else if (
      e.nativeEvent instanceof InputEvent &&
      e.nativeEvent.inputType === 'deleteContentBackward'
    ) {
      dispatch({ type: 'LETTER_DELETE' });
    }
    // Always clear so next keystroke triggers onChange
    e.target.value = '';
  }

  function handleHiddenKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    // Non-printable keys (Enter, Backspace) are reliable on all platforms via onKeyDown.
    // Letter keys use onChange instead (iOS Safari virtual keyboard keydown is unreliable).
    if (e.key === 'Enter') {
      e.preventDefault();
      dispatch({ type: 'WORD_SUBMIT' });
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      dispatch({ type: 'LETTER_DELETE' });
    }
  }

  return (
    <div className="letter-grid">
      {/* Hidden input captures physical keyboard */}
      <input
        ref={hiddenInputRef}
        onChange={handleHiddenInput}
        onKeyDown={handleHiddenKeyDown}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
        aria-label="game input"
        tabIndex={-1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        readOnly={false}
      />

      {/* 2-3-2 grid layout */}
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
