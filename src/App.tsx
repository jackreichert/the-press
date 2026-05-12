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
 * Layout (D-10): ScoreBar → WordDisplay → LetterGrid → ActionRow
 * Game-over (D-18): LetterGrid + ActionRow replaced by GameOverScreen
 */

import { useEffect, useState, useCallback } from 'react';
import { GameProvider, useGameState, useGameDispatch } from './context/GameContext';
import { getTodayPuzzleIndex } from './utils/date';
import { ScoreBar } from './components/ScoreBar';
import { WordDisplay } from './components/WordDisplay';
import { LetterGrid } from './components/LetterGrid';
import { ActionRow } from './components/ActionRow';
import { FoundWordsModal } from './components/FoundWordsModal';
import { GameOverScreen } from './components/GameOverScreen';
import type { Schedule } from './types';

// ─── Game layout ─────────────────────────────────────────────────────────────

/** Inner component: reads game state and composes the UI. Must be inside GameProvider. */
function GameLayout(): React.JSX.Element {
  const state = useGameState();
  const [modalOpen, setModalOpen] = useState(false);

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
      {/* Score bar — tapping opens found-words modal (D-12) */}
      <ScoreBar onOpenModal={() => setModalOpen(true)} />

      {/* Word-in-progress display above grid (D-03) */}
      <WordDisplay />

      {/* D-18: game-over screen replaces grid + action row when all words found */}
      {state.gameOver ? (
        <GameOverScreen />
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
    </div>
  );
}

// ─── Data loader ──────────────────────────────────────────────────────────────

/** Wrapper component: owns data loading side-effects; renders GameLayout inside GameProvider. */
function AppLoader(): React.JSX.Element {
  const dispatch = useGameDispatch();

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
        }

        // D-06: dictionary loads in parallel — do NOT await; grid renders before dict resolves
        fetch('/dictionary.json')
          .then(r => {
            if (!r.ok) throw new Error(`dictionary fetch failed: ${r.status}`);
            return r.json() as Promise<string[]>;
          })
          .then((words: string[]) => {
            if (!cancelled) dispatch({ type: 'DICT_LOADED', words });
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

  return <GameLayout />;
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  return (
    <GameProvider>
      <AppLoader />
    </GameProvider>
  );
}
