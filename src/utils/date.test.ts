import { getTodayPuzzleIndex, getPuzzleDateStr } from './date';

describe('getTodayPuzzleIndex', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns 0 when system time is noon on the epoch day', () => {
    // Use 4-arg local constructor — same approach as the implementation
    vi.setSystemTime(new Date(2026, 4, 12, 12, 0, 0));  // May 12 2026, noon LOCAL
    expect(getTodayPuzzleIndex('2026-05-12')).toBe(0);
  });

  it('returns 3 when system time is 3 days after the epoch', () => {
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));  // May 15 2026, noon LOCAL
    expect(getTodayPuzzleIndex('2026-05-12')).toBe(3);
  });

  it('returns 0 when today is before the epoch (clamped to 0)', () => {
    vi.setSystemTime(new Date(2026, 4, 10, 12, 0, 0));  // May 10 — before May 12 epoch
    expect(getTodayPuzzleIndex('2026-05-12')).toBe(0);
  });

  it('returns 0 early morning of the epoch day (local midnight math)', () => {
    vi.setSystemTime(new Date(2026, 4, 12, 0, 30, 0));  // 12:30am local on epoch day
    expect(getTodayPuzzleIndex('2026-05-12')).toBe(0);
  });
});

describe('getPuzzleDateStr', () => {
  it('returns the epoch date string for index 0', () => {
    expect(getPuzzleDateStr('2026-05-12', 0)).toBe('2026-05-12');
  });

  it('returns the correct date for index 3', () => {
    expect(getPuzzleDateStr('2026-05-12', 3)).toBe('2026-05-15');
  });

  it('returns the correct date for index 30 (Jan 1 + 30 days = Jan 31)', () => {
    expect(getPuzzleDateStr('2026-01-01', 30)).toBe('2026-01-31');
  });

  it('handles a month boundary correctly (Jan 31 + 1 = Feb 1)', () => {
    expect(getPuzzleDateStr('2026-01-31', 1)).toBe('2026-02-01');
  });
});
