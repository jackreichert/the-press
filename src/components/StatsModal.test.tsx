import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatsModal } from './StatsModal';
import { appendHistory } from '../storage';
import type { HistoryEntry } from '../storage';

// StatsModal does NOT use GameContext — plain render() is fine (D-06)

describe('StatsModal stats display', () => {
  afterEach(() => { localStorage.clear(); });

  it('shows all zeros with empty history', () => {
    render(<StatsModal onClose={vi.fn()} />);
    expect(screen.getByLabelText(/0 days/)).toBeInTheDocument();
    expect(screen.getByLabelText(/0 games played/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Average score 0/)).toBeInTheDocument();
  });

  it('shows correct values after seeding history', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));
    const entry: HistoryEntry = {
      date: '2026-05-15', score: 20, rank: 'Editor', foundCount: 7, totalCount: 9, completed: true,
    };
    appendHistory(entry);
    render(<StatsModal onClose={vi.fn()} />);
    expect(screen.getByLabelText(/1 days/)).toBeInTheDocument();
    expect(screen.getByLabelText(/1 games played/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Average score 20/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('StatsModal close behavior', () => {
  it('clicking ✕ button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StatsModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Close stats/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
