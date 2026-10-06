import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (!collect || !currentTrick || currentTrick.length !== 4) return;
    setLast({ cards: currentTrick.map((c) => ({ ...c })), winnerId: collect.winnerId });
    // Only a new collection starts a new snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collect]);

  useEffect(() => {
    if (reset) setLast(null);
  }, [reset]);

  return last;
}
