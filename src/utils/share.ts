/**
 * src/utils/share.ts
 * Shared share utilities: date formatting, progress bar, share text builder, and the useShare hook.
 */

import { useState } from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const RULE = '━━━━━━━━━━━━━━━━━━━━━';

export interface ShareContext {
  /** Already-formatted date, e.g. "May 17, 2026" */
  date: string;
  /** Rank line, e.g. "LAUREATE", "✦ GRAND COLOPHON" */
  rankLine: string;
  /** Bar + pts portion, e.g. "▓▓▓▓▓░░░░░ 42 pts" or just the bar */
  barLine: string;
  /** Words line, e.g. "7 words · 42/89 pts" or "All 12 words" */
  wordsLine: string;
  /** Pangram suffix, e.g. " · ✦ 2" or "" */
  pangramLine: string;
}

/** Build the canonical share text block from a ShareContext. */
export function buildShareText(ctx: ShareContext): string {
  return [
    `The Press · ${ctx.date}`,
    RULE,
    `  ${ctx.rankLine}`,
    `  ${ctx.barLine}`,
    `  ${ctx.wordsLine}${ctx.pangramLine}`,
    RULE,
    `  thepress.app`,
  ].join('\n');
}

/**
 * Returns the singular or plural form of a word based on count.
 * Does NOT prepend the count — callers do that.
 * @example pluralize(1, 'word') // 'word'
 * @example pluralize(3, 'word') // 'words'
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

/** Converts "YYYY-MM-DD" to "Mon DD, YYYY". */
export function formatShareDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** Returns a 10-character bar of ▓/░ representing score / maxScore. */
export function buildProgressBar(score: number, maxScore: number): string {
  const filled = maxScore > 0 ? Math.round((score / maxScore) * 10) : 0;
  return '▓'.repeat(filled) + '░'.repeat(10 - filled);
}

interface UseShareReturn {
  copied: boolean;
  showFallback: boolean;
  fallbackText: string;
  handleShare: (text: string) => Promise<void>;
}

/**
 * Encapsulates the navigator.share → clipboard → textarea fallback state machine.
 * Returns { copied, showFallback, fallbackText, handleShare }.
 */
export function useShare(): UseShareReturn {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackText, setFallbackText] = useState('');

  async function handleShare(text: string): Promise<void> {
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* cancelled — fall through */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFallbackText(text);
      setShowFallback(true);
    }
  }

  return { copied, showFallback, fallbackText, handleShare };
}
