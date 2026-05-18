/**
 * src/App.tsx
 * Root component — wraps the app in GameProvider and mounts AppLoader.
 *
 * Data loading: AppLoader (src/AppLoader.tsx)
 * UI composition: GameLayout (src/GameLayout.tsx)
 */

import React from 'react';
import { GameProvider } from './context/GameContext';
import { AppLoader } from './AppLoader';

export default function App(): React.JSX.Element {
  return (
    <GameProvider>
      <AppLoader />
    </GameProvider>
  );
}
