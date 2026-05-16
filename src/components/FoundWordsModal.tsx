/**
 * src/components/FoundWordsModal.tsx
 * Modal overlay showing found words in alphabetical order.
 * D-11: Words list is hidden behind modal — not inline on the page.
 * D-12: Closes by tapping outside (overlay click) or ✕ button.
 * D-13: Found words ordered alphabetically; pangrams get .pangram-word class.
 * GAME-05: Pangram detection via isFoundWordPangram().
 */

import React, { useRef } from 'react';
import { useGameState } from '../context/GameContext';
import { isFoundWordPangram } from '../utils/puzzle';
import { useFocusTrap } from '../hooks/useFocusTrap';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FoundWordsModalProps {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FoundWordsModal({ onClose }: FoundWordsModalProps): React.JSX.Element {
  const state = useGameState();
  const { foundWords, puzzle } = state;
  const cardRef = useRef<HTMLDivElement>(null);

  useFocusTrap(cardRef, onClose);

  // D-13: Alphabetical sort — spread to avoid mutating state array
  const sorted = [...foundWords].sort();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        ref={cardRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="found-words-title"
      >
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Close found words"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>
        <h2 id="found-words-title" className="modal-title">Found Words ({foundWords.length})</h2>
        <ul className="found-words-list" aria-label="Found words list">
          {sorted.map((word, i) => {
            const pangram = puzzle ? isFoundWordPangram(word, puzzle) : false;
            return (
              <li
                key={word}
                className={pangram ? 'found-word pangram-word' : 'found-word'}
                style={{ '--i': i } as React.CSSProperties}
              >
                {word}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
