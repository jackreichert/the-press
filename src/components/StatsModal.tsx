/**
 * src/components/StatsModal.tsx
 * Modal overlay showing player stats (STOR-03).
 * D-10: Opens when player taps streak counter in ScoreBar.
 * D-11: Shows streak, games played, and average score only.
 * Structure mirrors FoundWordsModal exactly.
 */

import React, { useRef } from 'react';
import { computeStats } from '../utils/stats';
import { readHistory } from '../storage';
import { useFocusTrap } from '../hooks/useFocusTrap';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StatsModalProps {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatsModal({ onClose }: StatsModalProps): React.JSX.Element {
  const stats = computeStats(readHistory());
  const cardRef = useRef<HTMLDivElement>(null);

  useFocusTrap(cardRef, onClose);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        ref={cardRef}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
      >
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Close stats"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>
        <h2 id="stats-title" className="modal-title">Your Stats</h2>
        <div className="stats-list">
          <div className="stats-item">
            <span className="stat-label">Streak</span>
            <span className="stat-value" aria-label={`${stats.streak} days`}>
              {stats.streak} days
            </span>
          </div>
          <div className="stats-item">
            <span className="stat-label">Games Played</span>
            <span className="stat-value" aria-label={`${stats.gamesPlayed} games played`}>
              {stats.gamesPlayed}
            </span>
          </div>
          <div className="stats-item">
            <span className="stat-label">Avg Score</span>
            <span className="stat-value" aria-label={`Average score ${stats.avgScore}`}>
              {stats.avgScore}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
