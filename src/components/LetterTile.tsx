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
  extraClass?: string;
}

export function LetterTile({ letter, onTap, isCenter = false, extraClass }: LetterTileProps): React.JSX.Element {
  const cls = [isCenter ? 'tile tile--center' : 'tile', extraClass].filter(Boolean).join(' ');
  return (
    <button
      className={cls}
      onClick={() => onTap(letter)}
      aria-label={isCenter ? `Center letter ${letter.toUpperCase()}` : `Letter ${letter.toUpperCase()}`}
      type="button"
    >
      {letter.toUpperCase()}
    </button>
  );
}
