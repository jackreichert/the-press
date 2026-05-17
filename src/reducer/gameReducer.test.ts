import { gameReducer, initialState } from './gameReducer';
import type { GameState } from './gameReducer';
import type { PuzzleEntry } from '../types';

const TEST_PUZZLE: PuzzleEntry = {
  index: 0,
  letters: ['D', 'E', 'I', 'N', 'P', 'R', 'T'],
  centerLetter: 'P',
};
const TEST_WORDS = ['drip', 'pine', 'pier', 'pint', 'pride', 'print', 'printed', 'ripe', 'trip'];

/** Build state after PUZZLE_LOADED + DICT_LOADED — the minimum needed to accept words */
function loadedState(): GameState {
  let s = gameReducer(initialState, { type: 'PUZZLE_LOADED', puzzle: TEST_PUZZLE });
  s = gameReducer(s, { type: 'DICT_LOADED', words: TEST_WORDS });
  return s;
}

/** Append letters of a word to currentWord */
function typeWord(state: GameState, word: string): GameState {
  return word.split('').reduce(
    (s, letter) => gameReducer(s, { type: 'LETTER_APPEND', letter }),
    state,
  );
}

describe('PUZZLE_LOADED', () => {
  it('sets puzzle and derives surroundingOrder (6 non-center lowercase letters)', () => {
    const s = gameReducer(initialState, { type: 'PUZZLE_LOADED', puzzle: TEST_PUZZLE });
    expect(s.puzzle).toEqual(TEST_PUZZLE);
    expect(s.surroundingOrder).toHaveLength(6);
    expect(s.surroundingOrder).not.toContain('p');  // center letter excluded
  });

  it('clears scheduleError', () => {
    const errorState = gameReducer(initialState, { type: 'SCHEDULE_ERROR' });
    const s = gameReducer(errorState, { type: 'PUZZLE_LOADED', puzzle: TEST_PUZZLE });
    expect(s.scheduleError).toBe(false);
  });
});

describe('DICT_LOADED', () => {
  it('derives allWords with length 9 and maxScore 30', () => {
    const s = loadedState();
    expect(s.allWords).toHaveLength(9);
    expect(s.maxScore).toBe(30);
    expect(s.dictLoaded).toBe(true);
  });

  it('creates dict Set containing all valid words', () => {
    const s = loadedState();
    expect(s.dict).toBeInstanceOf(Set);
    expect(s.dict?.has('printed')).toBe(true);
  });

  it('is a no-op if puzzle not yet loaded', () => {
    const s = gameReducer(initialState, { type: 'DICT_LOADED', words: TEST_WORDS });
    expect(s.allWords).toHaveLength(0);
    expect(s.dictLoaded).toBe(false);
  });
});

describe('RESTORE_STATE', () => {
  it('is a no-op before DICT_LOADED', () => {
    const puzzleOnly = gameReducer(initialState, { type: 'PUZZLE_LOADED', puzzle: TEST_PUZZLE });
    const s = gameReducer(puzzleOnly, { type: 'RESTORE_STATE', foundWords: ['drip'], score: 1 });
    expect(s.foundWords).toHaveLength(0);  // unchanged
    expect(s.score).toBe(0);
  });

  it('restores foundWords and score after DICT_LOADED', () => {
    const s = gameReducer(loadedState(), { type: 'RESTORE_STATE', foundWords: ['drip', 'pint'], score: 2 });
    expect(s.foundWords).toEqual(['drip', 'pint']);
    expect(s.score).toBe(2);
    expect(s.gameOver).toBe(false);
  });

  it('sets gameOver when all 9 words are restored', () => {
    const s = gameReducer(loadedState(), { type: 'RESTORE_STATE', foundWords: TEST_WORDS, score: 30 });
    expect(s.gameOver).toBe(true);
  });
});

describe('LETTER_APPEND', () => {
  it('appends lowercase letter to currentWord', () => {
    let s = gameReducer(initialState, { type: 'LETTER_APPEND', letter: 'P' });
    expect(s.currentWord).toBe('p');
    s = gameReducer(s, { type: 'LETTER_APPEND', letter: 'R' });
    expect(s.currentWord).toBe('pr');
  });

  it('clears errorMsg on append', () => {
    const withError = { ...initialState, errorMsg: 'Too short' };
    const s = gameReducer(withError, { type: 'LETTER_APPEND', letter: 'p' });
    expect(s.errorMsg).toBeNull();
  });
});

