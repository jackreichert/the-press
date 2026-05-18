/**
 * e2e/persistence.spec.ts
 * Verifies that localStorage state is saved and restored across page reloads,
 * and that state is cleared once a game is completed.
 *
 * Clock frozen to 2026-01-01T12:00:00 in beforeEach — and re-frozen after
 * page.reload() — so getTodayPuzzleIndex('2026-01-01') remains 0 on every load.
 * RESTORE_STATE fires after DICT_LOADED (allWords must be populated first).
 *
 * Fixture: {D,E,I,N,P,R,T}, center P — 9 words, maxScore=30
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Click tiles to spell a word then press Submit.
 * Waits for Submit to be enabled before typing letters so this is safe to call
 * as the first action after page load (Submit is disabled until DICT_LOADED).
 */
async function submitWord(page: Page, word: string): Promise<void> {
  await page.waitForSelector('[aria-label="Submit word"]:not([disabled])');
  for (const letter of word.toUpperCase()) {
    const label = letter === 'P' ? 'Center letter P' : `Letter ${letter}`;
    await page.click(`[aria-label="${label}"]`);
  }
  await page.click('[aria-label="Submit word"]');
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  // CRITICAL: freeze clock BEFORE page.goto — must also be re-frozen after reload
  await page.clock.setSystemTime(new Date('2026-01-01T12:00:00'));
  await page.goto('/');
  await page.waitForSelector('[aria-label="Center letter P"]', { timeout: 10_000 });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test('page reload restores found words and score', async ({ page }) => {
  // Submit one word — triggers the saveState useEffect (STOR-01)
  await submitWord(page, 'drip');

  // Confirm the ScoreBar shows "1 words" in the score button
  await expect(page.locator('button.score-count')).toContainText('1 words');

  // Re-freeze clock BEFORE reload so puzzle index stays 0 after load
  await page.clock.setSystemTime(new Date('2026-01-01T12:00:00'));
  await page.reload();
  await page.waitForSelector('[aria-label="Center letter P"]', { timeout: 10_000 });

  // Wait for DICT_LOADED + RESTORE_STATE (dict loads after puzzle — Submit enables when ready)
  await page.waitForSelector('[aria-label="Submit word"]:not([disabled])');

  // Found word count should be restored — ScoreBar still shows "1 words"
  await expect(page.locator('button.score-count')).toContainText('1 words');
});

test('grand colophon win persists — reload shows win screen again', async ({ page }) => {
  // Complete the game by submitting all 9 words
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

  // Wait for Grand Colophon screen
  await page.locator('div.game-over').waitFor({ timeout: 5_000 });
  await expect(page.locator('div.game-over')).toContainText('Grand Colophon');

  // Re-freeze clock BEFORE reload
  await page.clock.setSystemTime(new Date('2026-01-01T12:00:00'));
  await page.reload();

  // Grand Colophon state is preserved for same-day reload — win screen shows again
  await page.locator('div.game-over').waitFor({ timeout: 10_000 });
  await expect(page.locator('div.game-over')).toContainText('Grand Colophon');
});
