/**
 * src/components/GameOverScreen.tsx
 * Replaces the letter grid when all words are found (D-18).
 * Phase 3 adds: share button with clipboard API + 2s "Copied!" feedback + textarea fallback.
 *
 * D-13: Share button below .game-over__score.
 * D-14: Share text format: "The Press — YYYY-MM-DD\n{Rank} — Score: N | N/N words | N pangrams"
 * D-15: navigator.clipboard.writeText() with 2s revert; textarea fallback on failure.
 * D-16: Share button only rendered when gameOver === true (always true in this component's context).
 */

import React, { useState } from 'react';
import { useGameState } from '../context/GameContext';
import { getRank } from '../utils/scoring';
import { isFoundWordPangram } from '../utils/puzzle';
import { getPuzzleDateStr } from '../utils/date';

// ─── Props ────────────────────────────────────────────────────────────────────

interface GameOverScreenProps {
  epochRef: React.RefObject<string | null>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GameOverScreen({ epochRef }: GameOverScreenProps): React.JSX.Element {
  const state = useGameState();
  const { score, maxScore, foundWords, allWords, puzzle } = state;

  const rank = getRank(score, maxScore, foundWords.length, allWords.length);

  const pangramCount = puzzle
    ? foundWords.filter(w => isFoundWordPangram(w, puzzle)).length
    : 0;

  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackText, setFallbackText] = useState('');

  function buildShareText(): string {
    const date = (epochRef.current && puzzle)
      ? getPuzzleDateStr(epochRef.current, puzzle.index)
      : '—';
    return `The Press — ${date}\n${rank.name} — Score: ${score} | ${foundWords.length}/${allWords.length} words | ${pangramCount} pangrams`;
  }

  async function handleShare(): Promise<void> {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFallbackText(text);
      setShowFallback(true);
    }
  }

  return (
    <div className="game-over">
      <div className="game-over__rank">{rank.name}</div>
      <div className="game-over__score">
        Score: {score} | {foundWords.length} words | {pangramCount} pangrams
      </div>
      <button
        className={copied ? 'share-btn share-btn--copied' : 'share-btn'}
        onClick={() => void handleShare()}
        type="button"
        aria-label={copied ? 'Copied to clipboard' : 'Share result'}
      >
        {copied ? 'Copied!' : 'Share Result'}
      </button>
      {showFallback && (
        <textarea
          className="share-fallback"
          readOnly
          value={fallbackText}
          aria-label="Share text — select all and copy"
          rows={3}
        />
      )}
    </div>
  );
}
