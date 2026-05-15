/**
 * src/components/StatsModal.tsx
 * Modal overlay showing player stats (STOR-03).
 * D-10: Opens when player taps streak counter in ScoreBar.
 * D-11: Shows streak, games played, and average score only.
 * Structure mirrors FoundWordsModal exactly.
 */

import React from 'react';
import { computeStats } from '../utils/stats';
import { readHistory } from '../storage';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StatsModalProps {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatsModal({ onClose }: StatsModalProps): React.JSX.Element {
  const stats = computeStats(readHistory());

  function handleOverlayClick(): void {
    onClose();
  }

  function handleCardClick(e: React.MouseEvent): void {
    e.stopPropagation();
  }

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Player stats"
    >
      <div className="modal-card" onClick={handleCardClick}>
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Close stats"
        >
          ✕
        </button>
        <h2 className="modal-title">Your Stats</h2>
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
