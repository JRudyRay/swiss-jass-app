import { useEffect, useRef, useState } from 'react';

export type LastTrickData = {
  // Cards in the order they were played; `card.playerId` says who played each.
  cards: any[];
  winnerId: number;
};

// Remembers the most recently completed trick of the current hand (single-player).
// `collect` is set by the game while a full trick is being collected; `reset` clears the memory
// (new hand, no game running).
export function useLastTrick(
  currentTrick: any[] | undefined,
  collect: { winnerId: number } | null,
  reset: boolean,
): LastTrickData | null {
  const [last, setLast] = useState<LastTrickData | null>(null);

  // The collection that was already snapshotted, so each trick is captured exactly once.
  const snapped = useRef<unknown>(null);
  const count = currentTrick?.length ?? 0;

  // Re-runs when the trick fills up as well as when a collection starts, so a `collect` that
  // arrives before the fourth card is visible is still picked up as soon as it is.
  useEffect(() => {
    if (!collect) {
      snapped.current = null;
      return;
    }
    if (snapped.current === collect || !currentTrick || currentTrick.length !== 4) return;
    snapped.current = collect;
    setLast({ cards: currentTrick.map((c) => ({ ...c })), winnerId: collect.winnerId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collect, count]);

  useEffect(() => {
    if (reset) {
      setLast(null);
      snapped.current = null;
    }
  }, [reset]);

  return last;
}
