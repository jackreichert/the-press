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

import { getRank, getProgressPct } from '../utils/scoring';
import { useGameState } from '../context/GameContext';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScoreBarProps {
  onOpenModal: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreBar({ onOpenModal }: ScoreBarProps): JSX.Element {
  const state = useGameState();
  const { score, maxScore, foundWords, allWords } = state;

  // getRank returns { name: '—', current: 0, next: 0 } when maxScore === 0 (pre-dict guard)
  const rank = getRank(score, maxScore, foundWords.length, allWords.length);
  const fillPct = getProgressPct(score, maxScore, foundWords.length, allWords.length);

  return (
    <div className="score-bar">
      <div className="rank-name">{rank.name}</div>
      <div
        className="rank-progress"
        aria-label={`Progress toward next rank`}
      >
        <div
          className="rank-progress__fill"
          style={{ width: `${fillPct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(fillPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {/* Tappable score/count area opens found-words modal (D-12) */}
      <button
        className="score-count"
        onClick={onOpenModal}
        type="button"
        aria-label={`Score ${score}, ${foundWords.length} words found. Tap to see found words.`}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
      >
        Score: {score} · {foundWords.length} words ▾
      </button>
    </div>
  );
}
