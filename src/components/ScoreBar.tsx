/**
 * src/components/ScoreBar.tsx
 * Displays current rank, rank progress bar, and score/word count.
 * The score/word-count area is a tappable button that opens the found-words modal (D-12).
 *
 * SCOR-02: 10-tier rank display.
 * SCOR-03: Rank progress bar.
 * D-16: Progress bar fill = getProgressPct() formula.
 * Pre-dict guard: shows "—" for rank name when maxScore === 0 (dict not loaded yet).
 * D-17: Daily streak omitted entirely from Phase 2.
 */

import React, { useMemo } from 'react';
import { getRank, getProgressPct } from '../utils/scoring';
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

  // getRank returns { name: '—', current: 0, next: 0 } when maxScore === 0 (pre-dict guard)
  const rank = getRank(score, maxScore, foundWords.length, allWords.length);
  const fillPct = getProgressPct(score, maxScore);
  const streak = useMemo(() => computeStats(readHistory()).streak, []);

  return (
    <div className="score-bar">
      <div className="rank-name">{rank.name}</div>
      <div className="rank-progress" aria-label="Progress toward next rank">
        <div
          className="rank-progress__fill"
          style={{ width: `${fillPct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(fillPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="score-bar__bottom">
        {/* Tappable score/count area opens found-words modal (D-12) */}
        <button
          className="score-count"
          onClick={onOpenModal}
          type="button"
          aria-label={`Score ${score}, ${foundWords.length} words found. Tap to see found words.`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
        >
          Score: {score} · {foundWords.length}/{allWords.length} words ▾
        </button>
        {/* Streak counter — separate tap target opens stats modal (D-12) */}
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
