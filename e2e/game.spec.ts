/**
 * e2e/game.spec.ts
 * Full play-through E2E tests: submit all 9 fixture words to reach game-over,
 * and verify error message for an invalid word submission.
 *
 * Clock is frozen to 2026-01-01T12:00:00 in beforeEach so
 * getTodayPuzzleIndex('2026-01-01') returns 0 → fixture puzzle at index 0 loads.
 * Without this, index=134 on 2026-05-15 → puzzles[134] undefined → SCHEDULE_ERROR.
 *
 * Fixture: {D,E,I,N,P,R,T}, center P — 9 words, maxScore=30, pangram='printed'
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Click tiles to spell a word then press the Submit button.
 * Center letter P uses the aria-label "Center letter P"; all other letters
 * use "Letter X". Submit is awaited only after tiles are clicked so we do
 * not hit the disabled-during-load state mid-word.
 */
async function submitWord(page: Page, word: string): Promise<void> {
  for (const letter of word.toUpperCase()) {
    const label = letter === 'P' ? 'Center letter P' : `Letter ${letter}`;
    await page.click(`[aria-label="${label}"]`);
  }
  await page.waitForSelector('[aria-label="Submit word"]:not([disabled])');
  await page.click('[aria-label="Submit word"]');
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  // CRITICAL: freeze clock BEFORE page.goto so getTodayPuzzleIndex returns 0
  await page.clock.setSystemTime(new Date('2026-01-01T12:00:00'));
  await page.goto('/');
  // Center tile appears after PUZZLE_LOADED — confirms puzzle is ready
  await page.waitForSelector('[aria-label="Center letter P"]', { timeout: 10_000 });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test('full play-through: submitting all 9 words reaches game-over with Grand Colophon', async ({ page }) => {
  // All 9 fixture words — drip+pint+pier+ripe+pine+trip=6pts, print+pride=10pts, printed=14pts → 30pts
  const words = ['drip', 'pint', 'pier', 'ripe', 'pine', 'trip', 'print', 'pride', 'printed'];

  let submittedCount = 0;
  for (const word of words) {
    await submitWord(page, word);
    submittedCount += 1;
    // Wait for the score count to reflect the newly submitted word
    await page.waitForFunction(
      (count: number) => {
        const btn = document.querySelector('button.score-count');
        return btn !== null && btn.textContent !== null && btn.textContent.includes(`${count} word`);
      },
      submittedCount,
      { timeout: 3000 },
    );
  }

  // Game-over screen replaces the letter grid when all words are found (D-18)
  await expect(page.locator('div.game-over')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('div.game-over__rank')).toContainText('Grand Colophon');
});

test('submitting a word shorter than 4 letters shows Too short error', async ({ page }) => {
  // 'pin' is 3 letters — valid letters but too short to accept
  for (const letter of 'PIN') {
    const label = letter === 'P' ? 'Center letter P' : `Letter ${letter}`;
    await page.click(`[aria-label="${label}"]`);
  }
  await page.waitForSelector('[aria-label="Submit word"]:not([disabled])');
  await page.click('[aria-label="Submit word"]');

  // Error appears in the alert paragraph rendered by WordDisplay
  await expect(page.locator('p[role="alert"]')).toContainText('Too short');
});
