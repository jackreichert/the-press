import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Traps focus inside containerRef for the lifetime of the component.
 * Moves focus to the first focusable child on mount.
 * Restores focus to the previously focused element on unmount.
 * Closes on Escape via onClose.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    focusable[0]?.focus();

    function handleKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusableNow = Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusableNow.length === 0) return;

      const first = focusableNow[0];
      const last = focusableNow[focusableNow.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      previousFocus?.focus();
    };
  }, [containerRef]); // containerRef identity is stable; equivalent to []
}
