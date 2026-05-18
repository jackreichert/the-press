import React from 'react';
import { screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithGame, PUZZLE_LOADED, DICT_LOADED } from '../test/helpers';
import { FoundWordsModal } from './FoundWordsModal';

describe('FoundWordsModal content', () => {
  it('renders found words count in title', () => {
    const SUBMIT_DRIP = [
      { type: 'LETTER_APPEND' as const, letter: 'd' },
      { type: 'LETTER_APPEND' as const, letter: 'r' },
      { type: 'LETTER_APPEND' as const, letter: 'i' },
      { type: 'LETTER_APPEND' as const, letter: 'p' },
      { type: 'WORD_SUBMIT' as const },
    ];
    renderWithGame(
      <FoundWordsModal onClose={vi.fn()} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, ...SUBMIT_DRIP] },
    );
    expect(screen.getByText('Found Words (1)')).toBeInTheDocument();
  });

  it('renders found words in alphabetical order', () => {
    const addWords = (['ripe', 'drip', 'pine'] as const).flatMap(w =>
      [...w].map(l => ({ type: 'LETTER_APPEND' as const, letter: l }))
        .concat([{ type: 'WORD_SUBMIT' as const }])
    );
    renderWithGame(
      <FoundWordsModal onClose={vi.fn()} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, ...addWords] },
    );
    const list = screen.getByRole('list', { name: /found words list/i });
    const items = within(list).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('drip');
    expect(items[1]).toHaveTextContent('pine');
    expect(items[2]).toHaveTextContent('ripe');
  });

  it('pangram word printed has pangram-word class', () => {
    const addPrinted = [...'printed'].map(l => ({ type: 'LETTER_APPEND' as const, letter: l }))
      .concat([{ type: 'WORD_SUBMIT' as const }]);
    renderWithGame(
      <FoundWordsModal onClose={vi.fn()} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, ...addPrinted] },
    );
    const printedItem = screen.getByText('printed');
    expect(printedItem).toHaveClass('pangram-word');
  });

  it('non-pangram word drip does not have pangram-word class', () => {
    const addDrip = [...'drip'].map(l => ({ type: 'LETTER_APPEND' as const, letter: l }))
      .concat([{ type: 'WORD_SUBMIT' as const }]);
    renderWithGame(
      <FoundWordsModal onClose={vi.fn()} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED, ...addDrip] },
    );
    expect(screen.getByText('drip')).not.toHaveClass('pangram-word');
  });
});

describe('FoundWordsModal close behavior', () => {
  it('clicking ✕ button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithGame(
      <FoundWordsModal onClose={onClose} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED] },
    );
    await user.click(screen.getByRole('button', { name: /Close found words/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking overlay calls onClose', () => {
    const onClose = vi.fn();
    renderWithGame(
      <FoundWordsModal onClose={onClose} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED] },
    );
    // The dialog role is on the card; its parent is the backdrop overlay
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking modal card does NOT call onClose (stopPropagation)', () => {
    const onClose = vi.fn();
    renderWithGame(
      <FoundWordsModal onClose={onClose} />,
      { initialActions: [PUZZLE_LOADED, DICT_LOADED] },
    );
    const card = screen.getByRole('dialog');
    fireEvent.click(card);
    expect(onClose).not.toHaveBeenCalled();
  });
});
