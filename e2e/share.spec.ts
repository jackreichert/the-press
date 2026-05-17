/**
 * e2e/share.spec.ts
 * Verifies the share button: clipboard text format and the 2-second "Copied!" feedback.
 *
 * Headless Chromium does not support navigator.clipboard permissions via grantPermissions.
 * Instead, page.addInitScript() replaces navigator.clipboard BEFORE page JS loads so the
 * mock is in place when React renders GameOverScreen and calls writeText.
 *
 * D-14 share text format: "The Press — YYYY-MM-DD\n{Rank} — Score: N | N/N words | N pangrams"
 * Fixture: {D,E,I,N,P,R,T}, center P — 9 words, maxScore=30, 1 pangram ('printed')
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Helper ───────────────────────────────────────────────────────────────────

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
  // CRITICAL: install clipboard mock BEFORE page.goto so it intercepts writeText
  // before React loads. page.evaluate (after goto) is too late — GameOverScreen
  // already holds a reference to the original navigator.clipboard.
  await page.addInitScript(() => {
    let lastWritten = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string): Promise<void> => {
          lastWritten = text;
          // Expose on window so page.evaluate can read it back
          (window as unknown as Record<string, unknown>).__clipboardText = text;
          return Promise.resolve();
        },
        readText: (): Promise<string> => Promise.resolve(lastWritten),
      },
    });
  });

  // Freeze clock AFTER addInitScript but BEFORE page.goto
  await page.clock.setSystemTime(new Date('2026-01-01T12:00:00'));
  await page.goto('/');
  await page.waitForSelector('[aria-label="Center letter P"]', { timeout: 10_000 });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test('share button copies correct text format to clipboard', async ({ page }) => {
  // Reach game-over by submitting all 9 words
  const words = ['drip', 'pint', 'pier', 'ripe', 'pine', 'trip', 'print', 'pride', 'printed'];
  for (const word of words) {
    await submitWord(page, word);
    await page.waitForTimeout(50);
  }
  await page.locator('div.game-over').waitFor({ timeout: 5_000 });

  // Click the GameOverScreen share button specifically — ScoreBar also has aria-label="Share result"
  // and appears earlier in the DOM, so we scope to .game-over to avoid hitting the wrong button.
  await page.click('.game-over [aria-label="Share result"]');

  // Button transitions to aria-label="Copied to clipboard" after successful writeText
  await expect(page.locator('.game-over [aria-label="Copied to clipboard"]')).toBeVisible({ timeout: 3_000 });

  // Read the intercepted clipboard text via window.__clipboardText
  const clipText = await page.evaluate(
    () => (window as unknown as Record<string, unknown>).__clipboardText as string
  );

  // New format: "The Press · Mon DD, YYYY"
  expect(clipText).toMatch(/^The Press · \w+ \d+, \d{4}\n/);
  // Rank is Grand Colophon for 30/30 points (uppercased in share format, prefixed with ✦)
  expect(clipText).toContain('GRAND COLOPHON');
  // Full score achieved
  expect(clipText).toContain('30 pts');
  // All 9 words found — GameOverScreen format uses "All N words"
  expect(clipText).toContain('All 9 words');
  // 'printed' is the only pangram
  expect(clipText).toContain('✦ 1 pangram');
  // Footer URL
  expect(clipText).toContain('thepress.app');
});

test('share button shows Copied! for 2 seconds then reverts to Share Result', async ({ page }) => {
  const words = ['drip', 'pint', 'pier', 'ripe', 'pine', 'trip', 'print', 'pride', 'printed'];
  for (const word of words) {
    await submitWord(page, word);
    await page.waitForTimeout(50);
  }
  await page.locator('div.game-over').waitFor({ timeout: 5_000 });

  await page.click('.game-over [aria-label="Share result"]');

  // Immediately after click — button shows "Copied!" state
  await expect(page.locator('.game-over [aria-label="Copied to clipboard"]')).toBeVisible({ timeout: 3_000 });

  // After 2100ms (real timers in E2E — no fake timers here) the button reverts
  await page.waitForTimeout(2100);
  await expect(page.locator('.game-over [aria-label="Share result"]')).toBeVisible();
});
