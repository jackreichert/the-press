/**
 * src/components/GameOverScreen.tsx
 * Replaces the letter grid when game is over (all words found or player revealed).
 * When revealed: shows words the player missed alongside their found words.
 * When hasPendingToday: shows "Play Today's Puzzle →" button.
 */

import React from 'react';
import { useGameState } from '../context/GameContext';
import { isFoundWordPangram } from '../utils/puzzle';
import { getPuzzleDateStr } from '../utils/date';
import { formatShareDate, buildProgressBar, useShare } from '../utils/share';
import { RANK } from '../utils/scoring';

interface GameOverScreenProps {
  epochRef: React.RefObject<string | null>;
  onPlayToday?: () => void;
}

export function GameOverScreen({ epochRef, onPlayToday }: GameOverScreenProps): React.JSX.Element {
  const state = useGameState();
  const { score, maxScore, foundWords, allWords, puzzle, revealed } = state;

  const pangramCount = puzzle
    ? foundWords.filter(w => isFoundWordPangram(w, puzzle)).length
    : 0;

  const foundSet = new Set(foundWords);
  const sortedAllWords = revealed ? [...allWords].sort() : [];

  const { copied, showFallback, fallbackText, handleShare: shareHandleShare } = useShare();

  function buildShareText(): string {
    const date = (epochRef.current && puzzle)
      ? formatShareDate(getPuzzleDateStr(epochRef.current, puzzle.index))
      : '—';
    const bar = buildProgressBar(score, maxScore);
    const rankLine = revealed ? RANK.UNRANKED : `✦ ${RANK.GRAND_COLOPHON.toUpperCase()}`;
    const pangramLine = pangramCount > 0 ? `  ✦ ${pangramCount} pangram${pangramCount !== 1 ? 's' : ''}` : '';
    const rule = '━━━━━━━━━━━━━━━━━━━━━';
    return [
      `The Press · ${date}`,
      rule,
      `  ${rankLine}`,
      `  ${bar} ${score} pts`,
      `  All ${foundWords.length} words${pangramLine}`,
      rule,
      `  thepress.app`,
    ].join('\n');
  }

  function handleShare(): Promise<void> {
    return shareHandleShare(buildShareText());
  }

  return (
    <div className="game-over">
      <div className={`game-over__rank${revealed ? '' : ' game-over__rank--colophon'}`}>
        {revealed ? 'Better luck next time' : RANK.GRAND_COLOPHON}
      </div>
      {!revealed && <p className="game-over__colophon-badge">✦ All words found</p>}
      <div className="game-over__score">
        Score: {score} · {foundWords.length}/{allWords.length} words · {pangramCount} pangram{pangramCount !== 1 ? 's' : ''}
      </div>

      {/* All words revealed — found ones highlighted, missed ones greyed */}
      {sortedAllWords.length > 0 && (
        <div className="game-over__missed">
          <p className="game-over__missed-label">All words</p>
          <ul className="game-over__missed-list">
            {sortedAllWords.map(w => {
              const isPangram = puzzle ? isFoundWordPangram(w, puzzle) : false;
              const wasFound = foundSet.has(w);
              const cls = [
                'game-over__missed-word',
                wasFound ? 'game-over__missed-word--found' : '',
                isPangram ? 'game-over__missed-word--pangram' : '',
              ].filter(Boolean).join(' ');
              return <li key={w} className={cls}>{w}</li>;
            })}
          </ul>
        </div>
      )}

      {onPlayToday ? (
        <button
          className="play-today-btn"
          onClick={onPlayToday}
          type="button"
        >
          Play today's puzzle →
        </button>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
