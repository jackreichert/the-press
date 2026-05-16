/**
 * src/components/WordDisplay.tsx
 * Shows the word the player is currently building.
 * GAME-03: shake animation on invalid submission.
 * Pitfall 3: depends on errorKey (not errorMsg string) for shake re-trigger.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext';
import { isFoundWordPangram } from '../utils/puzzle';
import { scoreWord } from '../utils/scoring';

export function WordDisplay(): React.JSX.Element {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [shaking, setShaking] = useState(false);
  const [foundWord, setFoundWord] = useState<string | null>(null);
  const [foundPts, setFoundPts] = useState(0);
  const [foundPangram, setFoundPangram] = useState(false);
  const prevFoundRef = useRef<string[]>([]);

  useEffect(() => {
    if (state.errorKey > 0) {
      setShaking(true);
      const shakeTimer = setTimeout(() => setShaking(false), 400);
      const clearTimer = setTimeout(() => dispatch({ type: 'WORD_CLEAR' }), 700);
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [state.errorKey, dispatch]);

  // When foundWords grows, show the new word briefly before display resets
  useEffect(() => {
    const prev = prevFoundRef.current;
    const curr = state.foundWords;
    if (curr.length === prev.length + 1 && state.puzzle) {
      const newWord = curr.find(w => !prev.includes(w));
      if (newWord) {
        const pangram = isFoundWordPangram(newWord, state.puzzle);
        setFoundWord(newWord);
        setFoundPts(scoreWord(newWord, pangram));
        setFoundPangram(pangram);
        const t = setTimeout(() => setFoundWord(null), 950);
        prevFoundRef.current = [...curr];
        return () => clearTimeout(t);
      }
    }
    prevFoundRef.current = [...curr];
  }, [state.foundWords, state.puzzle]);

  const isEmpty = state.currentWord.length === 0;
  const displayText = isEmpty ? '—' : state.currentWord.toUpperCase();
  const wordClass = [
    'word-display',
    shaking ? 'shake' : '',
    foundWord ? (foundPangram ? 'word-display--pangram' : 'word-display--found') : '',
    !foundWord && isEmpty ? 'word-display--placeholder' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="word-display-area">
      <div className={wordClass}>
        {foundWord ? foundWord.toUpperCase() : displayText}
      </div>
      {foundWord ? (
        <p className={`found-label${foundPangram ? ' found-label--pangram' : ''}`} role="status">
          {foundPangram ? '✦ Pangram  ' : ''} +{foundPts}
        </p>
      ) : (
        <p className="error-msg" role="alert">
          {state.errorMsg ?? ''}
        </p>
      )}
    </div>
  );
}
