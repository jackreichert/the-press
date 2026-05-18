/**
 * src/AppLoader.tsx
 * Data loading orchestration. Owns the schedule + dictionary fetches, carryover
 * detection, persistence restore, and new-day detection. Renders GameLayout.
 *
 * Data loading contract (D-06, D-07, D-08, D-09):
 *   1. fetch('/schedule.json') first — grid waits on this.
 *   2. Grid renders immediately after PUZZLE_LOADED dispatch.
 *   3. fetch('/dictionary.json') starts in parallel after schedule resolves.
 *   4. Submit disabled until DICT_LOADED dispatch.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameDispatch } from './context/GameContext';
import { getTodayPuzzleIndex, getPuzzleDateStr } from './utils/date';
import { readState, clearState, readHistory, readPending, savePending, clearPending } from './storage';
import { deriveWordSet } from './utils/puzzle';
import { computeMaxScore } from './utils/scoring';
import type { Schedule, PuzzleEntry } from './types';
import { GameLayout } from './GameLayout';

// ─── Carryover resolution ────────────────────────────────────────────────────

interface ActivePuzzleResolution {
  activePuzzle: PuzzleEntry;
  activeIndex: number;
  isCarryover: boolean;
}

/**
 * Pure function — determines which puzzle to load and whether it is a carryover.
 * Extracted to be unit-testable independently of the React loading effects.
 */
export function resolveActivePuzzle(
  todayPuzzle: PuzzleEntry,
  todayIndex: number,
  schedule: Schedule,
  stored: import('./types').PersistedState | null,
  pending: import('./types').PendingPuzzle | null,
): ActivePuzzleResolution {
  const isCarryover = !!(stored && stored.puzzleIndex !== todayIndex && stored.foundWords.length > 0);
  const isResumingCarryover = !!(pending && stored && stored.puzzleIndex !== todayIndex);
  if (isCarryover || isResumingCarryover) {
    const prevPuzzle = schedule.puzzles[stored!.puzzleIndex];
    if (prevPuzzle) {
      return { activePuzzle: prevPuzzle, activeIndex: stored!.puzzleIndex, isCarryover: true };
    }
  }
  return { activePuzzle: todayPuzzle, activeIndex: todayIndex, isCarryover: false };
}

// ─── Component ────────────────────────────────────────────────────────────────

/** Wrapper component: owns data loading side-effects; renders GameLayout inside GameProvider. */
export function AppLoader(): React.JSX.Element {
  const dispatch = useGameDispatch();
  // epochRef is kept for the visibility-change handler only — that handler uses a
  // stable ref closure and cannot read epoch from React state without going stale.
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
        const rawStored = readState();
        const pending = readPending();

        // Grand Colophon state is kept in localStorage for same-day reload. When the
        // day rolls over and the stored puzzle is from a previous day that is already
        // in history (completed), discard it so today's puzzle loads cleanly.
        let stored = rawStored;
        if (rawStored && rawStored.puzzleIndex !== todayIndex) {
          const storedDate = getPuzzleDateStr(schedule.epoch, rawStored.puzzleIndex);
          if (readHistory().some(e => e.date === storedDate)) {
            clearState();
            clearPending();
            stored = null;
          }
        }

        const { activePuzzle, activeIndex, isCarryover } = resolveActivePuzzle(
          todayPuzzle, todayIndex, schedule, stored, pending,
        );

        if (isCarryover && !pending) savePending({ puzzleIndex: todayIndex });

        if (!cancelled) {
          dispatch({ type: 'PUZZLE_LOADED', puzzle: activePuzzle });
          dispatch({ type: 'SCHEDULE_LOADED', epoch: schedule.epoch });
          // Keep epochRef in sync for the visibility-change handler (which uses a
          // stable ref closure and cannot read from React state).
          epochRef.current = schedule.epoch;
        }

        fetch(`${import.meta.env.BASE_URL}dictionary.json`)
          .then(r => {
            if (!r.ok) throw new Error(`dictionary fetch failed: ${r.status}`);
            return r.json() as Promise<string[]>;
          })
          .then((words: string[]) => {
            if (!cancelled) {
              // Assign complete object once words are available — avoids the partial
              // {puzzle, words:[]} init pattern that could cause onPlayToday to run
              // deriveWordSet with an empty word list if called before this point.
              todayDataRef.current = { puzzle: todayPuzzle, words, index: todayIndex };

              dispatch({ type: 'DICT_LOADED', words });

              if (stored && stored.puzzleIndex === activeIndex) {
                // Restore progress for the active puzzle
                dispatch({ type: 'RESTORE_STATE', foundWords: stored.foundWords, score: stored.score });
              }

              if (isCarryover) {
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

  return <GameLayout onPlayToday={onPlayToday} newDayAvailable={newDayAvailable} />;
}
