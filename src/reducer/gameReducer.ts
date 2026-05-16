/**
 * src/reducer/gameReducer.ts
 * Pure game state reducer for The Press.
 * D-20: useReducer prevents stale-closure bugs on word submission.
 *
 * Action types: PUZZLE_LOADED, DICT_LOADED, LETTER_APPEND, LETTER_DELETE,
 *               WORD_CLEAR, WORD_SUBMIT, SHUFFLE, SCHEDULE_ERROR, DICT_ERROR
 */

import type { PuzzleEntry } from '../types';
import { deriveWordSet, isFoundWordPangram } from '../utils/puzzle';
import { computeMaxScore, scoreWord } from '../utils/scoring';

// ─── State ────────────────────────────────────────────────────────────────────

export interface GameState {
  puzzle: PuzzleEntry | null;
  surroundingOrder: string[];  // 6 non-center letters in current display order
  dict: Set<string> | null;
  allWords: string[];          // all valid words for this puzzle (derived at dict load)
  currentWord: string;
  foundWords: string[];
  score: number;
  maxScore: number;
  errorMsg: string | null;
  /** Increments on every error dispatch — shake useEffect depends on this, not errorMsg string. */
  errorKey: number;
  gameOver: boolean;
  /** True when the player chose to reveal remaining words rather than finding them. */
  revealed: boolean;
  /** True when today's puzzle is waiting — the player is finishing a previous day first. */
  hasPendingToday: boolean;
  dictLoaded: boolean;
  scheduleError: boolean;
  dictError: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'PUZZLE_LOADED'; puzzle: PuzzleEntry }
  | { type: 'DICT_LOADED'; words: string[] }
  | { type: 'LETTER_APPEND'; letter: string }
  | { type: 'LETTER_DELETE' }
  | { type: 'WORD_CLEAR' }
  | { type: 'WORD_SUBMIT' }
  | { type: 'SHUFFLE' }
  | { type: 'SCHEDULE_ERROR' }
  | { type: 'DICT_ERROR' }
  | { type: 'RESTORE_STATE'; foundWords: string[]; score: number }
  | { type: 'REVEAL_REMAINING' }
  | { type: 'SET_PENDING_TODAY' }
  | { type: 'SWITCH_PUZZLE'; puzzle: PuzzleEntry; allWords: string[]; maxScore: number; dict: Set<string> };

// ─── Initial state ────────────────────────────────────────────────────────────

export const initialState: GameState = {
  puzzle: null,
  surroundingOrder: [],
  dict: null,
  allWords: [],
  currentWord: '',
  foundWords: [],
  score: 0,
  maxScore: 0,
  errorMsg: null,
  errorKey: 0,
  gameOver: false,
  revealed: false,
  hasPendingToday: false,
  dictLoaded: false,
  scheduleError: false,
  dictError: false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PUZZLE_LOADED': {
      const surrounding = action.puzzle.letters
        .filter(l => l !== action.puzzle.centerLetter)
        .map(l => l.toLowerCase());
      return {
        ...state,
        puzzle: action.puzzle,
        surroundingOrder: surrounding,
        scheduleError: false,
      };
    }

    case 'DICT_LOADED': {
      if (!state.puzzle) return state;
      const { words } = deriveWordSet(state.puzzle, action.words);
      const maxScore = computeMaxScore(words, state.puzzle);
      return {
        ...state,
        dict: new Set(action.words),
        allWords: words,
        maxScore,
        dictLoaded: true,
        dictError: false,
      };
    }

    case 'RESTORE_STATE': {
      // Must not fire before DICT_LOADED — allWords empty means gameOver wrong (Pitfall 2)
      if (!state.dictLoaded || !state.puzzle) return state;
      const gameOver = action.foundWords.length === state.allWords.length;
      return {
        ...state,
        foundWords: action.foundWords,
        score: action.score,
        gameOver,
      };
    }

    case 'LETTER_APPEND':
      return {
        ...state,
        currentWord: state.currentWord + action.letter.toLowerCase(),
        errorMsg: null,
      };

    case 'LETTER_DELETE':
      return {
        ...state,
        currentWord: state.currentWord.slice(0, -1),
        errorMsg: null,
      };

    case 'WORD_CLEAR':
      return { ...state, currentWord: '', errorMsg: null };

    case 'WORD_SUBMIT':
      return handleSubmit(state);

    case 'SHUFFLE': {
      // Fisher-Yates equivalent via sort — statistically biased but acceptable for display
      const shuffled = [...state.surroundingOrder].sort(() => Math.random() - 0.5);
      return { ...state, surroundingOrder: shuffled };
    }

    case 'REVEAL_REMAINING':
      return { ...state, gameOver: true, revealed: true };

    case 'SET_PENDING_TODAY':
      return { ...state, hasPendingToday: true };

    case 'SWITCH_PUZZLE': {
      const surrounding = action.puzzle.letters
        .filter(l => l !== action.puzzle.centerLetter)
        .map(l => l.toLowerCase());
      return {
        ...initialState,
        puzzle: action.puzzle,
        surroundingOrder: surrounding,
        dict: action.dict,
        allWords: action.allWords,
        maxScore: action.maxScore,
        dictLoaded: true,
      };
    }

    case 'SCHEDULE_ERROR':
      return { ...state, scheduleError: true };

    case 'DICT_ERROR':
      return { ...state, dictError: true };

    default:
      return state;
  }
}

// ─── Submit handler ───────────────────────────────────────────────────────────

function handleSubmit(state: GameState): GameState {
  // Pitfall 2: guard dictLoaded first — dict may be null during load
  if (!state.dictLoaded || !state.dict || !state.puzzle) {
    return withError(state, 'Loading dictionary...');
  }

  const word = state.currentWord.toLowerCase();

  if (word.length < 4) {
    return withError(state, 'Too short');
  }

  const centerLower = state.puzzle.centerLetter.toLowerCase();
  if (!word.includes(centerLower)) {
    return withError(state, 'Missing center letter');
  }

  // Check puzzle-valid word set (not full dict) — allWords are pre-filtered to use only puzzle letters
  if (!state.allWords.includes(word)) {
    return withError(state, 'Not a word');
  }

  if (state.foundWords.includes(word)) {
    return withError(state, 'Already found');
  }

  // Valid word — compute score
  const pangramWord = isFoundWordPangram(word, state.puzzle);
  const points = scoreWord(word, pangramWord);
  const newScore = state.score + points;
  const newFoundWords = [...state.foundWords, word];
  const gameOver = newFoundWords.length === state.allWords.length;

  return {
    ...state,
    currentWord: '',
    foundWords: newFoundWords,
    score: newScore,
    errorMsg: null,
    gameOver,
  };
}

/** Return state with errorMsg set and errorKey incremented. Word clears after a UI-layer delay. */
function withError(state: GameState, msg: string): GameState {
  return {
    ...state,
    errorMsg: msg,
    errorKey: state.errorKey + 1,  // Pitfall 3: increment so shake re-triggers on same error
  };
}
