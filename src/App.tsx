/**
 * src/App.tsx
 * Top-level component. Orchestrates data loading and renders the game.
 *
 * Data loading contract (D-06, D-07, D-08, D-09):
 *   1. fetch('/schedule.json') first — grid waits on this.
 *   2. Grid renders immediately after PUZZLE_LOADED dispatch.
 *   3. fetch('/dictionary.json') starts in parallel after schedule resolves (no await).
 *   4. Submit disabled until DICT_LOADED dispatch.
 *
 * Persistence (STOR-01, STOR-02):
 *   - After DICT_LOADED: check localStorage. If today's state exists, dispatch RESTORE_STATE.
 *     If previous day had words, save partial history entry then clear.
 *   - save-on-submit: useEffect on [foundWords, score] writes to localStorage.
 *   - save-on-gameOver: useEffect on [gameOver] appends history entry + clears state.
 *
 * Layout (D-10): ScoreBar → WordDisplay → LetterGrid → ActionRow
 * Game-over (D-18): LetterGrid + ActionRow replaced by GameOverScreen
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GameProvider, useGameState, useGameDispatch } from './context/GameContext';
import { getTodayPuzzleIndex, getPuzzleDateStr } from './utils/date';
import { getRank } from './utils/scoring';
import { readState, saveState, clearState, appendHistory, readPending, savePending, clearPending } from './storage';
import type { HistoryEntry } from './storage';
import { deriveWordSet } from './utils/puzzle';
import { computeMaxScore } from './utils/scoring';
import { ScoreBar } from './components/ScoreBar';
import { WordDisplay } from './components/WordDisplay';
import { LetterGrid } from './components/LetterGrid';
import { ActionRow } from './components/ActionRow';
import { FoundWordsModal } from './components/FoundWordsModal';
import { GameOverScreen } from './components/GameOverScreen';
import { EditorWinModal } from './components/EditorWinModal';
import { StatsModal } from './components/StatsModal';
import type { Schedule, PuzzleEntry } from './types';

// ─── Game layout ─────────────────────────────────────────────────────────────

interface GameLayoutProps {
  epochRef: React.RefObject<string | null>;
  onPlayToday: () => void;
  newDayAvailable: boolean;
}

/** Inner component: reads game state and composes the UI. Must be inside GameProvider. */
function GameLayout({ epochRef, onPlayToday, newDayAvailable }: GameLayoutProps): React.JSX.Element {
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
    if (rank.name === '—') return;
    if (!initialRankSeenRef.current) {
      initialRankSeenRef.current = true;
      prevRankRef.current = rank.name;
      return;
    }
    if (prevRankRef.current !== 'Laureate' && rank.name === 'Laureate') {
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
    if (!state.gameOver || !state.puzzle || !epochRef.current) return;
    const date = getPuzzleDateStr(epochRef.current, state.puzzle.index);
    const rankName = (!state.revealed && state.foundWords.length === state.allWords.length)
      ? 'Grand Colophon'
      : getRank(state.score, state.maxScore).name;
    const entry: HistoryEntry = {
      date,
      score: state.score,
      rank: rankName,
      foundCount: state.foundWords.length,
      totalCount: state.allWords.length,
      completed: !state.revealed,
    };
    appendHistory(entry);
    clearState();
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
        <GameOverScreen epochRef={epochRef} onPlayToday={state.hasPendingToday ? onPlayToday : undefined} />
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
        <EditorWinModal epochRef={epochRef} onKeepPlaying={() => setEditorWinOpen(false)} />
      )}
    </div>
  );
}

// ─── Data loader ──────────────────────────────────────────────────────────────

