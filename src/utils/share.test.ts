/**
 * src/utils/share.test.ts
 * Tests for the share utility functions.
 */

import { formatShareDate, buildProgressBar, buildShareText, pluralize, RULE } from './share';

describe('formatShareDate', () => {
  it('converts YYYY-MM-DD to "Mon DD, YYYY"', () => {
    expect(formatShareDate('2026-05-18')).toBe('May 18, 2026');
    expect(formatShareDate('2026-01-01')).toBe('Jan 1, 2026');
  });
});

describe('buildProgressBar', () => {
  it('returns all empty at score 0', () => {
    expect(buildProgressBar(0, 30)).toBe('░░░░░░░░░░');
  });

  it('returns all filled at max score', () => {
    expect(buildProgressBar(30, 30)).toBe('▓▓▓▓▓▓▓▓▓▓');
  });

  it('returns half-filled at 50%', () => {
    expect(buildProgressBar(15, 30)).toBe('▓▓▓▓▓░░░░░');
  });

  it('returns all empty when maxScore is 0', () => {
    expect(buildProgressBar(0, 0)).toBe('░░░░░░░░░░');
  });
});

describe('buildShareText', () => {
  it('builds the canonical 7-line share card', () => {
    const text = buildShareText({
      date: 'May 18, 2026',
      rankLine: 'LAUREATE',
      barLine: '▓▓▓▓▓▓▓▓░░',
      wordsLine: '7 words · 25/27 pts',
      pangramLine: ' · ✦ 1',
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe('The Press · May 18, 2026');
    expect(lines[1]).toBe(RULE);
    expect(lines[2]).toBe('  LAUREATE');
    expect(lines[3]).toBe('  ▓▓▓▓▓▓▓▓░░');
    expect(lines[4]).toBe('  7 words · 25/27 pts · ✦ 1');
    expect(lines[5]).toBe(RULE);
    expect(lines[6]).toBe('  thepress.app');
  });

  it('omits pangram suffix when empty', () => {
    const text = buildShareText({
      date: 'May 18, 2026',
      rankLine: 'LAUREATE',
      barLine: '▓▓▓▓▓▓▓▓░░',
      wordsLine: '7 words · 25/27 pts',
      pangramLine: '',
    });
    expect(text).toContain('7 words · 25/27 pts\n');
  });
});

describe('pluralize', () => {
  it('returns singular when count is 1', () => {
    expect(pluralize(1, 'word')).toBe('word');
    expect(pluralize(1, 'pt')).toBe('pt');
  });

  it('returns plural when count is 0 or >1', () => {
    expect(pluralize(0, 'word')).toBe('words');
    expect(pluralize(2, 'pt')).toBe('pts');
    expect(pluralize(5, 'pangram')).toBe('pangrams');
  });

  it('accepts a custom plural form', () => {
    expect(pluralize(2, 'person', 'people')).toBe('people');
    expect(pluralize(1, 'person', 'people')).toBe('person');
  });
});
