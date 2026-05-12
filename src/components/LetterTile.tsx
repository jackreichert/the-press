/**
 * src/components/LetterTile.tsx
 * Single letter tile button.
 * GAME-02: min 48px touch target (56px for center tile via .tile--center class).
 */

import React from 'react';

interface LetterTileProps {
  letter: string;
  onTap: (letter: string) => void;
  isCenter?: boolean;
}

export function LetterTile({ letter, onTap, isCenter = false }: LetterTileProps): React.JSX.Element {
  return (
    <button
      className={isCenter ? 'tile tile--center' : 'tile'}
      onClick={() => onTap(letter)}
      aria-label={isCenter ? `Center letter ${letter.toUpperCase()}` : `Letter ${letter.toUpperCase()}`}
      type="button"
    >
      {letter.toUpperCase()}
    </button>
  );
}