/** Wrapper component: owns data loading side-effects; renders GameLayout inside GameProvider. */
function AppLoader(): React.JSX.Element {
  const dispatch = useGameDispatch();
  const epochRef = useRef<string | null>(null);
  // Holds today's puzzle data when the player is finishing a previous day's puzzle first
  const todayDataRef = useRef<{ puzzle: PuzzleEntry; words: string[]; index: number } | null>(null);
  // Tracks the puzzle index that was "today" at load time — used for new-day detection
  const loadedTodayIndexRef = useRef<number | null>(null);
  const [newDayAvailable, setNewDayAvailable] = useState(false);

  const onPlayToday = useCallback(() => {
    const data = todayDataRef.current;
    if (!data) return;
    clearPending();
    clearState();
    const { words } = deriveWordSet(data.puzzle, data.words);
    const maxScore = computeMaxScore(words, data.puzzle);
    dispatch({
      type: 'SWITCH_PUZZLE',
      puzzle: data.puzzle,
      allWords: words,
      maxScore,
      dict: new Set(data.words),
    });
  }, [dispatch]);

  const loadData = useCallback((): (() => void) => {
    let cancelled = false;

    async function fetchPuzzle(): Promise<void> {
      try {
        const schedRes = await fetch(`${import.meta.env.BASE_URL}schedule.json`);
        if (!schedRes.ok) throw new Error(`schedule fetch failed: ${schedRes.status}`);
        const schedule: Schedule = await schedRes.json() as Schedule;

        const todayIndex = getTodayPuzzleIndex(schedule.epoch);
        loadedTodayIndexRef.current = todayIndex;
        const todayPuzzle = schedule.puzzles[todayIndex];

        if (!todayPuzzle) {
          if (!cancelled) dispatch({ type: 'SCHEDULE_ERROR' });
          return;
        }

        // Check for a carryover: stored state from a previous day still in progress
        const stored = readState();
        const pending = readPending();
        const isCarryover = stored && stored.puzzleIndex !== todayIndex && stored.foundWords.length > 0;
        const isResumingCarryover = pending && stored && stored.puzzleIndex !== todayIndex;

        let activePuzzle = todayPuzzle;
        let activeIndex = todayIndex;

        if (isCarryover || isResumingCarryover) {
          // Load the unfinished previous puzzle instead of today's
          const prevPuzzle = schedule.puzzles[stored!.puzzleIndex];
          if (prevPuzzle) {
            activePuzzle = prevPuzzle;
            activeIndex = stored!.puzzleIndex;
            // Store today's puzzle for later
            todayDataRef.current = { puzzle: todayPuzzle, words: [], index: todayIndex };
            if (!pending) savePending({ puzzleIndex: todayIndex });
          }
        }

        if (!cancelled) {
          dispatch({ type: 'PUZZLE_LOADED', puzzle: activePuzzle });
          epochRef.current = schedule.epoch;
          // Pre-store today's puzzle reference so onPlayToday has it before dict loads
          if (!todayDataRef.current) {
            todayDataRef.current = { puzzle: todayPuzzle, words: [], index: todayIndex };
          }
        }

        fetch(`${import.meta.env.BASE_URL}dictionary.json`)
          .then(r => {
            if (!r.ok) throw new Error(`dictionary fetch failed: ${r.status}`);
            return r.json() as Promise<string[]>;
          })
          .then((words: string[]) => {
            if (!cancelled) {
              // Update todayDataRef with the loaded word list
              if (todayDataRef.current) todayDataRef.current.words = words;

              dispatch({ type: 'DICT_LOADED', words });

              if (stored && stored.puzzleIndex === activeIndex) {
                // Restore progress for the active puzzle
                dispatch({ type: 'RESTORE_STATE', foundWords: stored.foundWords, score: stored.score });
              }

              if (isCarryover || isResumingCarryover) {
                // Signal that today's puzzle is waiting
                dispatch({ type: 'SET_PENDING_TODAY' });
              }
            }
          })
          .catch(() => {
            if (!cancelled) dispatch({ type: 'DICT_ERROR' });
          });

      } catch {
        if (!cancelled) dispatch({ type: 'SCHEDULE_ERROR' });
      }
    }

    void fetchPuzzle();
    return () => { cancelled = true; };
  }, [dispatch]);

  useEffect(() => {
    const cleanup = loadData();
    return cleanup;
  }, [loadData]);

  // New-day detection: when the app is foregrounded, check if the date rolled over.
  // Uses refs so the handler never goes stale and needs no deps.
  useEffect(() => {
    function handleVisibilityChange(): void {
      if (document.visibilityState !== 'visible') return;
      if (epochRef.current === null || loadedTodayIndexRef.current === null) return;
      const currentTodayIndex = getTodayPuzzleIndex(epochRef.current);
      if (currentTodayIndex !== loadedTodayIndexRef.current) {
        setNewDayAvailable(true);
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return <GameLayout epochRef={epochRef} onPlayToday={onPlayToday} newDayAvailable={newDayAvailable} />;
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  return (
    <GameProvider>
      <AppLoader />
    </GameProvider>
  );
}
