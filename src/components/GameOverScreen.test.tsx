import React, { createRef } from 'react';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame } from '../test/helpers.tsx';
import { GameOverScreen } from './GameOverScreen';
import type { PuzzleEntry } from '../types';

const TEST_PUZZLE: PuzzleEntry = {
  index: 0,
  letters: ['D','E','I','N','P','R','T'],
  centerLetter: 'P',
};
const TEST_WORDS = ['drip','pine','pier','pint','pride','print','printed','ripe','trip'];
const PUZZLE_LOADED = { type: 'PUZZLE_LOADED' as const, puzzle: TEST_PUZZLE };
const DICT_LOADED = { type: 'DICT_LOADED' as const, words: TEST_WORDS };
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
  it('shows Grand Colophon rank when all words found', () => {
    const epochRef = makeEpochRef('2026-01-01');
    renderWithGame(
      <GameOverScreen epochRef={epochRef} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, RESTORE_ALL] },
    );
    expect(screen.getByText('Grand Colophon')).toBeInTheDocument();
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
      expect.stringMatching(/^The Press — \d{4}-\d{2}-\d{2}\n/)
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('Score: 30')
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

  it('reverts to "Share Result" after 2000ms', async () => {
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
