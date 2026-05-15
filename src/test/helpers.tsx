import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { GameProvider, useGameDispatch } from '../context/GameContext';
import type { GameAction } from '../reducer/gameReducer';

interface RenderWithGameOptions extends Omit<RenderOptions, 'wrapper'> {
  initialActions?: GameAction[];
}

function Seeder({ actions }: { actions: GameAction[] }): null {
  const dispatch = useGameDispatch();
  useEffect(() => {
    actions.forEach(a => dispatch(a));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function renderWithGame(
  ui: React.ReactElement,
  { initialActions = [], ...opts }: RenderWithGameOptions = {},
): RenderResult {
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
      <GameProvider>
        {initialActions.length > 0 && <Seeder actions={initialActions} />}
        {children}
      </GameProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...opts });
}
