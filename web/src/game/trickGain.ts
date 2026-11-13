import * as Schieber from '../engine/schieber';

// What the trick on the table adds to the score strip: card points, the 5 for the last trick,
// times the contract multiplier. Display only; the engine does the real scoring.
export function trickGain(st: Schieber.State): number {
  const cards = st.currentTrick || [];
  const points = cards.reduce((sum, c) => sum + Schieber.cardPoints(c, st.trump as any), 0);
  const lastTrick = st.players.every((p) => p.hand.length === 0);
  return (points + (lastTrick ? 5 : 0)) * Schieber.contractMultiplier(st.trump);
}
