/**
 * src/components/ScoreBar.tsx
 * Displays current rank, rank progress bar, and score/word count.
 * Tapping the rank name opens a popover with all rank thresholds.
 * A subtle inline hint shows pts needed for the next rank.
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { getRank, getProgressPct, getRankLadder } from '../utils/scoring';
import { useGameState } from '../context/GameContext';
import { computeStats } from '../utils/stats';
import { readHistory } from '../storage';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScoreBarProps {
  onOpenModal: () => void;
  onOpenStats: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreBar({ onOpenModal, onOpenStats }: ScoreBarProps): React.JSX.Element {
  const state = useGameState();
  const { score, maxScore, foundWords, allWords } = state;
  const [ladderOpen, setLadderOpen] = useState(false);
  const rankBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const rank = getRank(score, maxScore, foundWords.length, allWords.length);
  const fillPct = getProgressPct(score, maxScore);
  const streak = useMemo(() => computeStats(readHistory()).streak, []);
  const ladder = useMemo(() => (maxScore > 0 ? getRankLadder(maxScore) : null), [maxScore]);

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!ladderOpen) return;
    function handleMouseDown(e: MouseEvent): void {
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (rankBtnRef.current?.contains(e.target as Node)) return;
      setLadderOpen(false);
    }
    function handleKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        setLadderOpen(false);
        rankBtnRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [ladderOpen]);

  // Inline next-rank hint
  const ptsToNext = maxScore > 0 ? Math.ceil((rank.next / 100) * maxScore) - score : 0;
  const nextHint = (() => {
    if (!maxScore || rank.name === 'Grand Colophon') return null;
    if (rank.name === 'Publisher') return 'Find all words for Grand Colophon';
    if (ptsToNext > 0) return `${ptsToNext} pt${ptsToNext === 1 ? '' : 's'} to ${rank.nextName}`;
    return null;
  })();

  return (
    <div className="score-bar">
      <div className="rank-name-row">
        <button
          ref={rankBtnRef}
          className="rank-name rank-name--btn"
          onClick={() => setLadderOpen(o => !o)}
          type="button"
          aria-label="Show rank thresholds"
          aria-expanded={ladderOpen}
          disabled={!maxScore}
        >
          {rank.name}
          {maxScore > 0 && (
            <span className="rank-name__caret" aria-hidden="true">
              {ladderOpen ? ' ▴' : ' ▾'}
            </span>
          )}
        </button>

        {ladderOpen && ladder && (
          <div ref={popoverRef} className="rank-popover">
            <ul className="rank-popover__list">
              {ladder.map(({ name, pts }) => {
                const isCurrent = rank.name === name;
                return (
                  <li
                    key={name}
                    className={`rank-popover__item${isCurrent ? ' rank-popover__item--current' : ''}`}
                  >
                    <span className="rank-popover__name">{name}</span>
                    <span className="rank-popover__pts">{pts} pts</span>
                  </li>
                );
              })}
              <li className={`rank-popover__item rank-popover__item--colophon${rank.name === 'Grand Colophon' ? ' rank-popover__item--current' : ''}`}>
                <span className="rank-popover__name">Grand Colophon</span>
                <span className="rank-popover__pts">all words</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="rank-progress" aria-label="Progress toward next rank">
        <div
          className="rank-progress__fill"
          style={{ '--fill-pct': fillPct / 100 } as React.CSSProperties}
          role="progressbar"
          aria-valuenow={Math.round(fillPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {nextHint && <p className="rank-next-hint">{nextHint}</p>}

      <div className="score-bar__bottom">
        <button
          className="score-count"
          onClick={onOpenModal}
          type="button"
          aria-label={`Score ${score}, ${foundWords.length} words found. Tap to see found words.`}
        >
          Score: {score} · {foundWords.length} words ▾
        </button>
        <button
          className="streak-counter"
          onClick={onOpenStats}
          type="button"
          aria-label={`Streak: ${streak} days. Tap to see stats.`}
        >
          ❧ {streak}
        </button>
      </div>
    </div>
  );
}
