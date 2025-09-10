// Minimal Schieber engine for local play (client-side)
// Implements deck, dealing, trump rules, trick resolution and scoring.

export type Suit = 'eicheln' | 'schellen' | 'rosen' | 'schilten';
export type Rank = '6'|'7'|'8'|'9'|'10'|'U'|'O'|'K'|'A';

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type Player = { id: number; name: string; team: number; hand: Card[]; tricks: Card[]; points?: number };

export type State = {
  phase: 'dealing'|'trump_selection'|'playing'|'resolving'|'scoring'|'finished';
  trump?: string | null;
  currentPlayer: number; // 0..3
  // currentTrick entries now include playerId so UI can show origin
  currentTrick: (Card & { playerId: number })[]; // up to 4
  // lastTrick holds the last completed trick (used by UI to display before clearing)
  lastTrick?: (Card & { playerId: number })[];
  trickLead?: Suit | null;
  players: Player[];
  scores: { team1: number; team2: number };
  // when a trick of 4 cards has been played and UI should show it before resolving
  pendingResolve?: boolean;
};

const suits: Suit[] = ['eicheln','schellen','rosen','schilten'];
const ranks: Rank[] = ['6','7','8','9','10','U','O','K','A'];

// Point values for non-trump
const basePoints: Record<Rank, number> = {
  '6':0,'7':0,'8':0,'9':0,'10':10,'U':2,'O':3,'K':4,'A':11
};

// In trump, U (Unter) = 20, 9 = 14
const trumpOverride: Record<Rank, number> = {
  'U':20,'9':14,'A':11,'10':10,'K':4,'O':3,'8':0,'7':0,'6':0
};

// Comparators: higher returns positive
function rankValue(rank: Rank, isTrump: boolean): number {
  if (isTrump) return trumpOverride[rank];
  return basePoints[rank];
}

// For ordering cards (not points) we need rank order lists.
const trumpOrder: Rank[] = ['U','9','A','10','K','O','8','7','6'];
const normalOrder: Rank[] = ['A','10','K','O','U','9','8','7','6'];

function rankOrderIndex(rank: Rank, isTrump: boolean) {
  return (isTrump ? trumpOrder : normalOrder).indexOf(rank);
}

function makeId(suit: Suit, rank: Rank) { return `${suit}_${rank}_${Math.random().toString(36).slice(2,9)}`; }

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of suits) for (const r of ranks) deck.push({ id: makeId(s,r), suit: s, rank: r });
  return deck;
}

