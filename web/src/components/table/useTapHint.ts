import { useCallback, useState } from 'react';

const KEY = 'jassTapHintDone';

// The one-time "tap to select, tap again to play" hint: shown until the first card is played.
export function useTapHint() {
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  const dismiss = useCallback(() => {
    setDone(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* private mode: the hint just returns next visit */
    }
  }, []);
  return { done, dismiss };
}
