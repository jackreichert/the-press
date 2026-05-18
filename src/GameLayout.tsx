/**
 * src/GameLayout.tsx
 * Composes the game UI from state. Must be rendered inside GameProvider.
 * Owns modal state, Laureate win detection, keyboard capture, and persistence effects.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useGameState, useGameDispatch } from './context/GameContext';
import { getPuzzleDateStr } from './utils/date';
import { getRank, RANK } from './utils/scoring';
import { saveState, clearState, appendHistory, readHistory } from './storage';
import type { HistoryEntry, PuzzleEntry } from './types';
import { ScoreBar } from './components/ScoreBar';
import { WordDisplay } from './components/WordDisplay';
import { LetterGrid } from './components/LetterGrid';
import { ActionRow } from './components/ActionRow';
import { FoundWordsModal } from './components/FoundWordsModal';
import { GameOverScreen } from './components/GameOverScreen';
import { EditorWinModal } from './components/EditorWinModal';
import { StatsModal } from './components/StatsModal';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function buildHistoryEntry(
  epoch: string,
  puzzle: PuzzleEntry,
  state: { score: number; foundWords: string[]; allWords: string[]; revealed: boolean; maxScore: number },
): HistoryEntry {
  const isGrandColophon = !state.revealed && state.foundWords.length === state.allWords.length;
  return {
    date: getPuzzleDateStr(epoch, puzzle.index),
    score: state.score,
    rank: isGrandColophon ? RANK.GRAND_COLOPHON : getRank(state.score, state.maxScore).name,
    foundCount: state.foundWords.length,
    totalCount: state.allWords.length,
    completed: !state.revealed,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GameLayoutProps {
  onPlayToday: () => void;
  newDayAvailable: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GameLayout({ onPlayToday, newDayAvailable }: GameLayoutProps): React.JSX.Element {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [modalOpen, setModalOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [editorWinOpen, setEditorWinOpen] = useState(false);

  const rank = getRank(state.score, state.maxScore);
  // Tracks the first stable rank seen after dict load + restore.
  // Only transitions that happen AFTER the initial rank is established trigger the win modal.
  const initialRankSeenRef = useRef(false);
  const prevRankRef = useRef(rank.name);

  // Show Laureate win modal on rank transition — not on initial state restore.
  useEffect(() => {
    if (rank.name === RANK.UNRANKED) return;
    if (!initialRankSeenRef.current) {
      initialRankSeenRef.current = true;
      prevRankRef.current = rank.name;
      return;
    }
    if (prevRankRef.current !== RANK.LAUREATE && rank.name === RANK.LAUREATE) {
      setEditorWinOpen(true);
    }
    prevRankRef.current = rank.name;
  }, [rank.name]);

  // Close editor win overlay when Grand Colophon screen takes over.
  useEffect(() => {
    if (state.gameOver) setEditorWinOpen(false);
  }, [state.gameOver]);

  // Page-level keyboard capture — fires regardless of what element has focus.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent): void {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (modalOpen || statsOpen || state.gameOver || editorWinOpen) return;
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        e.preventDefault();
        dispatch({ type: 'LETTER_APPEND', letter: key });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'LETTER_DELETE' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        dispatch({ type: 'WORD_SUBMIT' });
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [modalOpen, statsOpen, state.gameOver, editorWinOpen, dispatch]);

  // STOR-01: save state on every valid word submission
  useEffect(() => {
    if (!state.dictLoaded || !state.puzzle) return;
    if (state.foundWords.length === 0) return;
    saveState({
      puzzleIndex: state.puzzle.index,
      foundWords: state.foundWords,
      score: state.score,
    });
  }, [state.foundWords, state.score, state.puzzle, state.dictLoaded]);

  // STOR-02: append history entry when game is complete
  useEffect(() => {
    if (!state.gameOver || !state.puzzle || !state.epoch) return;
    const entry = buildHistoryEntry(state.epoch, state.puzzle, state);
    // Guard: if this date is already in history the game-over was restored from
    // localStorage (Grand Colophon reload), not a new win — skip re-appending.
    if (readHistory().some(e => e.date === entry.date)) return;
    appendHistory(entry);
    // For Grand Colophon preserve the saved state so the player can reload and
    // see the win screen for the rest of the day. STOR-01 already wrote it.
    // For revealed endings clear immediately — no reason to restore "better luck".
    const isGrandColophon = entry.completed && entry.foundCount === entry.totalCount;
    if (!isGrandColophon) {
      clearState();
    }
    // Intentionally fire once when gameOver flips — all reads are stable at that
    // point. Re-running on every downstream state change would double-append.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameOver]);

  // D-07: Show plain loading text while schedule is pending
  if (!state.puzzle && !state.scheduleError) {
    return <p className="loading-state">Setting type…</p>;
  }

  // D-08: Show error + Retry when schedule fetch failed
  if (state.scheduleError) {
    return (
      <div className="error-state">
        <p>Failed to load puzzle.</p>
        <button
          className="retry-btn"
          onClick={() => window.location.reload()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      {newDayAvailable && (
        <button
          className="new-day-banner"
          onClick={() => window.location.reload()}
          type="button"
        >
          New puzzle available — tap to reload
        </button>
      )}
      <header className="masthead">
        <h1 className="app-title">
          <a href="/" className="app-title__link">The Press</a>
        </h1>
        <p className="app-subtitle">A Daily Word Puzzle</p>
      </header>
      {/* Score bar — tapping word count opens found-words modal; tapping streak opens stats */}
      <ScoreBar onOpenModal={() => setModalOpen(true)} onOpenStats={() => setStatsOpen(true)} />

      {/* Word-in-progress display above grid (D-03) */}
      <WordDisplay />

      {/* D-18: game-over screen replaces grid + action row when all words found */}
      {state.gameOver ? (
        <GameOverScreen onPlayToday={state.hasPendingToday ? onPlayToday : undefined} />
      ) : (
        <>
          {/* 2-3-2 letter grid with hidden keyboard input (D-10) */}
          <LetterGrid />

          {/* Delete | Shuffle | Enter buttons (D-04, D-05) */}
          <ActionRow />

          {/* Reveal remaining answers — only shown when finishing a previous day's puzzle */}
          {state.hasPendingToday && (
            <button
              className="reveal-btn"
              onClick={() => dispatch({ type: 'REVEAL_REMAINING' })}
              type="button"
            >
              Reveal answers · play today's puzzle →
            </button>
          )}
        </>
      )}

      {/* Found words modal (D-11, D-12, D-13) */}
      {modalOpen && <FoundWordsModal onClose={() => setModalOpen(false)} />}

      {/* Stats modal (STOR-03 — D-10) */}
      {statsOpen && <StatsModal onClose={() => setStatsOpen(false)} />}

      {/* Laureate win modal — dismissible, upgrades to Grand Colophon screen on game over */}
      {editorWinOpen && (
        <EditorWinModal onKeepPlaying={() => setEditorWinOpen(false)} />
      )}

      <footer className="app-footer">
        <a href="/about.html">Privacy &amp; About</a>
      </footer>
    </div>
  );
}
