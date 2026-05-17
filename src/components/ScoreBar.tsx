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
import { isFoundWordPangram } from '../utils/puzzle';
import { getPuzzleDateStr } from '../utils/date';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScoreBarProps {
  onOpenModal: () => void;
  onOpenStats: () => void;
  epochRef: React.RefObject<string | null>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreBar({ onOpenModal, onOpenStats, epochRef }: ScoreBarProps): React.JSX.Element {
  const state = useGameState();
  const { score, maxScore, foundWords, allWords, puzzle, gameOver, revealed } = state;
  const [ladderOpen, setLadderOpen] = useState(false);
  const rankBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const rank = getRank(score, maxScore, foundWords.length, allWords.length);
  const isGrandColophon = gameOver && !revealed;
  const displayRankName = isGrandColophon ? 'Grand Colophon' : rank.name;
  const fillPct = isGrandColophon ? 100 : getProgressPct(score, maxScore);
  const streak = useMemo(() => computeStats(readHistory()).streak, []);
  const ladder = useMemo(() => (maxScore > 0 ? getRankLadder(maxScore) : null), [maxScore]);

  // Show Grand Colophon score the day after someone found all words
  const yesterdayColophonScore = useMemo(() => {
    const history = readHistory();
    if (history.length === 0) return null;
    const last = history[history.length - 1];
    if (last.foundCount !== last.totalCount) return null;
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const ys = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return last.date === ys ? last.score : null;
  }, []);

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
    if (!maxScore || gameOver || rank.name === 'Laureate') return null;
    if (ptsToNext > 0 && rank.nextName) return `${ptsToNext} pt${ptsToNext === 1 ? '' : 's'} to ${rank.nextName}`;
    return null;
  })();

  const laureateTarget = maxScore > 0 ? Math.ceil(0.84 * maxScore) : 0;

  const [shareCopied, setShareCopied] = useState(false);

  function buildShareText(): string {
    const date = epochRef.current && puzzle
      ? (() => {
          const iso = getPuzzleDateStr(epochRef.current, puzzle.index);
          const [y, m, d] = iso.split('-').map(Number);
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          return `${months[m - 1]} ${d}, ${y}`;
        })()
      : '—';
    const filled = maxScore > 0 ? Math.round((score / maxScore) * 10) : 0;
    const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);
    const pangramCount = puzzle ? foundWords.filter(w => isFoundWordPangram(w, puzzle)).length : 0;
    const pangramLine = pangramCount > 0 ? ` · ✦ ${pangramCount}` : '';
    const rule = '━━━━━━━━━━━━━━━━━━━━━';
    return [
      `The Press · ${date}`,
      rule,
      `  ${displayRankName.toUpperCase()}`,
      `  ${bar}`,
      `  ${foundWords.length} words · ${isGrandColophon ? `${score}` : `${score}/${laureateTarget}`} pts${pangramLine}`,
      rule,
      `  thepress.app`,
    ].join('\n');
  }

  async function handleShare(): Promise<void> {
    const text = buildShareText();
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* silent fail */ }
  }

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
          disabled={!maxScore || isGrandColophon}
        >
          {displayRankName}
          {maxScore > 0 && !isGrandColophon && (
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
      {yesterdayColophonScore !== null && (
        <p className="rank-next-hint rank-next-hint--colophon">Grand Colophon yesterday · {yesterdayColophonScore} pts</p>
      )}

      <div className="score-bar__bottom">
        <button
          className="score-count"
          onClick={onOpenModal}
          type="button"
          aria-label={`${foundWords.length} words found, score ${score}${isGrandColophon ? '' : ` of ${laureateTarget}`}. Tap to see found words.`}
        >
          {foundWords.length} words · {isGrandColophon ? `${score}` : `${score}/${laureateTarget}`} pts ▾
        </button>
        <div className="score-bar__right">
          {foundWords.length > 0 && (
            <button
              className={`share-inline${shareCopied ? ' share-inline--copied' : ''}`}
              onClick={() => void handleShare()}
              type="button"
              aria-label={shareCopied ? 'Copied to clipboard' : 'Share result'}
            >
              {shareCopied ? '✓' : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 1v8M4 4l3-3 3 3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" />
                </svg>
              )}
            </button>
          )}
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
    </div>
  );
}
