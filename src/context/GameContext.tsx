/**
 * src/context/GameContext.tsx
 * React context wiring for game state and dispatch.
 * Uses two separate contexts (state and dispatch) to prevent needless re-renders
 * in dispatch-only consumers (e.g. ActionRow).
 */

import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react';
import { gameReducer, initialState, type GameState, type GameAction } from '../reducer/gameReducer';

// ─── Context definitions ──────────────────────────────────────────────────────

const GameStateContext = createContext<GameState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}

// ─── Consumer hooks ───────────────────────────────────────────────────────────

/** Access the full game state. Re-renders whenever any state field changes. */
export function useGameState(): GameState {
  const ctx = useContext(GameStateContext);
  if (ctx === null) throw new Error('useGameState must be used inside <GameProvider>');
  return ctx;
}

/** Access the dispatch function. Does NOT re-render on state changes. */
export function useGameDispatch(): Dispatch<GameAction> {
  const ctx = useContext(GameDispatchContext);
  if (ctx === null) throw new Error('useGameDispatch must be used inside <GameProvider>');
  return ctx;
}