describe('LETTER_DELETE', () => {
  it('removes last character of currentWord', () => {
    const withWord = { ...initialState, currentWord: 'pri' };
    const s = gameReducer(withWord, { type: 'LETTER_DELETE' });
    expect(s.currentWord).toBe('pr');
  });

  it('does not error on empty currentWord', () => {
    const s = gameReducer(initialState, { type: 'LETTER_DELETE' });
    expect(s.currentWord).toBe('');
  });
});

describe('WORD_CLEAR', () => {
  it('empties currentWord', () => {
    const withWord = { ...initialState, currentWord: 'print' };
    const s = gameReducer(withWord, { type: 'WORD_CLEAR' });
    expect(s.currentWord).toBe('');
  });
});

describe('errorPending input block', () => {
  it('LETTER_APPEND goes through while errorPending (triggers early-clear in WordDisplay)', () => {
    const withError = { ...loadedState(), currentWord: 'pin', errorPending: true };
    const s = gameReducer(withError, { type: 'LETTER_APPEND', letter: 'd' });
    expect(s.currentWord).toBe('pind');
  });

  it('LETTER_DELETE is ignored while errorPending is true', () => {
    const withError = { ...loadedState(), currentWord: 'pin', errorPending: true };
    const s = gameReducer(withError, { type: 'LETTER_DELETE' });
    expect(s.currentWord).toBe('pin');
  });

  it('STRIP_PREFIX clears errorPending', () => {
    const withError = { ...loadedState(), currentWord: 'pin', errorPending: true };
    const s = gameReducer(withError, { type: 'STRIP_PREFIX', length: 3 });
    expect(s.errorPending).toBe(false);
  });

  it('withError sets errorPending via WORD_SUBMIT on invalid word', () => {
    const s = gameReducer(typeWord(loadedState(), 'pin'), { type: 'WORD_SUBMIT' });
    expect(s.errorPending).toBe(true);
  });

  it('WORD_SUBMIT is a no-op while errorPending is true', () => {
    const withError = { ...loadedState(), currentWord: 'pin', errorPending: true, errorKey: 1 };
    const s = gameReducer(withError, { type: 'WORD_SUBMIT' });
    expect(s.errorKey).toBe(1);  // no new error triggered
    expect(s.currentWord).toBe('pin');  // unchanged
  });
});

describe('STRIP_PREFIX', () => {
  it('removes the first N characters, preserving the rest', () => {
    const s = gameReducer({ ...initialState, currentWord: 'pindrip' }, { type: 'STRIP_PREFIX', length: 3 });
    expect(s.currentWord).toBe('drip');
  });

  it('returns empty string when length equals word length', () => {
    const s = gameReducer({ ...initialState, currentWord: 'pin' }, { type: 'STRIP_PREFIX', length: 3 });
    expect(s.currentWord).toBe('');
  });

  it('returns empty string when length exceeds word length', () => {
    const s = gameReducer({ ...initialState, currentWord: 'pi' }, { type: 'STRIP_PREFIX', length: 5 });
    expect(s.currentWord).toBe('');
  });

  it('clears errorMsg', () => {
    const s = gameReducer({ ...initialState, currentWord: 'pin', errorMsg: 'Too short' }, { type: 'STRIP_PREFIX', length: 3 });
    expect(s.errorMsg).toBeNull();
  });
});

