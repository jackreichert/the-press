import { computeStats } from './stats';
import type { HistoryEntry } from '../storage';

function makeEntry(date: string, score: number = 10): HistoryEntry {
  return { date, score, rank: 'Compositor', foundCount: 3, totalCount: 9, completed: true };
}

describe('computeStats', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns zeros for an empty history', () => {
    expect(computeStats([])).toEqual({ streak: 0, gamesPlayed: 0, avgScore: 0 });
  });

  it('returns streak 1 and correct counts for a single entry today', () => {
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));  // May 15 2026 local
    const stats = computeStats([makeEntry('2026-05-15', 20)]);
    expect(stats.streak).toBe(1);
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.avgScore).toBe(20);
  });

  it('counts a streak of 3 for 3 consecutive days ending today', () => {
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));  // May 15 local
    const history = [
      makeEntry('2026-05-13', 5),
      makeEntry('2026-05-14', 10),
      makeEntry('2026-05-15', 20),
    ];
    expect(computeStats(history).streak).toBe(3);
  });

  it('resets streak at a gap — counts only the unbroken tail run', () => {
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));  // May 15 local
    const history = [
      makeEntry('2026-05-10', 5),  // gap before May 13
      makeEntry('2026-05-13', 5),
      makeEntry('2026-05-14', 10),
      makeEntry('2026-05-15', 20),
    ];
    expect(computeStats(history).streak).toBe(3);  // only May 13-14-15
  });

  it('returns streak 1 when only yesterday has an entry (yesterday rule)', () => {
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));  // May 15 local (today)
    expect(computeStats([makeEntry('2026-05-14', 10)]).streak).toBe(1);
  });

  it('returns streak 0 when the last entry is 2 days ago', () => {
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));  // May 15 local (today)
    expect(computeStats([makeEntry('2026-05-13', 10)]).streak).toBe(0);
  });

  it('excludes future-dated entries from streak computation', () => {
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));  // May 15 local
    const history = [
      makeEntry('2026-05-15', 10),
      makeEntry('2026-05-16', 10),  // future — excluded from streak
    ];
    expect(computeStats(history).streak).toBe(1);  // only today counts toward streak
  });

  it('returns correct streak when yesterday is the tail of a multi-day chain', () => {
    // today = May 15 but no entry for today; yesterday (May 14) and the day before (May 13) both have entries
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));  // May 15 local
    const history = [
      makeEntry('2026-05-13', 5),
      makeEntry('2026-05-14', 10),
    ];
    expect(computeStats(history).streak).toBe(2);
  });

  it('computes avgScore as a rounded integer', () => {
    // No fake timer needed — streak not relevant here
    vi.useRealTimers();
    const history = [makeEntry('2020-01-01', 1), makeEntry('2020-01-02', 2)];
    // avg = (1+2)/2 = 1.5 → Math.round(1.5) = 2
    expect(computeStats(history).avgScore).toBe(2);
  });

  it('counts gamesPlayed as total history length', () => {
    vi.useRealTimers();
    const history = [
      makeEntry('2020-01-01'),
      makeEntry('2020-01-02'),
      makeEntry('2020-01-03'),
    ];
    expect(computeStats(history).gamesPlayed).toBe(3);
  });
});
