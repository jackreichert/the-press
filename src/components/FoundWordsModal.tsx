/**
 * src/components/FoundWordsModal.tsx
 * Modal overlay showing found words in alphabetical order.
 * D-11: Words list is hidden behind modal — not inline on the page.
 * D-12: Closes by tapping outside (overlay click) or ✕ button.
 * D-13: Found words ordered alphabetically; pangrams get .pangram-word class.
 * GAME-05: Pangram detection via isFoundWordPangram().
 */

import React from 'react';
import { useGameState } from '../context/GameContext';
import { isFoundWordPangram } from '../utils/puzzle';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FoundWordsModalProps {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FoundWordsModal({ onClose }: FoundWordsModalProps): JSX.Element {
  const state = useGameState();
  const { foundWords, puzzle } = state;

  // D-13: Alphabetical sort — spread to avoid mutating state array
  const sorted = [...foundWords].sort();

  function handleOverlayClick(): void {
    onClose();
  }

  function handleCardClick(e: React.MouseEvent): void {
    // Prevent click from reaching the overlay (D-12)
    e.stopPropagation();
  }

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Found words"
    >
      <div className="modal-card" onClick={handleCardClick}>
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Close found words"
        >
          ✕
        </button>
        <h2 className="modal-title">Found Words ({foundWords.length})</h2>
        <ul className="found-words-list">
          {sorted.map(word => {
            // GAME-05: classify pangrams using puzzle bitmask
            const pangram = puzzle ? isFoundWordPangram(word, puzzle) : false;
            return (
              <li
                key={word}
                className={pangram ? 'found-word pangram-word' : 'found-word'}
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
