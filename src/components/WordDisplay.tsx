/**
 * src/components/WordDisplay.tsx
 * Shows the word the player is currently building.
 * GAME-03: shake animation on invalid submission.
 * Pitfall 3: depends on errorKey (not errorMsg string) for shake re-trigger.
 */

import React, { useState, useEffect } from 'react';
import { useGameState } from '../context/GameContext';

export function WordDisplay(): React.JSX.Element {
  const state = useGameState();
  const [shaking, setShaking] = useState(false);

  // Pitfall 3: depend on errorKey, not errorMsg — re-triggers for identical error strings
  useEffect(() => {
    if (state.errorKey > 0) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 400);
      return () => clearTimeout(t);
    }
  }, [state.errorKey]);

  const isEmpty = state.currentWord.length === 0;
  const displayText = isEmpty ? '—' : state.currentWord.toUpperCase();
  const wordClass = [
    'word-display',
    shaking ? 'shake' : '',
    isEmpty ? 'word-display--placeholder' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="word-display-area">
      <div className={wordClass}>
        {displayText}
      </div>
      {/* Error message — always in DOM so screen readers announce it */}
      <p className="error-msg" role="alert">
        {state.errorMsg ?? ''}
      </p>
    </div>
  );
}