describe('WORD_SUBMIT', () => {
  it('is a no-op when currentWord is empty', () => {
    const s = gameReducer(loadedState(), { type: 'WORD_SUBMIT' });
    expect(s.errorMsg).toBeNull();
    expect(s.errorKey).toBe(0);
  });

  it('rejects word shorter than 4 chars with "Too short"', () => {
    const s = gameReducer(typeWord(loadedState(), 'pin'), { type: 'WORD_SUBMIT' });
    expect(s.errorMsg).toBe('Too short');
    expect(s.errorKey).toBe(1);
    expect(s.currentWord).toBe('pin');  // word not cleared on error
  });

  it('rejects word missing center letter P with "Missing center letter"', () => {
    // 'dirt' uses D,I,R,T but not P
    const s = gameReducer(typeWord(loadedState(), 'dirt'), { type: 'WORD_SUBMIT' });
    expect(s.errorMsg).toBe('Missing center letter');
    expect(s.errorKey).toBe(1);
  });

  it('rejects word not in dictionary with "Not a word"', () => {
    // 'pinr' contains p, uses puzzle letters, 4 chars, but not a real word
    const s = gameReducer(typeWord(loadedState(), 'pinr'), { type: 'WORD_SUBMIT' });
    expect(s.errorMsg).toBe('Not a word');
  });

  it('rejects real word that uses non-puzzle letters with "Not a word"', () => {
    // 'sprint' is a real English word and contains center P, but uses S which is not in puzzle
    // This guards against validating against the full dict instead of allWords
    const s = gameReducer(typeWord(loadedState(), 'sprint'), { type: 'WORD_SUBMIT' });
    expect(s.errorMsg).toBe('Not a word');
  });

  it('accepts valid word, increments score, and clears currentWord', () => {
    const s = gameReducer(typeWord(loadedState(), 'drip'), { type: 'WORD_SUBMIT' });
    expect(s.foundWords).toContain('drip');
    expect(s.score).toBe(1);
    expect(s.currentWord).toBe('');
    expect(s.errorMsg).toBeNull();
  });

  it('scores pangram "printed" as 14 points (7 + 7 bonus)', () => {
    const s = gameReducer(typeWord(loadedState(), 'printed'), { type: 'WORD_SUBMIT' });
    expect(s.score).toBe(14);
    expect(s.foundWords).toContain('printed');
  });

  it('rejects already-found word with "Already found"', () => {
    let s = gameReducer(typeWord(loadedState(), 'drip'), { type: 'WORD_SUBMIT' });
    s = gameReducer(typeWord(s, 'drip'), { type: 'WORD_SUBMIT' });
    expect(s.errorMsg).toBe('Already found');
  });

  it('increments errorKey even for same repeated error (shake re-trigger after window clears)', () => {
    let s = gameReducer(typeWord(loadedState(), 'pin'), { type: 'WORD_SUBMIT' });
    expect(s.errorKey).toBe(1);
    // Simulate the 700ms window ending (STRIP_PREFIX clears errorPending)
    s = gameReducer(s, { type: 'STRIP_PREFIX', length: 3 });
    s = gameReducer(typeWord(s, 'pin'), { type: 'WORD_SUBMIT' });
    expect(s.errorKey).toBe(2);
  });

  it('sets gameOver when last word is submitted', () => {
    let s = loadedState();
    for (const word of TEST_WORDS) {
      s = gameReducer(typeWord(s, word), { type: 'WORD_SUBMIT' });
    }
    expect(s.gameOver).toBe(true);
    expect(s.foundWords).toHaveLength(9);
    expect(s.score).toBe(30);
  });
});

describe('SHUFFLE', () => {
  it('produces a surroundingOrder with the same 6 letters', () => {
    const s = loadedState();
    const before = new Set(s.surroundingOrder);
    const shuffled = gameReducer(s, { type: 'SHUFFLE' });
    expect(new Set(shuffled.surroundingOrder)).toEqual(before);
    expect(shuffled.surroundingOrder).toHaveLength(6);
  });
});

describe('SCHEDULE_ERROR', () => {
  it('sets scheduleError to true', () => {
    const s = gameReducer(initialState, { type: 'SCHEDULE_ERROR' });
    expect(s.scheduleError).toBe(true);
  });
});

describe('DICT_ERROR', () => {
  it('sets dictError to true', () => {
    const s = gameReducer(initialState, { type: 'DICT_ERROR' });
    expect(s.dictError).toBe(true);
  });
});

describe('REVEAL_REMAINING', () => {
  it('sets gameOver and revealed to true', () => {
    const s = gameReducer(loadedState(), { type: 'REVEAL_REMAINING' });
    expect(s.gameOver).toBe(true);
    expect(s.revealed).toBe(true);
  });
});

describe('SET_PENDING_TODAY', () => {
  it('sets hasPendingToday to true', () => {
    const s = gameReducer(loadedState(), { type: 'SET_PENDING_TODAY' });
    expect(s.hasPendingToday).toBe(true);
  });
});

describe('SWITCH_PUZZLE', () => {
  const NEW_PUZZLE: PuzzleEntry = {
    index: 1,
    letters: ['A', 'C', 'E', 'L', 'P', 'R', 'S'],
    centerLetter: 'P',
  };
  const NEW_WORDS = ['cape', 'caper', 'pale', 'pace', 'place', 'space'];

  it('resets state and loads the new puzzle', () => {
    let s = loadedState();
    s = gameReducer(typeWord(s, 'drip'), { type: 'WORD_SUBMIT' });
    s = gameReducer(s, {
      type: 'SWITCH_PUZZLE',
      puzzle: NEW_PUZZLE,
      allWords: NEW_WORDS,
      maxScore: 25,
      dict: new Set(NEW_WORDS),
    });
    expect(s.puzzle).toEqual(NEW_PUZZLE);
    expect(s.foundWords).toHaveLength(0);
    expect(s.score).toBe(0);
    expect(s.currentWord).toBe('');
    expect(s.gameOver).toBe(false);
    expect(s.hasPendingToday).toBe(false);
    expect(s.dictLoaded).toBe(true);
    expect(s.allWords).toEqual(NEW_WORDS);
  });
});
