import { useCallback, useRef, useState } from 'react';
import type { HandSummary } from '../../engine/schieber';

// Score sheet between two hands. show() resolves when the player moves on (or the game is reset).
export function useHandSummary() {
  const [summary, setSummary] = useState<HandSummary | null>(null);
  const resolver = useRef<(() => void) | null>(null);

  const show = useCallback(
    (s: HandSummary) =>
      new Promise<void>((resolve) => {
        resolver.current?.();
        resolver.current = resolve;
        setSummary(s);
      }),
    [],
  );

  const dismiss = useCallback(() => {
    setSummary(null);
    const done = resolver.current;
    resolver.current = null;
    done?.();
  }, []);

  return { summary, show, dismiss };
}
