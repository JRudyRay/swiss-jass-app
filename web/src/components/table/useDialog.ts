import { useEffect, useId, useRef } from 'react';
import type React from 'react';

const FOCUSABLE = 'button:not([disabled]), summary';

// Shared modal-dialog behaviour: Esc closes, Tab stays inside, focus moves to the close button on
// open and returns to `returnFocusRef` on close, and `titleId` labels the dialog.
// Use it in a component that is mounted only while the dialog is open.
export function useDialog(onClose: () => void, returnFocusRef: React.RefObject<HTMLElement>) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const close = () => {
    onCloseRef.current();
    returnFocusRef.current?.focus();
  };
  const closeFnRef = useRef(close);
  closeFnRef.current = close;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeFnRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) || []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!sheetRef.current?.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  };

  return { sheetRef, closeRef, titleId, close, onKeyDown };
}
