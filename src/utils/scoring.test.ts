import { scoreWord, computeMaxScore, getRank, getProgressPct } from './scoring';
import type { PuzzleEntry } from '../types';

const TEST_PUZZLE: PuzzleEntry = {
  index: 0,
  letters: ['D', 'E', 'I', 'N', 'P', 'R', 'T'],
  centerLetter: 'P',
};
// maxScore = drip(1)+pint(1)+pier(1)+ripe(1)+pine(1)+trip(1)+print(5)+pride(5)+printed(14) = 30
const TEST_WORDS = ['drip', 'pine', 'pier', 'pint', 'pride', 'print', 'printed', 'ripe', 'trip'];

describe('scoreWord', () => {
  it('scores a 4-letter word as 1pt (not a pangram)', () => {
    expect(scoreWord('pine', false)).toBe(1);
    expect(scoreWord('drip', false)).toBe(1);
  });

  it('scores a 5-letter word as its length', () => {
    expect(scoreWord('print', false)).toBe(5);
    expect(scoreWord('pride', false)).toBe(5);
  });

  it('scores a 7-letter pangram as its length plus the 7-point bonus', () => {
    expect(scoreWord('printed', true)).toBe(14);
  });

  it('scores a 7-letter non-pangram as just its length (no bonus)', () => {
    expect(scoreWord('printed', false)).toBe(7);
  });
});

describe('computeMaxScore', () => {
  it('returns 30 for the fixture word set', () => {
    expect(computeMaxScore(TEST_WORDS, TEST_PUZZLE)).toBe(30);
  });

  it('returns 0 for an empty word set', () => {
    expect(computeMaxScore([], TEST_PUZZLE)).toBe(0);
  });
});

describe('getRank', () => {
  it('returns a dash rank when maxScore is 0 (dictionary not loaded yet)', () => {
    expect(getRank(0, 0, 0, 0)).toEqual({ name: '—', current: 0, next: 0, nextName: '' });
  });

  it('returns Editor in Chief when score equals max (100% — top visible rank)', () => {
    const result = getRank(30, 30);
    expect(result.name).toBe('Editor in Chief');
    expect(result.current).toBe(84);
    expect(result.nextName).toBe('');
  });

  it('returns Editor in Chief regardless of whether all words are found', () => {
    expect(getRank(30, 30).name).toBe('Editor in Chief');
  });

  it("returns Printer's Devil with current=0 and next=2 when score is below the 2% threshold", () => {
    // 0/30 = 0% — below the Printer's Devil threshold of 2%
    const result = getRank(0, 30, 0, 9);
    expect(result.name).toBe("Printer's Devil");
    expect(result.current).toBe(0);
    expect(result.next).toBe(2);
  });

  it("returns Printer's Devil when score is at 3% (above the 2% entry threshold)", () => {
    // 1/30 = 3% — Printer's Devil threshold is 2%, so that tier is active
    const result = getRank(1, 30, 1, 9);
    expect(result.name).toBe("Printer's Devil");
  });
});

describe('getProgressPct', () => {
  it('returns 0 when maxScore is 0 (dictionary not loaded yet)', () => {
    expect(getProgressPct(0, 0)).toBe(0);
  });

  it('returns 50 for half of the max score', () => {
    expect(getProgressPct(15, 30)).toBe(50);
  });

  it('returns 100 at max score', () => {
    expect(getProgressPct(30, 30)).toBe(100);
  });

  it('clamps to 100 if score somehow exceeds max', () => {
    expect(getProgressPct(40, 30)).toBe(100);
  });
});
