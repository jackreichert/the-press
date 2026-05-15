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
import { readState, saveState, clearState, appendHistory } from './storage';
import type { HistoryEntry } from './storage';
import { ScoreBar } from './components/ScoreBar';
import { WordDisplay } from './components/WordDisplay';
import { LetterGrid } from './components/LetterGrid';
import { ActionRow } from './components/ActionRow';
import { FoundWordsModal } from './components/FoundWordsModal';
import { GameOverScreen } from './components/GameOverScreen';
import { StatsModal } from './components/StatsModal';
import type { Schedule } from './types';

// ─── Game layout ─────────────────────────────────────────────────────────────

interface GameLayoutProps {
  epochRef: React.RefObject<string | null>;
}

/** Inner component: reads game state and composes the UI. Must be inside GameProvider. */
function GameLayout({ epochRef }: GameLayoutProps): React.JSX.Element {
  const state = useGameState();
  const [modalOpen, setModalOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

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
    const rank = getRank(state.score, state.maxScore, state.foundWords.length, state.allWords.length);
    const entry: HistoryEntry = {
      date,
      score: state.score,
      rank: rank.name,
      foundCount: state.foundWords.length,
      totalCount: state.allWords.length,
      completed: true,
    };
    appendHistory(entry);
    clearState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameOver]);

  // D-07: Show plain loading text while schedule is pending
  if (!state.puzzle && !state.scheduleError) {
    return <p className="loading-state">Loading puzzle...</p>;
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
      {/* Score bar — tapping word count opens found-words modal; tapping streak opens stats */}
      <ScoreBar onOpenModal={() => setModalOpen(true)} onOpenStats={() => setStatsOpen(true)} />

      {/* Word-in-progress display above grid (D-03) */}
      <WordDisplay />

      {/* D-18: game-over screen replaces grid + action row when all words found */}
      {state.gameOver ? (
        <GameOverScreen epochRef={epochRef} />
      ) : (
        <>
          {/* 2-3-2 letter grid with hidden keyboard input (D-10) */}
          <LetterGrid />

          {/* Delete | Shuffle | Enter buttons (D-04, D-05) */}
          <ActionRow />
        </>
      )}

      {/* Found words modal (D-11, D-12, D-13) */}
      {modalOpen && <FoundWordsModal onClose={() => setModalOpen(false)} />}

      {/* Stats modal (STOR-03 — D-10) */}
      {statsOpen && <StatsModal onClose={() => setStatsOpen(false)} />}
    </div>
  );
}

// ─── Data loader ──────────────────────────────────────────────────────────────

/** Wrapper component: owns data loading side-effects; renders GameLayout inside GameProvider. */
function AppLoader(): React.JSX.Element {
  const dispatch = useGameDispatch();
  // epochRef captures schedule.epoch — PuzzleEntry has no date field (Research finding)
  const epochRef = useRef<string | null>(null);

  const loadData = useCallback((): (() => void) => {
    let cancelled = false;

    async function fetchPuzzle(): Promise<void> {
      try {
        const schedRes = await fetch('/schedule.json');
        if (!schedRes.ok) throw new Error(`schedule fetch failed: ${schedRes.status}`);
        const schedule: Schedule = await schedRes.json() as Schedule;

        // D-06: compute today's puzzle index using local midnight (not UTC)
        const index = getTodayPuzzleIndex(schedule.epoch);
        const puzzle = schedule.puzzles[index];

        // T-02-17: guard against out-of-bounds index (> 730 days after epoch)
        if (!puzzle) {
          if (!cancelled) dispatch({ type: 'SCHEDULE_ERROR' });
          return;
        }

        if (!cancelled) {
          dispatch({ type: 'PUZZLE_LOADED', puzzle });
          // Capture epoch after schedule resolves — PuzzleEntry has no epoch field
          epochRef.current = schedule.epoch;
        }

        // D-06: dictionary loads in parallel — do NOT await; grid renders before dict resolves
        fetch('/dictionary.json')
          .then(r => {
            if (!r.ok) throw new Error(`dictionary fetch failed: ${r.status}`);
            return r.json() as Promise<string[]>;
          })
          .then((words: string[]) => {
            if (!cancelled) {
              dispatch({ type: 'DICT_LOADED', words });
              // STOR-01: check storage AFTER DICT_LOADED so allWords is populated (Research Pitfall 2)
              const stored = readState();
              if (stored && stored.puzzleIndex === index) {
                // Today's puzzle — restore found words and score
                dispatch({ type: 'RESTORE_STATE', foundWords: stored.foundWords, score: stored.score });
              } else if (stored && stored.foundWords.length > 0 && epochRef.current) {
                // New day, previous day had words — save as partial history entry (D-06)
                const date = getPuzzleDateStr(epochRef.current, stored.puzzleIndex);
                const partialEntry: HistoryEntry = {
                  date,
                  score: stored.score,
                  rank: getRank(stored.score, 0, stored.foundWords.length, 0).name,
                  foundCount: stored.foundWords.length,
                  totalCount: 0,
                  completed: false,
                };
                appendHistory(partialEntry);
                clearState();
              }
            }
          })
          .catch(() => {
            if (!cancelled) dispatch({ type: 'DICT_ERROR' });
          });

      } catch {
        // D-08: no silent failures — dispatch error action for UI to show retry
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

  return <GameLayout epochRef={epochRef} />;
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  return (
    <GameProvider>
      <AppLoader />
    </GameProvider>
  );
}
