import { useEffect, useRef, useState } from 'react';

export type LastTrickData = {
  // Cards in the order they were played; `card.playerId` says who played each.
  cards: any[];
  winnerId: number;
};

const KEY = 'jassLastTrick';

const load = (): LastTrickData | null => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && Array.isArray(v.cards) && typeof v.winnerId === 'number' ? v : null;
  } catch {
    return null;
  }
};

const store = (v: LastTrickData | null) => {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage full or blocked: the memory copy still works */
  }
};

// Remembers the most recently completed trick of the current hand (single-player), also across a
// page reload. `collect` is set by the game while a full trick is being collected; `reset` clears
// the memory (a new hand's trump selection starts).
export function useLastTrick(
  currentTrick: any[] | undefined,
  collect: { winnerId: number } | null,
  reset: boolean,
  // Undo: put the memory back to what it was (`to`); a new `id` restores again.
  rewind?: { id: number; to: LastTrickData | null } | null,
): LastTrickData | null {
  const [last, setLast] = useState<LastTrickData | null>(load);

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
    const next = { cards: currentTrick.map((c) => ({ ...c })), winnerId: collect.winnerId };
    store(next);
    setLast(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collect, count]);

  useEffect(() => {
    if (!rewind) return;
    store(rewind.to);
    setLast(rewind.to);
    snapped.current = null;
  }, [rewind?.id]);

  useEffect(() => {
    if (reset) {
      store(null);
      setLast(null);
      snapped.current = null;
    }
  }, [reset]);

  return last;
}
