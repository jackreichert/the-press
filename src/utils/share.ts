/**
 * src/utils/share.ts
 * Shared share utilities: date formatting, progress bar, and the useShare hook.
 */

import { useState } from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
