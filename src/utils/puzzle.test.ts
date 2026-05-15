import { wordMask, puzzleMaskFromLetters, isValid, isPangram, deriveWordSet, isFoundWordPangram } from './puzzle';
import type { PuzzleEntry } from '../types';

const TEST_PUZZLE: PuzzleEntry = {
  index: 0,
  letters: ['D', 'E', 'I', 'N', 'P', 'R', 'T'],
  centerLetter: 'P',
};
const TEST_WORDS = ['drip', 'pine', 'pier', 'pint', 'pride', 'print', 'printed', 'ripe', 'trip'];

const puzzleMask = puzzleMaskFromLetters(TEST_PUZZLE.letters);
const centerBit = 1 << ('p'.charCodeAt(0) - 'a'.charCodeAt(0));

describe('wordMask', () => {
  it('encodes abc as bits 0,1,2 set', () => {
    expect(wordMask('abc')).toBe((1 << 0) | (1 << 1) | (1 << 2));
  });

  it('deduplicates repeated letters', () => {
    expect(wordMask('aa')).toBe(1 << 0);
  });

  it('returns same mask for same letters in different order', () => {
    expect(wordMask('pine')).toBe(wordMask('nipe'));
  });
});

describe('puzzleMaskFromLetters', () => {
  it('produces the same result as wordMask of the lowercase puzzle letters', () => {
    expect(puzzleMask).toBe(wordMask('deinprt'));
  });
});

describe('isValid', () => {
  it('returns true for a valid word in the puzzle that contains the center letter', () => {
    expect(isValid(wordMask('pine'), puzzleMask, centerBit)).toBe(true);
  });

  it('returns false for a word containing a letter not in the puzzle', () => {
    // 'sing' has S which is not in {d,e,i,n,p,r,t}
    expect(isValid(wordMask('sing'), puzzleMask, centerBit)).toBe(false);
  });

  it('returns false for a word that does not contain the center letter P', () => {
    // 'dirt' uses d,i,r,t — all in puzzle but no P
    expect(isValid(wordMask('dirt'), puzzleMask, centerBit)).toBe(false);
  });
});

describe('isPangram', () => {
  it('returns true for "printed" which uses all 7 letters', () => {
    expect(isPangram(wordMask('printed'), puzzleMask)).toBe(true);
  });

  it('returns false for "pine" which uses only 4 of 7 letters', () => {
    expect(isPangram(wordMask('pine'), puzzleMask)).toBe(false);
  });
});

describe('deriveWordSet', () => {
  it('returns all 9 valid words from the fixture dictionary', () => {
    const { words, pangrams } = deriveWordSet(TEST_PUZZLE, TEST_WORDS);
    expect(words).toHaveLength(9);
    expect(pangrams).toEqual(['printed']);
  });

  it('excludes invalid words from a mixed dictionary', () => {
    const mixed = [...TEST_WORDS, 'sing', 'cat', 'stir'];
    const { words } = deriveWordSet(TEST_PUZZLE, mixed);
    expect(words).toHaveLength(9);
  });
});

describe('isFoundWordPangram', () => {
  it('returns true for "printed"', () => {
    expect(isFoundWordPangram('printed', TEST_PUZZLE)).toBe(true);
  });

  it('returns false for "pine"', () => {
    expect(isFoundWordPangram('pine', TEST_PUZZLE)).toBe(false);
  });
});
