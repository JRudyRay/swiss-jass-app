export type SeatWeis = { points: number; counts: boolean };

// The Weis a player announces with their first card: shown next to the seat during the first
// trick only. `counts` is false when the other team holds the best Weis.
export function seatWeis(
  weis: Record<string, any[]> | undefined,
  weisWinner: { teamId: number } | null | undefined,
  player: { id: number; team: number },
  players: { tricks?: any[] }[],
): SeatWeis | null {
  const mine = weis?.[player.id];
  if (!Array.isArray(mine) || mine.length === 0) return null;
  const firstTrick = players.every((p) => (p.tricks?.length || 0) === 0);
  if (!firstTrick) return null;
  return {
    points: mine.reduce((sum, w) => sum + (w.points || 0), 0),
    counts: !weisWinner || weisWinner.teamId === player.team,
  };
}