export function shuffle<T>(arr: T[]) {
  for (let i = arr.length -1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function deal(): Player[] {
  const deck = createDeck();
  shuffle(deck);
  // Use Swiss-like names and mark bots
  const names = ['You', 'Anna (bot)', 'Reto (bot)', 'Fritz (bot)'];
  const players: Player[] = [0,1,2,3].map(i => ({ id: i, name: names[i] || `Player ${i+1}`, team: i%2===0?1:2, hand: [], tricks: [], points: 0 }));
  // 36 cards, 9 each
  for (let i=0;i<9;i++) {
    for (let p=0;p<4;p++) {
      const card = deck.pop()!;
      players[p].hand.push(card);
    }
  }
  return players;
}

export function startGameLocal(): State {
  const players = deal();
  const st: State = { phase: 'trump_selection', trump: null, currentPlayer: 0, currentTrick: [], trickLead: null, players, scores: { team1: 0, team2: 0 } };
  return st;
}

// Choose a random trump suit
export function chooseRandomTrump(): Suit {
  return suits[Math.floor(Math.random()*suits.length)];
}

export function getLegalCardsForPlayer(state: State, playerId: number): Card[] {
  const player = state.players.find(p=>p.id===playerId)!;
  if (!player) return [];
  if (state.currentTrick.length===0) return player.hand.slice();
  const leadSuit = state.trickLead!;
  const sameSuit = player.hand.filter(c => c.suit === leadSuit);
  if (sameSuit.length) return sameSuit;
  return player.hand.slice();
}

// compare two cards with knowledge of trump and lead suit
function compareCards(a: Card, b: Card, trump?: string | null, leadSuit?: Suit | null) {
  const aIsTrump = trump && a.suit === trump;
  const bIsTrump = trump && b.suit === trump;
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;
  // same trump status
  // if both share lead suit, use normal/trump order
  return rankOrderIndex(a.rank, !!aIsTrump) - rankOrderIndex(b.rank, !!bIsTrump);
}

function winnerOfTrick(cards: Card[], trump?: string | null, leadSuit?: Suit | null) {
  let winnerIndex = 0;
  for (let i=1;i<cards.length;i++) {
    const cmp = compareCards(cards[i], cards[winnerIndex], trump, leadSuit);
    if (cmp < 0) {
      // lower index means higher priority? adjust: our compare returns index difference, so negative means cards[i] higher? Wait
    }
  }
  // simpler: find highest by using sort key
  let bestIdx = 0;
  let best = cards[0];
  for (let i=1;i<cards.length;i++) {
    const a = cards[i];
    const b = best;
    const aTrump = trump && a.suit === trump;
    const bTrump = trump && b.suit === trump;
    if (aTrump && !bTrump) { best = a; bestIdx = i; continue; }
    if (!aTrump && bTrump) continue;
    // both same trump status; if both are lead suit prefer lead suit
    if (leadSuit) {
      const aLead = a.suit === leadSuit;
      const bLead = b.suit === leadSuit;
      if (aLead && !bLead) { best = a; bestIdx = i; continue; }
      if (!aLead && bLead) continue;
    }
    const ai = rankOrderIndex(a.rank, !!aTrump);
    const bi = rankOrderIndex(b.rank, !!bTrump);
    if (ai < bi) { best = a; bestIdx = i; }
  }
  return bestIdx;
}

// Return the absolute player id who would win the current trick (without mutating state)
export function peekTrickWinner(state: State): number | null {
  if (!state.currentTrick || state.currentTrick.length !== 4) return null;
  const lead = state.trickLead!;
  // winnerOfTrick returns the index (0..3) of the winning card in the trick array.
  // Map that index to the absolute player id by reading the playerId stored on the card.
  const winnerIdx = winnerOfTrick(state.currentTrick as any, state.trump || undefined, lead);
  const winnerCard = state.currentTrick[winnerIdx];
  return winnerCard.playerId;
}

export function playCardLocal(state: State, playerId: number, cardId: string): State {
  const st = JSON.parse(JSON.stringify(state)) as State; // naive clone
  const player = st.players.find(p=>p.id===playerId)!;
  const idx = player.hand.findIndex(c=>c.id===cardId);
  if (idx === -1) return st; // illegal
  const card = player.hand.splice(idx,1)[0];
  if (st.currentTrick.length===0) st.trickLead = card.suit;
  // include who played the card so UI can label it
  st.currentTrick.push({ ...card, playerId });

  // if trick complete
  if (st.currentTrick.length===4) {
  // Instead of resolving immediately, mark pendingResolve so UI can show the last card for a short pause
  st.pendingResolve = true;
  st.phase = 'resolving';
  // do not clear currentTrick here
  } else {
    st.currentPlayer = (st.currentPlayer + 1) % 4;
  }

  // detect end of round (all hands empty)
  if (st.players.every(p => p.hand.length === 0)) {
    st.phase = 'finished';
  } else {
    st.phase = 'playing';
  }

  return st;
}

export function resolveTrick(state: State): State {
  const st = JSON.parse(JSON.stringify(state)) as State;
  if (!st.pendingResolve) return st;
  if (!st.currentTrick || st.currentTrick.length !== 4) { st.pendingResolve = false; return st; }
  const lead = st.trickLead!;
  const winnerIdx = winnerOfTrick(st.currentTrick as any, st.trump || undefined, lead);
  const winnerCard = st.currentTrick[winnerIdx];
  const winnerPlayer = winnerCard.playerId;
  const wonCards = st.currentTrick.slice();
  // store lastTrick for UI to display briefly
  st.lastTrick = wonCards.slice();
  st.players.find(p=>p.id===winnerPlayer)!.tricks.push(...wonCards.map(c => ({ id: c.id, suit: c.suit, rank: c.rank })) as any);
  // compute trick points and add to winner team
  let trickPoints = 0;
  for (const c of wonCards) {
    const isTrump = st.trump && c.suit === st.trump;
    trickPoints += isTrump ? trumpOverride[c.rank] : basePoints[c.rank];
  }
  const winnerTeam = st.players.find(p=>p.id===winnerPlayer)!.team;
  if (winnerTeam === 1) st.scores.team1 += trickPoints; else st.scores.team2 += trickPoints;
  st.currentTrick = [];
  st.trickLead = null;
  st.currentPlayer = winnerPlayer;
  st.pendingResolve = false;
  // if all hands empty, finish
  if (st.players.every(p => p.hand.length === 0)) st.phase = 'finished'; else st.phase = 'playing';
  return st;
}

// Simple bot choice: play first legal highest-valued card (by rank order)
export function chooseBotCard(state: State, botId: number): string | null {
  const legal = getLegalCardsForPlayer(state, botId);
  if (legal.length === 0) return null;
  // For now bots play a random legal card
  const pick = legal[Math.floor(Math.random()*legal.length)];
  return pick.id;
}
