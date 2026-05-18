/**
 * src/components/EditorWinModal.tsx
 * Celebratory overlay shown the first time the player reaches Laureate (89%+ score).
 * Dismissible — "Keep Playing" lets them continue toward Grand Colophon.
 */

import React, { useRef } from 'react';
import { useGameState } from '../context/GameContext';
import { isFoundWordPangram } from '../utils/puzzle';
import { getPuzzleDateStr } from '../utils/date';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { formatShareDate, buildProgressBar, useShare } from '../utils/share';

interface EditorWinModalProps {
  epochRef: React.RefObject<string | null>;
  onKeepPlaying: () => void;
}

export function EditorWinModal({ epochRef, onKeepPlaying }: EditorWinModalProps): React.JSX.Element {
  const { score, maxScore, foundWords, allWords, puzzle } = useGameState();
  const cardRef = useRef<HTMLDivElement>(null);
  const { copied, showFallback, fallbackText, handleShare: shareHandleShare } = useShare();

  useFocusTrap(cardRef, onKeepPlaying);

  const bar = buildProgressBar(score, maxScore);
  const pangramCount = puzzle ? foundWords.filter(w => isFoundWordPangram(w, puzzle)).length : 0;
  const wordsLeft = allWords.length - foundWords.length;

  function buildShareText(): string {
    const date = epochRef.current && puzzle
      ? formatShareDate(getPuzzleDateStr(epochRef.current, puzzle.index))
      : '—';
    const pangramLine = pangramCount > 0 ? ` · ✦ ${pangramCount}` : '';
    const rule = '━━━━━━━━━━━━━━━━━━━━━';
    return [
      `The Press · ${date}`,
      rule,
      `  EDITOR IN CHIEF`,
      `  ${bar} ${score} pts`,
      `  ${foundWords.length} words found${pangramLine}`,
      rule,
      `  thepress.app`,
    ].join('\n');
  }

  function handleShare(): Promise<void> {
    return shareHandleShare(buildShareText());
  }

  return (
    <div className="modal-overlay" onClick={onKeepPlaying}>
      <div
        className="modal-card win-modal"
        ref={cardRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="win-modal-title"
      >
        <button className="modal-close" onClick={onKeepPlaying} type="button" aria-label="Keep playing">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        <p className="win-modal__eyebrow">You've reached</p>
        <h2 id="win-modal-title" className="win-modal__headline">Laureate</h2>
        <div className="win-modal__rule" aria-hidden="true" />

        <div className="win-modal__score">
          <span className="win-modal__bar">{bar}</span>
          <span className="win-modal__pts">{score} pts</span>
        </div>
        <p className="win-modal__words">
          {foundWords.length} of {allWords.length} words
          {pangramCount > 0 && <span className="win-modal__pangrams"> · ✦ {pangramCount}</span>}
        </p>

        {wordsLeft > 0 && (
          <p className="win-modal__keep-hint">
            {wordsLeft} word{wordsLeft !== 1 ? 's' : ''} left — find them all for Grand Colophon
          </p>
        )}

        <div className="win-modal__actions">
          <button
            className={copied ? 'share-btn share-btn--copied win-modal__share' : 'share-btn win-modal__share'}
            onClick={() => void handleShare()}
            type="button"
            aria-label={copied ? 'Copied to clipboard' : 'Share result'}
          >
            {copied ? 'Copied!' : 'Share Result'}
          </button>
          <button className="keep-playing-btn" onClick={onKeepPlaying} type="button">
            Keep Playing →
          </button>
        </div>

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
    </div>
  );
}
