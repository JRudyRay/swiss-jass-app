import { randomUUID } from 'crypto';

interface Card { suit: string; rank: string; }
interface PlayerState { userId: string; seatIndex: number; hand: Card[]; }
interface TableGameState {
  tableId: string;
  gameType: string;
  trump: string | null;
  players: PlayerState[];
  dealerSeat: number;
  currentPlayerSeat: number;
  startedAt: number;
}

const suits = ['S','H','D','C'];
const ranks = ['A','K','Q','J','10','9','8','7','6'];

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of suits) for (const r of ranks) deck.push({ suit: s, rank: r });
  return deck;
}

function shuffle<T>(arr: T[]): T[] { return arr.map(a => [Math.random(), a] as [number,T]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]); }

class MultiGameManager {
  private games = new Map<string, TableGameState>();

  startGame(tableId: string, gameType: string, seats: { userId: string; seatIndex: number; }[]): TableGameState {
    const deck = shuffle(buildDeck());
    const players: PlayerState[] = seats.sort((a,b)=>a.seatIndex-b.seatIndex).map(s => ({ userId: s.userId, seatIndex: s.seatIndex, hand: [] }));
    // Simple deal: 9 cards each
    for (let round=0; round<9; round++) {
      for (const p of players) {
        p.hand.push(deck.shift()!);
      }
    }
    const dealerSeat = 0; // placeholder
    const state: TableGameState = {
      tableId,
      gameType,
      trump: null,
      players,
      dealerSeat,
      currentPlayerSeat: (dealerSeat+1)%players.length,
      startedAt: Date.now()
    };
    this.games.set(tableId, state);
    return state;
  }

  getState(tableId: string) { return this.games.get(tableId); }
}

export const multiGameManager = new MultiGameManager();
