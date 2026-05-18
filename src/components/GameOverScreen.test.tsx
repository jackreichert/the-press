import React, { createRef } from 'react';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame, TEST_WORDS, PUZZLE_LOADED, DICT_LOADED } from '../test/helpers';
import { GameOverScreen } from './GameOverScreen';

const RESTORE_ALL = {
  type: 'RESTORE_STATE' as const,
  foundWords: TEST_WORDS,
  score: 30,
};

function makeEpochRef(epoch: string): React.RefObject<string | null> {
  const ref = createRef<string | null>();
  (ref as React.MutableRefObject<string | null>).current = epoch;
  return ref;
}

// D-07 (CONTEXT.md): stub navigator.clipboard — undefined in jsdom 29
// userEvent.setup() replaces navigator.clipboard with its own mock — we must re-apply
// our mock AFTER calling userEvent.setup() in each test.
const writeTextMock = vi.fn();

/** Helper: apply writeTextMock to navigator.clipboard. Call after userEvent.setup(). */
function stubClipboard(): void {
  writeTextMock.mockReset();
  writeTextMock.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

/** Helper: apply a rejecting clipboard mock. Call after userEvent.setup(). */
function stubClipboardReject(): void {
  writeTextMock.mockReset();
  writeTextMock.mockRejectedValueOnce(new Error('denied'));
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

beforeEach(() => {
  // Set a baseline clipboard stub before the test; userEvent.setup() will override it.
  // Tests that need to verify the mock must call stubClipboard() after userEvent.setup().
  writeTextMock.mockReset();
  writeTextMock.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
    writable: true,
    enumerable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GameOverScreen rendering', () => {
  it('shows Grand Colophon when all words found', () => {
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    expect(screen.getByText('Grand Colophon')).toBeInTheDocument();
    expect(screen.getByText(/All words found/i)).toBeInTheDocument();
  });

  it('does not show Laureate in the Grand Colophon game-over screen', () => {
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    expect(screen.queryByText('Laureate')).toBeNull();
  });
});

describe('GameOverScreen share button', () => {
  it('share button is present with aria-label "Share result"', () => {
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    expect(screen.getByRole('button', { name: /Share result/i })).toBeInTheDocument();
  });

  it('shows "Copied!" and aria-label changes after clicking share', async () => {
    const user = userEvent.setup();
    // Re-stub clipboard after userEvent.setup() — userEvent v14 replaces navigator.clipboard
    stubClipboard();
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    await user.click(screen.getByRole('button', { name: /Share result/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copied to clipboard/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Copied to clipboard/i })).toHaveTextContent('Copied!');
  });

  it('calls navigator.clipboard.writeText with correct share text format', async () => {
    const user = userEvent.setup();
    // Re-stub clipboard after userEvent.setup() — userEvent v14 replaces navigator.clipboard
    stubClipboard();
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    await user.click(screen.getByRole('button', { name: /Share result/i }));
    // Wait for async handleShare to complete — same pattern as "Copied!" test
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copied to clipboard/i })).toBeInTheDocument();
    });
    // Verify writeText was called with the correct share text format
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringMatching(/^The Press · \w+ \d+, \d{4}\n/)
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('GRAND COLOPHON')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('30 pts')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('thepress.app')
    );
  });

  it('shows fallback textarea when clipboard.writeText rejects', async () => {
    const user = userEvent.setup();
    // Re-stub clipboard with rejection — must happen after userEvent.setup()
    stubClipboardReject();
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    await user.click(screen.getByRole('button', { name: /Share result/i }));
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /Share text/i })).toBeInTheDocument();
    });
  });

  it('reverts to "Share Result" after 2000ms (Copied! timeout)', async () => {
    vi.useFakeTimers();
    // stubClipboard here — no userEvent.setup() in this test so beforeEach stub is still active
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    // Fire click synchronously to avoid userEvent internal timer interactions
    const shareBtn = screen.getByRole('button', { name: /Share result/i });
    shareBtn.click();
    // Flush the Promise from writeText — microtask resolution, no timer needed
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // Button should now show Copied!
    expect(screen.getByRole('button', { name: /Copied to clipboard/i })).toBeInTheDocument();
    // Advance past the 2000ms revert timeout — async act lets React flush the setState
    await act(async () => { vi.advanceTimersByTime(2001); });
    expect(screen.getByRole('button', { name: /Share result/i })).toBeInTheDocument();
  });
});

describe('GameOverScreen revealed mode', () => {
  const REVEAL = { type: 'REVEAL_REMAINING' as const };
  const PARTIAL = { type: 'RESTORE_STATE' as const, foundWords: ['drip', 'pine'], score: 3 };

  it('shows "Better luck next time" when revealed', () => {
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, PARTIAL, REVEAL] },
    );
    expect(screen.getByText('Better luck next time')).toBeInTheDocument();
  });

  it('shows "All words" section with all puzzle words', () => {
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, PARTIAL, REVEAL] },
    );
    expect(screen.getByText('All words')).toBeInTheDocument();
    // Found words appear
    expect(screen.getByText('drip')).toBeInTheDocument();
    // Missed words appear
    expect(screen.getByText('printed')).toBeInTheDocument();
  });

  it('found words have word-display--found class, missed words do not', () => {
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, PARTIAL, REVEAL] },
    );
    const dripEl = screen.getByText('drip');
    expect(dripEl).toHaveClass('game-over__missed-word--found');
    const printedEl = screen.getByText('printed');
    expect(printedEl).not.toHaveClass('game-over__missed-word--found');
  });
});

describe('GameOverScreen onPlayToday', () => {
  it('shows "Play today\'s puzzle" button when onPlayToday prop provided', () => {
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} onPlayToday={vi.fn()} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    expect(screen.getByRole('button', { name: /Play today/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Share result/i })).toBeNull();
  });

  it('calls onPlayToday when the button is clicked', async () => {
    const user = userEvent.setup();
    const onPlayToday = vi.fn();
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} onPlayToday={onPlayToday} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    await user.click(screen.getByRole('button', { name: /Play today/i }));
    expect(onPlayToday).toHaveBeenCalledTimes(1);
  });
});
