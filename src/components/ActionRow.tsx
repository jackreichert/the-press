/**
 * src/components/ActionRow.tsx
 * Delete one letter | Shuffle surrounding letters | Submit word.
 * D-04: Delete (⌫) removes one letter. Clear removes entire word.
 * D-05: Enter button triggers WORD_SUBMIT.
 * D-06: Enter disabled with "(loading...)" label until dict resolves.
 */

import React from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';

export function ActionRow(): React.JSX.Element {
  const state = useGameState();
  const dispatch = useGameDispatch();

  return (
    <div className="action-row">
      <button
        className="action-btn"
        onClick={() => dispatch({ type: 'LETTER_DELETE' })}
        type="button"
        aria-label="Delete last letter"
      >
        ⌫
      </button>
      <button
        className="action-btn"
        onClick={() => dispatch({ type: 'WORD_CLEAR' })}
        type="button"
        aria-label="Clear word"
      >
        Clear
      </button>
      <button
        className="action-btn"
        onClick={() => dispatch({ type: 'SHUFFLE' })}
        type="button"
        aria-label="Shuffle surrounding letters"
      >
        Shuffle
      </button>
      <button
        className="action-btn"
        onClick={() => dispatch({ type: 'WORD_SUBMIT' })}
        disabled={!state.dictLoaded}
        type="button"
        aria-label={state.dictLoaded ? 'Submit word' : 'Loading dictionary'}
      >
        {state.dictLoaded ? 'Enter' : '(loading...)'}
      </button>
    </div>
  );
}
