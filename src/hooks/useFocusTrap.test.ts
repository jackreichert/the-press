/**
 * src/hooks/useFocusTrap.test.ts
 * Tests for the focus trap hook: initial focus, Escape, Tab wrapping.
 */

import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';

function makeContainer(): HTMLDivElement {
  const div = document.createElement('div');
  const btn1 = document.createElement('button');
  const btn2 = document.createElement('button');
  btn1.textContent = 'First';
  btn2.textContent = 'Last';
  div.appendChild(btn1);
  div.appendChild(btn2);
  document.body.appendChild(div);
  return div;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useFocusTrap', () => {
  it('moves focus to first focusable child on mount', () => {
    const container = makeContainer();
    const first = container.querySelector('button')!;

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, vi.fn());
    });

    expect(document.activeElement).toBe(first);
  });

  it('calls onClose when Escape is pressed', () => {
    const container = makeContainer();
    const onClose = vi.fn();

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, onClose);
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps focus from last to first on Tab', () => {
    const container = makeContainer();
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    buttons[buttons.length - 1].focus(); // focus the last button

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, vi.fn());
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('wraps focus from first to last on Shift+Tab', () => {
    const container = makeContainer();
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    buttons[0].focus(); // focus the first button

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, vi.fn());
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('does nothing for non-Tab/non-Escape keys', () => {
    const container = makeContainer();
    const onClose = vi.fn();

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, onClose);
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
