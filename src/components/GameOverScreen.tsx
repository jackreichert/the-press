/**
 * src/components/GameOverScreen.tsx
 * Replaces the letter grid when all words are found (D-18).
 * Shows: final rank name, final score, total words found, pangram count.
 *
 * Format (game-over__rank + game-over__score):
 *   {Rank Name}
 *   Score: N | N words | N pangrams
 *
 * GAME-05: Pangram count derived via isFoundWordPangram().
 * D-17: Daily streak omitted entirely from Phase 2.
 * Phase 3 will add share button below the score summary.
 */

import React from 'react';
import { useGameState } from '../context/GameContext';
import { getRank } from '../utils/scoring';
import { isFoundWordPangram } from '../utils/puzzle';

// ─── Component ────────────────────────────────────────────────────────────────

export function GameOverScreen(): React.JSX.Element {
  const state = useGameState();
  const { score, maxScore, foundWords, allWords, puzzle } = state;

  const rank = getRank(score, maxScore, foundWords.length, allWords.length);

  // GAME-05: count pangrams in found words
  const pangramCount = puzzle
    ? foundWords.filter(w => isFoundWordPangram(w, puzzle)).length
    : 0;

  return (
    <div className="game-over">
      <div className="game-over__rank">{rank.name}</div>
      <div className="game-over__score">
        Score: {score} | {foundWords.length} words | {pangramCount} pangrams
      </div>
    </div>
  );
}
