import { messages, type Lang } from '../../i18n';

export type SeatWeis = { points: number; counts: boolean };

type Card = { suit: string; rank: string; playerId?: number };

// The Weis a player announces with their first card: shown next to the seat during the first
// trick, from the moment that seat has played (your own from the start, you know your hand).
// Which team's Weis counts is only settled once all four have played.
export function seatWeis(
  weis: Record<string, any[]> | undefined,
  weisWinner: { teamId: number } | null | undefined,
  player: { id: number; team: number; position?: string },
  players: { tricks?: any[] }[],
  trick: Card[] | undefined,
): SeatWeis | null {
  const mine = weis?.[player.id];
  if (!Array.isArray(mine) || mine.length === 0) return null;
  const firstTrick = players.every((p) => (p.tricks?.length || 0) === 0);
  if (!firstTrick) return null;
  const cards = trick || [];
  // A server trick without player ids can't tell who has played: show the Weis right away.
  const announced =
    cards.some((c) => c.playerId === player.id) || cards.some((c) => c.playerId == null);
  if (!announced && player.position !== 'south') return null;
  return {
    points: mine.reduce((sum, w) => sum + (w.points || 0), 0),
    counts: cards.length < 4 || !weisWinner || weisWinner.teamId === player.team,
  };
}

// Stöck is called when its second card (König or Ober of trump) is played: true for that trick.
export function seatStoeck(
  stoeck: number[] | undefined,
  trump: string | null | undefined,
  playerId: number,
  trick: Card[] | undefined,
): boolean {
  if (!trump || !stoeck?.includes(playerId)) return false;
  return (trick || []).some(
    (c) => c.playerId === playerId && c.suit === trump && (c.rank === 'K' || c.rank === 'O'),
  );
}

// Name of a Weis in the chosen language, built from its cards (both engines send them in order).
export function weisLabel(w: { cards?: Card[] }, lang: Lang): string {
  const m = messages(lang);
  const cards = w.cards || [];
  if (cards.length === 0) return '';
  const rank = (r: string) => m.ranks[r] ?? r;
  const first = cards[0];
  const last = cards[cards.length - 1];
  if (cards.length === 4 && cards.every((c) => c.rank === first.rank))
    return m.weis.four(rank(first.rank), first.rank);
  return m.weis.sequence(
    cards.length,
    m.suits[first.suit] ?? first.suit,
    rank(first.rank),
    rank(last.rank),
  );
}
