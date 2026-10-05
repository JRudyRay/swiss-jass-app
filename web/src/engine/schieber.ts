// Minimal Schieber engine for local play (client-side)
// Implements deck, dealing, trump rules, trick resolution and scoring.
// Enhanced with authentic Swiss Jass features and terminology

export type Suit = 'eicheln' | 'schellen' | 'rosen' | 'schilten';
export type Rank = '6'|'7'|'8'|'9'|'10'|'U'|'O'|'K'|'A';
export type TrumpContract = 'eicheln' | 'schellen' | 'rosen' | 'schilten' | 'oben-abe' | 'unden-ufe';

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type Player = { id: number; name: string; team: number; hand: Card[]; tricks: Card[]; points?: number; weis?: WeisDeclaration[] };

export type WeisType =
  | 'sequence3'
  | 'sequence4'
  | 'sequence5plus'
  | 'four_jacks'
  | 'four_nines'
  | 'four_aces'
  | 'four_kings'
  | 'four_queens'
  | 'four_tens'
  | 'four_misc';

export type WeisDeclaration = {
  type: WeisType;
  cards: Card[];
  points: number;
  description: string;
};

export type State = {
  phase: 'dealing'|'trump_selection'|'playing'|'resolving'|'scoring'|'finished';
  trump?: TrumpContract | null;
  currentPlayer: number; // 0..3
  dealer: number; // 0..3, rotates after each hand
  forehand?: number | null;
  // currentTrick entries now include playerId so UI can show origin
  currentTrick: (Card & { playerId: number })[]; // up to 4
  // lastTrick holds the last completed trick (used by UI to display before clearing)
  lastTrick?: (Card & { playerId: number })[];
  trickLead?: Suit | null;
  players: Player[];
  scores: { team1: number; team2: number };
  // cumulative scores when the current hand started; settleHand only scores the hand itself
  handStartScores?: { team1: number; team2: number };
  // when a trick of 4 cards has been played and UI should show it before resolving
  pendingResolve?: boolean;
  // Weis declarations for each player after trump is selected
  weis?: Record<number, WeisDeclaration[]>; // playerId -> declarations
  // Pending Stöck declarations (tracked once trump is known)
  stoeckPending?: Record<number, { remaining: number; awarded: boolean }>;
  // Swiss Jass authentic features
  trumpMultiplier?: number; // 1x, 2x (Schellen/Schilten), 3x (Oben-abe), 4x (Unden-ufe)
  matchBonus?: number; // 100 for taking all 9 tricks
  // player id who declared the contract (set during trump selection)
  declarer?: number | null;
  // Match target. The first team to reach it wins at once, even mid-hand ("Stöck, Weis, Stich").
  target?: number;
  // Set when the match is over: the team that reached the target first.
  matchWinner?: 1 | 2 | null;
  // Every card played this hand, in order, with the suit that was led. Public
  // information that bots use as card memory. Missing in old saved games (treat as []).
  played?: PlayedCard[];
};

export type PlayedCard = { playerId: number; suit: Suit; rank: Rank; lead: Suit | null; trickNo: number };

export const suits: Suit[] = ['eicheln','schellen','rosen','schilten'];
export const ranks: Rank[] = ['6','7','8','9','10','U','O','K','A'];

// Point values for non-trump
const basePoints: Record<Rank, number> = {
  '6':0,'7':0,'8':0,'9':0,'10':10,'U':2,'O':3,'K':4,'A':11
};

// In trump, U (Unter) = 20, 9 = 14
const trumpOverride: Record<Rank, number> = {
  'U':20,'9':14,'A':11,'10':10,'K':4,'O':3,'8':0,'7':0,'6':0
};

// Comparators: higher returns positive
// Obenabe and Undenufe: no trump, every 8 is worth 8; in Undenufe the 6 takes
// the Ass's 11 and the Ass is worth nothing. Each contract totals 152 + 5.
const obenPoints: Record<Rank, number> = { ...basePoints, '8': 8 };
const undenPoints: Record<Rank, number> = { ...basePoints, '8': 8, '6': 11, 'A': 0 };

export function cardPoints(card: { suit: Suit; rank: Rank }, contract: TrumpContract | 'schieben' | null | undefined): number {
  if (contract === 'oben-abe') return obenPoints[card.rank];
  if (contract === 'unden-ufe') return undenPoints[card.rank];
  return card.suit === contract ? trumpOverride[card.rank] : basePoints[card.rank];
}

// For ordering cards (not points) we need rank order lists.
// Swiss Jass ordering adjusted so '10' does NOT beat Under/Oben/King/Ace.
// Stronger cards appear earlier in the arrays (lower index = stronger).
// Trump order: Under highest, then 9, Ace, King, Ober, then 10, 8,7,6
const trumpOrder: Rank[] = ['U','9','A','K','O','10','8','7','6'];
// Normal (non-trump) order: Ace, King, Ober, Under, then 10, 9, 8,7,6
const normalOrder: Rank[] = ['A','K','O','U','10','9','8','7','6'];

// Return index in an order array for comparisons. Lower index = stronger card.
export function rankOrderIndex(rank: Rank, contract: TrumpContract | null | undefined, isTrumpCard: boolean) {
  // Special contracts without a suit-trump: 'oben-abe' and 'unden-ufe'
  if (contract === 'unden-ufe') {
    // In Unden-ufe the natural order is reversed: 6 highest, Ass lowest
    const undenOrder: Rank[] = ['6','7','8','9','10','U','O','K','A'];
    return undenOrder.indexOf(rank);
  }
  if (contract === 'oben-abe') {
    // Oben-abe: Ace high ordering (normalOrder)
    return normalOrder.indexOf(rank);
  }

  // Regular contract: if this card is a suit-trump, use trumpOrder, otherwise normalOrder
  if (isTrumpCard) return trumpOrder.indexOf(rank);
  return normalOrder.indexOf(rank);
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

// First names the bots pick from, from all four language regions.
export const BOT_NAMES = [
  'Anna', 'Reto', 'Fritz', 'Heidi', 'Urs', 'Beat', 'Vreni', 'Ruedi', 'Sepp', 'Margrit',
  'Hansruedi', 'Erika', 'Kurt', 'Ursula', 'Werner', 'Barbara', 'Peter', 'Claudia', 'Toni', 'Silvia',
  'Trudi', 'Köbi', 'Heiri', 'Bethli', 'Hanspeter', 'Doris', 'Marlies', 'Ernst', 'Lisbeth', 'Röbi',
  'Jürg', 'Monika', 'Thomas', 'Sandra', 'Andreas', 'Esther', 'Christian', 'Regula', 'Stefan', 'Corinne',
  'Jean', 'Sophie', 'Pierre', 'Chantal', 'Luc', 'Mireille', 'Yves', 'Nathalie',
  'Luca', 'Chiara', 'Marco', 'Giulia', 'Matteo', 'Elena', 'Gianni', 'Franca',
  'Gian', 'Ladina', 'Curdin', 'Mengia', 'Flurin', 'Seraina',
];

// Three distinct random bot names, marked as bots.
export function pickBotNames(rand: () => number = Math.random): string[] {
  const pool = [...BOT_NAMES];
  const out: string[] = [];
  while (out.length < 3) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0] + ' (bot)');
  return out;
}

// Deal a fresh hand. `names` are the four player names by id (0 is the human).
export function deal(names: string[] = ['You', ...pickBotNames()]): Player[] {
  const deck = createDeck();
  shuffle(deck);
  const players: Player[] = [0,1,2,3].map(i => ({ id: i, name: names[i] || `Player ${i+1}`, team: i%2===0?1:2, hand: [], tricks: [], points: 0, weis: [] }));
  // 36 cards, 9 each
  for (let i=0;i<9;i++) {
    for (let p=0;p<4;p++) {
      const card = deck.pop()!;
      players[p].hand.push(card);
    }
  }
  return players;
}

export function startGameLocal(previousDealer?: number, botNames: string[] = pickBotNames(), target?: number, rand: () => number = Math.random): State {
  const players = deal(['You', ...botNames]);
  // Dealer rotates counter-clockwise in Swiss Jass (0->3->2->1->0); the first dealer is random.
  const dealer = previousDealer !== undefined ? (previousDealer - 1 + 4) % 4 : Math.floor(rand() * 4);
  const forehand = (dealer - 1 + 4) % 4;
  // Forehand (player to the right of dealer) chooses trump first
  const st: State = { 
    phase: 'trump_selection', 
    trump: null, 
    currentPlayer: forehand, 
    dealer,
    forehand,
    currentTrick: [], 
    trickLead: null, 
    players, 
    scores: { team1: 0, team2: 0 },
    target,
    played: [],
  };
  return st;
}

// Start a new hand with proper dealer rotation
export function startNewHand(previousState: State): State {
  // Same players for the whole match, only the cards change.
  const players = deal(previousState.players.map(p => p.name));
  // Dealer rotates counter-clockwise in Swiss Jass
  const dealer = (previousState.dealer - 1 + 4) % 4;
  const forehand = (dealer - 1 + 4) % 4;
  // Forehand chooses trump for the new hand
  const st: State = { 
    phase: 'trump_selection', 
    trump: null, 
    currentPlayer: forehand, 
    dealer,
    forehand,
    currentTrick: [], 
    trickLead: null, 
    players, 
    scores: { ...previousState.scores }, // Keep cumulative scores
    handStartScores: { ...previousState.scores },
    target: previousState.target,
    played: [],
  };
  return st;
}

// Choose a random trump suit
export function chooseRandomTrump(): Suit {
  return suits[Math.floor(Math.random()*suits.length)];
}

// How good a hand is for each contract (rough expected strength, not points).
export function contractStrength(hand: Card[], contract: TrumpContract): number {
  const has = (s: Suit, r: Rank) => hand.some(c => c.suit === s && c.rank === r);
  if (contract === 'oben-abe' || contract === 'unden-ufe') {
    // Count the cards that will win their trick from the top of each suit.
    const order: Rank[] = contract === 'oben-abe' ? ['A','K','O','U','10','9','8','7','6'] : ['6','7','8','9','10','U','O','K','A'];
    let score = 0;
    for (const s of suits) {
      for (const r of order) { if (!has(s, r)) break; score += 3.2; }
    }
    return score;
  }
  const trump = contract as Suit;
  const trumpValue: Partial<Record<Rank, number>> = { U: 6, '9': 4.5, A: 3, K: 2, O: 1.5 };
  let score = 0;
  for (const c of hand) {
    if (c.suit === trump) score += trumpValue[c.rank] ?? 1;
    else if (c.rank === 'A') score += 2;
    else if (c.rank === 'K' && has(c.suit, 'A')) score += 1;
  }
  return score;
}

// BASELINE bot (kept unchanged as the opponent for scripts/h2h.ts; the game
// uses engine/bot.ts). Bot contract choice. The forehand may schieben with a weak hand; after
// schieben the partner must choose.
export function chooseBotTrump(state: State, playerId: number): TrumpContract | 'schieben' {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return chooseRandomTrump();
  const contracts: TrumpContract[] = ['eicheln','schellen','rosen','schilten','oben-abe','unden-ufe'];
  let best: TrumpContract = 'eicheln';
  let bestScore = -1;
  for (const c of contracts) {
    const s = contractStrength(player.hand, c);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  const pushed = typeof state.forehand === 'number' && playerId !== state.forehand;
  if (!pushed && bestScore < 12) return 'schieben';
  return best;
}

export function setTrumpAndDetectWeis(state: State, trump: TrumpContract | 'schieben'): State {
  const st = JSON.parse(JSON.stringify(state)) as State;
  // If trump passed as 'schieben' from bots, pass the decision to the partner (opposite player).
  // In Schieber a player may 'schieben' to their partner who must then choose; partner cannot pass back.
  if ((trump as any) === 'schieben') {
    // Only the forehand may schieben; the partner can't push it back.
    if (typeof state.forehand === 'number' && state.currentPlayer !== state.forehand) return st;
    // pass selection to partner (opposite player)
    st.currentPlayer = (state.currentPlayer + 2) % 4;
    // remain in trump_selection phase
    st.phase = 'trump_selection';
    st.declarer = null;
    st.trump = null;
    return st;
  }
  // Narrow to proper TrumpContract before assigning
  const realTrump = trump as TrumpContract;
  st.trump = realTrump;
  // record who declared the contract (the player who selected trump)
  st.declarer = state.currentPlayer;
  // Track the original forehand seat for first lead
  if (typeof state.forehand === 'number') {
    st.forehand = state.forehand;
  } else {
    st.forehand = (state.dealer - 1 + 4) % 4;
  }
  
  // Set multiplier based on trump contract (authentic Swiss Jass rules)
  if (trump === 'schellen' || trump === 'schilten') {
    st.trumpMultiplier = 2; // Double for "Sch-" suits (black suits)
  } else if (trump === 'oben-abe') {
    st.trumpMultiplier = 3; // Triple for "tops-down"
  } else if (trump === 'unden-ufe') {
    st.trumpMultiplier = 3; // Triple, same as Oben-abe
  } else {
    st.trumpMultiplier = 1; // Normal for Eicheln/Rosen
  }
  st.matchBonus = 100;
  
  // Detect Weis for all players now that trump is known
  st.weis = {};
  for (const player of st.players) {
    // For no-trump contracts, pass null to detectWeis
    const trumpSuit = (realTrump === 'oben-abe' || realTrump === 'unden-ufe') ? null : realTrump as any;
    player.weis = detectWeis(player.hand, trumpSuit);
    st.weis[player.id] = player.weis;
  }
  // Initialise pending Stöck declarations (only for suit contracts)
  st.stoeckPending = {};
  const trumpSuit = (realTrump === 'oben-abe' || realTrump === 'unden-ufe') ? null : (realTrump as Suit);
  if (trumpSuit) {
    for (const player of st.players) {
      const hasKing = player.hand.some(c => c.suit === trumpSuit && c.rank === 'K');
      const hasQueen = player.hand.some(c => c.suit === trumpSuit && c.rank === 'O');
      if (hasKing && hasQueen) {
        st.stoeckPending[player.id] = { remaining: 2, awarded: false };
      }
    }
  }
  // After trump selection the forehand leads, even if the partner chose via schieben
  st.phase = 'playing';
  st.currentPlayer = typeof st.forehand === 'number' ? st.forehand : st.dealer;
  st.trickLead = null;
  return st;
}

export function getLegalCardsForPlayer(state: State, playerId: number): Card[] {
  const player = state.players.find(p=>p.id===playerId)!;
  if (!player) return [];
  
  // First card of trick - any card allowed
  if (state.currentTrick.length===0) return player.hand.slice();
  
  const leadSuit = state.trickLead!;
  const trumpContract = state.trump as TrumpContract | null | undefined;

  const hand = player.hand;
  const sameSuit = hand.filter(c => c.suit === leadSuit);
  const suitTrump: Suit | null = (trumpContract && (suits as any).includes(trumpContract)) ? trumpContract as Suit : null;

  // Obenabe / Undenufe: follow suit if you can, otherwise anything.
  if (!suitTrump) return sameSuit.length > 0 ? sameSuit : hand.slice();

  // Trump led: follow with trump, except that the Puur never has to be played.
  if (leadSuit === suitTrump) {
    if (sameSuit.every(c => c.rank === 'U')) return hand.slice();
    return sameSuit;
  }

  // Another suit led: follow suit or play trump; with no card of the lead
  // suit anything goes. Undertrumping (a trump lower than one already in the
  // trick) is only allowed when nothing but trumps is left.
  if (hand.every(c => c.suit === suitTrump)) return hand.slice();
  const trickTrumps = state.currentTrick.filter(c => c.suit === suitTrump);
  const bestTrump = trickTrumps.length
    ? Math.min(...trickTrumps.map(c => rankOrderIndex(c.rank, trumpContract, true)))
    : Infinity;
  const allowed = (c: Card) => c.suit !== suitTrump || rankOrderIndex(c.rank, trumpContract, true) < bestTrump;
  const legal = sameSuit.length > 0
    ? hand.filter(c => c.suit === leadSuit || (c.suit === suitTrump && allowed(c)))
    : hand.filter(allowed);
  return legal.length > 0 ? legal : hand.slice();
}

// compare two cards with knowledge of trump and lead suit
export function compareCards(a: Card, b: Card, trumpContract?: TrumpContract | null, leadSuit?: Suit | null) {
  // Return negative when 'a' is stronger than 'b' (consistent with isCardBetter and other helpers)
  const suitTrump: Suit | null = (trumpContract && (suits as any).includes(trumpContract)) ? trumpContract as Suit : null;
  const aIsTrump = suitTrump ? a.suit === suitTrump : false;
  const bIsTrump = suitTrump ? b.suit === suitTrump : false;

  // Preserve historical compare behavior used by some callers/tests:
  // return positive value when a is trump and b is not, negative when b stronger in same category.
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;

  // same trump status: use ordering according to contract (lower index = stronger)
  return rankOrderIndex(a.rank, trumpContract, aIsTrump) - rankOrderIndex(b.rank, trumpContract, bIsTrump);
}

function winnerOfTrick(cards: Card[], trump?: string | null, leadSuit?: Suit | null) {
  let winnerIndex = 0;
  for (let i=1;i<cards.length;i++) {
    const cmp = compareCards(cards[i], cards[winnerIndex], trump as TrumpContract | null | undefined, leadSuit);
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
  const aTrump = (trump as TrumpContract | null | undefined) ? a.suit === (trump as any) : false;
  const bTrump = (trump as TrumpContract | null | undefined) ? b.suit === (trump as any) : false;
    if (aTrump && !bTrump) { best = a; bestIdx = i; continue; }
    if (!aTrump && bTrump) continue;
    // both same trump status; if both are lead suit prefer lead suit
    if (leadSuit) {
      const aLead = a.suit === leadSuit;
      const bLead = b.suit === leadSuit;
      if (aLead && !bLead) { best = a; bestIdx = i; continue; }
      if (!aLead && bLead) continue;
    }
  const ai = rankOrderIndex(a.rank, trump as TrumpContract | null | undefined, aTrump);
  const bi = rankOrderIndex(b.rank, trump as TrumpContract | null | undefined, bTrump);
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
  // Handle Stöck declarations: award 20 points when both trump king and queen are played
  const suitTrump: Suit | null = (st.trump && (suits as any).includes(st.trump)) ? st.trump as Suit : null;
  if (suitTrump && card.suit === suitTrump && (card.rank === 'K' || card.rank === 'O') && st.stoeckPending) {
    const pending = st.stoeckPending[playerId];
    if (pending && !pending.awarded) {
      pending.remaining = Math.max(0, pending.remaining - 1);
      if (pending.remaining === 0) {
        pending.awarded = true;
        const team = st.players.find(p => p.id === playerId)?.team;
        if (team === 1) st.scores.team1 += 20;
        else if (team === 2) st.scores.team2 += 20;
      }
      st.stoeckPending[playerId] = pending;
    }
  }
  // include who played the card so UI can label it
  st.currentTrick.push({ ...card, playerId });
  // card memory for bots (single-player only; the backend has its own engine)
  const playedSoFar = st.played || [];
  st.played = [...playedSoFar, { playerId, suit: card.suit, rank: card.rank, lead: st.trickLead ?? null, trickNo: Math.floor(playedSoFar.length / 4) }];

  // if trick complete
  if (st.currentTrick.length===4) {
  // Instead of resolving immediately, mark pendingResolve so UI can show the last card for a short pause
  st.pendingResolve = true;
  st.phase = 'resolving';
  // do not clear currentTrick here
  } else {
    // Move to next player counter-clockwise
    st.currentPlayer = (st.currentPlayer - 1 + 4) % 4;
  }
  return st;
}

// === WEIS (MELDS) DETECTION FUNCTIONS ===

// Convert rank to numeric value for sequence checking
function rankToNumber(rank: Rank): number {
  const rankOrder = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
  return rankOrder.indexOf(rank);
}

// Detect all possible Weis for a hand
export function detectWeis(hand: Card[], trump?: string | null): WeisDeclaration[] {
  const weis: WeisDeclaration[] = [];
  
  // Group cards by suit for sequence detection
  const bySuit: { [suit: string]: Card[] } = {};
  for (const card of hand) {
    if (!bySuit[card.suit]) bySuit[card.suit] = [];
    bySuit[card.suit].push(card);
  }
  
  // Sort each suit by rank
  for (const suit in bySuit) {
    bySuit[suit].sort((a, b) => rankToNumber(a.rank) - rankToNumber(b.rank));
  }
  
  // Check for sequences in each suit
  for (const suit in bySuit) {
    const cards = bySuit[suit];
    if (cards.length >= 3) {
      const sequences = findSequences(cards);
      for (const seq of sequences) {
        const length = seq.length;
        if (length >= 3) {
          const points = length === 3 ? 20
            : length === 4 ? 50
            : length === 5 ? 100
            : length === 6 ? 150
            : length === 7 ? 200
            : length === 8 ? 250
            : 300; // length 9
          const type: WeisType = length >= 5 ? 'sequence5plus' : (length === 4 ? 'sequence4' : 'sequence3');
          weis.push({
            type,
            cards: seq,
            points,
            description: `Sequenz ${length} (${seq[0].rank}-${seq[length-1].rank} ${suit})`
          });
        }
      }
    }
  }
  
  // Group cards by rank for four-of-a-kind detection
  const byRank: { [rank: string]: Card[] } = {};
  for (const card of hand) {
    if (!byRank[card.rank]) byRank[card.rank] = [];
    byRank[card.rank].push(card);
  }
  
  // Check for four of a kind
  for (const rank in byRank) {
    if (byRank[rank].length === 4) {
      const cards = byRank[rank];
      const base = rank === 'U' ? { type: 'four_jacks' as WeisType, points: 200, label: 'Vier Buben' }
        : rank === '9' ? { type: 'four_nines' as WeisType, points: 150, label: 'Vier Neuner' }
        : rank === 'A' ? { type: 'four_aces' as WeisType, points: 100, label: 'Vier Asse' }
        : rank === 'K' ? { type: 'four_kings' as WeisType, points: 100, label: 'Vier Könige' }
        : rank === 'O' ? { type: 'four_queens' as WeisType, points: 100, label: 'Vier Damen' }
        : rank === '10' ? { type: 'four_tens' as WeisType, points: 100, label: 'Vier Zehner' }
        : null; // four 6s, 7s or 8s don't count
      if (!base) continue;
      weis.push({
        type: base.type,
        cards,
        points: base.points,
        description: base.label
      });
    }
  }
  
  return weis;
}

// Find consecutive sequences in a sorted array of cards
function findSequences(sortedCards: Card[]): Card[][] {
  const sequences: Card[][] = [];
  let currentSeq: Card[] = [sortedCards[0]];
  
  for (let i = 1; i < sortedCards.length; i++) {
    const prev = rankToNumber(sortedCards[i-1].rank);
    const curr = rankToNumber(sortedCards[i].rank);
    
    if (curr === prev + 1) {
      // Consecutive
      currentSeq.push(sortedCards[i]);
    } else {
      // End of sequence
      if (currentSeq.length >= 3) {
        sequences.push(currentSeq);
      }
      currentSeq = [sortedCards[i]];
    }
  }
  
  // Don't forget the last sequence
  if (currentSeq.length >= 3) {
    sequences.push(currentSeq);
  }
  
  return sequences;
}

// The player holding the single best Weis, or null when nobody has any.
// Complete ties go to the player who comes first in play order from the forehand.
export function bestWeis(players: { id: number; team: number; weis?: WeisDeclaration[] }[], trump?: TrumpContract | null, forehand?: number | null): { playerId: number; teamId: number } | null {
  const start = typeof forehand === 'number' ? forehand : 0;
  let best: { weis: WeisDeclaration; playerId: number; teamId: number; order: number } | null = null;
  for (const player of players) {
    const order = (player.id - start + 4) % 4;
    for (const weis of player.weis || []) {
      if (!best || isWeisBetter(weis, best.weis, trump)
          || (!isWeisBetter(best.weis, weis, trump) && order < best.order)) {
        best = { weis, playerId: player.id, teamId: player.team, order };
      }
    }
  }
  return best ? { playerId: best.playerId, teamId: best.teamId } : null;
}

// Weis scoring: the team holding the best Weis scores all of its Weis;
// the other team scores none.
export function calculateTeamWeis(players: Player[], trump?: TrumpContract | null, forehand?: number | null): { team1: number, team2: number, details: { [playerId: number]: WeisDeclaration[] } } {
  const details: { [playerId: number]: WeisDeclaration[] } = {};
  for (const player of players) details[player.id] = player.weis || [];
  const winner = bestWeis(players, trump, forehand);
  const teamTotal = (team: number) => players.filter(p => p.team === team)
    .reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
  return {
    team1: winner?.teamId === 1 ? teamTotal(1) : 0,
    team2: winner?.teamId === 2 ? teamTotal(2) : 0,
    details,
  };
}

// Is Weis a strictly better than b? Higher points; between sequences of equal
// points the longer, then the higher (lower in Undenufe), then the trump one.
export function isWeisBetter(a: WeisDeclaration, b: WeisDeclaration, trump?: TrumpContract | null): boolean {
  if (a.points !== b.points) return a.points > b.points;
  if (a.type.startsWith('sequence') && b.type.startsWith('sequence')) {
    if (a.cards.length !== b.cards.length) return a.cards.length > b.cards.length;
    const top = (w: WeisDeclaration) => Math.max(...w.cards.map(c => rankToNumber(c.rank)));
    const low = (w: WeisDeclaration) => Math.min(...w.cards.map(c => rankToNumber(c.rank)));
    if (trump === 'unden-ufe') {
      if (low(a) !== low(b)) return low(a) < low(b);
    } else if (top(a) !== top(b)) {
      return top(a) > top(b);
    }
    const aTrump = !!trump && a.cards.length > 0 && a.cards[0].suit === trump;
    const bTrump = !!trump && b.cards.length > 0 && b.cards[0].suit === trump;
    return aTrump && !bTrump;
  }
  return false;
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
  const isFirstTrick = st.players.every(p => (p.tricks?.length || 0) === 0);
  // store lastTrick for UI to display briefly
  st.lastTrick = wonCards.slice();
  st.players.find(p=>p.id===winnerPlayer)!.tricks.push(...wonCards.map(c => ({ id: c.id, suit: c.suit, rank: c.rank })) as any);
  // compute trick points and add to winner team
  let trickPoints = 0;
  for (const c of wonCards) trickPoints += cardPoints(c, st.trump);
  
  // Add 5 points bonus for winning the last trick (when all hands are empty)
  const isLastTrick = st.players.every(p => p.hand.length === 0);
  if (isLastTrick) {
    trickPoints += 5;
  }
  const winnerTeam = st.players.find(p=>p.id===winnerPlayer)!.team;

  st.currentTrick = [];
  st.trickLead = null;
  st.currentPlayer = winnerPlayer;
  st.pendingResolve = false;

  // Reaching the target ends the match at once, counted in the order Stöck, Weis, Stich.
  // Stöck from this trick is already in st.scores; Weis counts with the first trick.
  let reachedBy: 1 | 2 | null = null;
  let reachedTotals: { team1: number; team2: number } | null = null;
  const check = (withWeis: boolean) => {
    if (reachedBy || !st.target) return;
    const totals = runningTotals(st, withWeis);
    const team = teamAtTarget(totals, st.target);
    if (team) { reachedBy = team; reachedTotals = totals; }
  };
  check(!isFirstTrick);
  if (isFirstTrick) check(true);

  if (winnerTeam === 1) st.scores.team1 += trickPoints; else st.scores.team2 += trickPoints;

  // if all hands empty, finish: perform final settlement (Weis, multiplier, match bonus) and distribute scores
  if (!reachedBy && st.players.every(p => p.hand.length === 0)) {
    const settled = settleHand(st);
    st.scores = settled.scores;
    st.trumpMultiplier = settled.trumpMultiplier;
    st.matchBonus = settled.matchBonus;
    st.phase = 'finished';
    if (st.target) st.matchWinner = teamAtTarget(st.scores, st.target);

    // Distribute team scores to individual players for rankings
    const team1Players = st.players.filter(p => p.team === 1);
    const team2Players = st.players.filter(p => p.team === 2);
    const team1Score = st.scores.team1;
    const team2Score = st.scores.team2;
    team1Players.forEach(p => p.points = team1Score);
    team2Players.forEach(p => p.points = team2Score);

    // The hand is over. The caller decides whether the match continues
    // (startNewHand) or someone reached the target score.
  } else {
    if (!reachedBy) check(true);
    if (reachedBy) {
      st.scores = reachedTotals!;
      st.phase = 'finished';
      st.matchWinner = reachedBy;
      st.players.forEach(p => p.points = p.team === 1 ? st.scores.team1 : st.scores.team2);
    } else {
      st.phase = 'playing';
    }
  }
  return st;
}

// Match totals at this point of the hand: start-of-hand score + multiplier × (points so far, plus Weis).
export function runningTotals(state: State, withWeis: boolean): { team1: number; team2: number } {
  const mult = state.trumpMultiplier || 1;
  const base = state.handStartScores || { team1: 0, team2: 0 };
  const weis = withWeis ? calculateTeamWeis(state.players, state.trump as TrumpContract | null, state.forehand) : { team1: 0, team2: 0 };
  return {
    team1: base.team1 + mult * ((state.scores.team1 - base.team1) + (weis.team1 || 0)),
    team2: base.team2 + mult * ((state.scores.team2 - base.team2) + (weis.team2 || 0)),
  };
}

// The team at or over the target (the higher total if both are).
export function teamAtTarget(scores: { team1: number; team2: number }, target: number): 1 | 2 | null {
  const a = scores.team1 >= target, b = scores.team2 >= target;
  if (a && b) return scores.team2 > scores.team1 ? 2 : 1;
  return a ? 1 : b ? 2 : null;
}

// Apply Weis points, contract multiplier and match bonus in one settlement step
export function settleHand(state: State): State {
  const st = JSON.parse(JSON.stringify(state)) as State;
  const multiplier = st.trumpMultiplier || 1;

  // Weis resolution (which team wins the Weis and their total Weis points)
  const weisScore = calculateTeamWeis(st.players, st.trump as TrumpContract | null, st.forehand);

  // Raw trick scores (should sum to 157 including last-trick bonus)
  // st.scores is cumulative across hands; only this hand's points are settled.
  const base = st.handStartScores || { team1: 0, team2: 0 };
  const rawTeam1 = (st.scores.team1 || 0) - (base.team1 || 0);
  const rawTeam2 = (st.scores.team2 || 0) - (base.team2 || 0);

  // Add Weis points to the raw totals
  let t1 = rawTeam1 + (weisScore.team1 || 0);
  let t2 = rawTeam2 + (weisScore.team2 || 0);


  // The contract multiplier applies to both teams (standard Schieber)
  t1 = t1 * multiplier;
  t2 = t2 * multiplier;


  // Check for match-all (one team captured all tricks) and award match bonus (multiplied)
  try {
    const team1Cards = st.players.filter(p=>p.team===1).reduce((s,p)=>s + (p.tricks?.length||0), 0);
    const team2Cards = st.players.filter(p=>p.team===2).reduce((s,p)=>s + (p.tricks?.length||0), 0);
    const matchBonus = st.matchBonus || 100;
    if (team1Cards === 36) {
      t1 += matchBonus * multiplier;
    } else if (team2Cards === 36) {
      t2 += matchBonus * multiplier;
    }
  } catch (e) {
    // ignore
  }


  st.scores.team1 = (base.team1 || 0) + t1;
  st.scores.team2 = (base.team2 || 0) + t2;
  return st;
}

// BASELINE bot (kept unchanged as the opponent for scripts/h2h.ts; the game
// uses engine/bot.ts). Bot card play: lead boss cards and pull trumps when holding the Puur,
// let the partner's trick stand (and add points to it when it is safe),
// win tricks as cheaply as possible, otherwise give away the cheapest card.
export function chooseBotCard(state: State, botId: number): string | null {
  const legal = getLegalCardsForPlayer(state, botId);
  const bot = state.players.find(p => p.id === botId);
  if (legal.length === 0) return bot?.hand?.[0]?.id ?? null;
  if (legal.length === 1) return legal[0].id;

  const contract = state.trump as TrumpContract | null;
  const trumpSuit: Suit | null = contract && (suits as string[]).includes(contract) ? contract as Suit : null;
  const trick = state.currentTrick;
  const lead = state.trickLead;
  const isTrump = (c: Card) => c.suit === trumpSuit;
  const pts = (c: Card) => cardPoints(c, contract);
  const strength = (c: Card) => rankOrderIndex(c.rank, contract, isTrump(c)); // lower = stronger
  // Cheapest card to give away: keep trumps, keep points, keep strong cards.
  const byCheapest = (a: Card, b: Card) =>
    (Number(isTrump(a)) - Number(isTrump(b))) || (pts(a) - pts(b)) || (strength(b) - strength(a));
  const cheapest = () => legal.slice().sort(byCheapest)[0];

  // Cards already out of play (won tricks plus the current trick).
  const played = new Set<string>();
  for (const p of state.players) for (const c of p.tricks || []) played.add(`${c.suit}${c.rank}`);
  for (const c of trick) played.add(`${c.suit}${c.rank}`);
  const isBoss = (c: Card) => !ranks.some(r =>
    r !== c.rank && rankOrderIndex(r, contract, isTrump(c)) < strength(c)
    && !played.has(`${c.suit}${r}`) && !bot!.hand.some(h => h.suit === c.suit && h.rank === r));

  if (trick.length === 0) {
    const trumps = legal.filter(isTrump);
    const ourContract = typeof state.declarer === 'number'
      && state.players.find(p => p.id === state.declarer)?.team === bot!.team;
    const trumpsOut = trumpSuit ? ranks.filter(r => !played.has(`${trumpSuit}${r}`)).length - trumps.length : 0;
    // Pull the opponents' trumps with a boss trump when it's our contract.
    if (ourContract && trumpsOut > 0) {
      const bossTrump = trumps.find(isBoss);
      if (bossTrump) return bossTrump.id;
    }
    const sideBoss = legal.filter(c => !isTrump(c) && isBoss(c)).sort((a, b) => pts(b) - pts(a));
    if (sideBoss.length) return sideBoss[0].id;
    // Otherwise a low card from the longest side suit.
    const side = legal.filter(c => !isTrump(c));
    if (side.length) {
      const count = (s: Suit) => side.filter(c => c.suit === s).length;
      return side.sort((a, b) => (count(b.suit) - count(a.suit)) || byCheapest(a, b))[0].id;
    }
    return cheapest().id;
  }

  const winning = getCurrentTrickWinner(trick, contract, lead)!;
  const partnerWinning = state.players.find(p => p.id === winning.playerId)?.team === bot!.team;
  const last = trick.length === 3;

  if (partnerWinning) {
    // Partner's card can't be beaten (last to play, or it's the boss): add points to it.
    const safe = last || (isBoss(winning) && (isTrump(winning) || !trumpSuit));
    if (safe) {
      const smear = legal.filter(c => !isTrump(c) && !(isBoss(c) && !last && pts(c) === 0))
        .sort((a, b) => (pts(b) - pts(a)) || (strength(b) - strength(a)))[0];
      if (smear && pts(smear) > 0) return smear.id;
    }
    return cheapest().id;
  }

  const winners = canBotWinTrick(legal, trick, contract, lead);
  if (winners.length) {
    const trickPts = trick.reduce((s, c) => s + pts(c), 0);
    // Last to play: take it with the card that is cheapest to spend.
    // Earlier: take it with a boss card when possible so it holds.
    const pick = winners.slice().sort((a, b) => last
      ? (Number(isTrump(a)) - Number(isTrump(b))) || (strength(b) - strength(a))
      : (Number(isBoss(b)) - Number(isBoss(a))) || (Number(isTrump(a)) - Number(isTrump(b))) || (strength(b) - strength(a)))[0];
    // Don't spend the Puur or the Nell on a trick with hardly any points.
    const precious = isTrump(pick) && (pick.rank === 'U' || pick.rank === '9');
    if (!(precious && trickPts < 10 && !last)) return pick.id;
  }
  return cheapest().id;
}

// Helper: Check which cards can win the current trick
function canBotWinTrick(legal: Card[], trick: (Card & { playerId: number })[], trumpContract: TrumpContract | 'schieben' | null | undefined, leadSuit: Suit | null | undefined): Card[] {
  if (trick.length === 0) return legal; // First card always "wins" initially
  
  let currentBest = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (isCardBetter(trick[i], currentBest, trumpContract, leadSuit)) {
      currentBest = trick[i];
    }
  }

  return legal.filter(card => isCardBetter(card, currentBest, trumpContract, leadSuit));
}

// Helper: Get current trick winner
export function getCurrentTrickWinner(trick: (Card & { playerId: number })[], trumpContract: TrumpContract | 'schieben' | null | undefined, leadSuit: Suit | null | undefined): (Card & { playerId: number }) | null {
  if (trick.length === 0) return null;
  
  let winner = trick[0];
  for (let i = 1; i < trick.length; i++) {
  if (isCardBetter(trick[i], winner, trumpContract, leadSuit)) {
      winner = trick[i];
    }
  }
  return winner;
}

// Helper: Compare card values for sorting (low to high)
function compareCardValue(a: Card, b: Card, trumpContract: TrumpContract | 'schieben' | null | undefined, leadSuit: Suit | null | undefined): number {
  const suitTrump: Suit | null = (trumpContract && (suits as any).includes(trumpContract)) ? trumpContract as Suit : null;
  const aIsTrump = suitTrump ? a.suit === suitTrump : false;
  const bIsTrump = suitTrump ? b.suit === suitTrump : false;

  // Primary sort by point value (lower points first)
  const aPts = cardPoints(a, trumpContract);
  const bPts = cardPoints(b, trumpContract);
  if (aPts !== bPts) return aPts - bPts;

  // Tie-breaker: use rank order index (lower index is stronger) so we want weaker first for ascending order
  const ai = rankOrderIndex(a.rank, trumpContract as any, aIsTrump);
  const bi = rankOrderIndex(b.rank, trumpContract as any, bIsTrump);
  return ai - bi;
}

// Helper: Check if card A beats card B in the current context
export function isCardBetter(a: Card, b: Card, trumpContract: TrumpContract | 'schieben' | null | undefined, leadSuit: Suit | null | undefined): boolean {
  const suitTrump: Suit | null = (trumpContract && (suits as any).includes(trumpContract)) ? trumpContract as Suit : null;
  const aIsTrump = suitTrump ? a.suit === suitTrump : false;
  const bIsTrump = suitTrump ? b.suit === suitTrump : false;

  // Trump beats non-trump
  if (aIsTrump && !bIsTrump) return true;
  if (!aIsTrump && bIsTrump) return false;

  // If both trump or both non-trump, consider lead suit preference
  if (leadSuit) {
    const aFollows = a.suit === leadSuit;
    const bFollows = b.suit === leadSuit;
    if (aFollows && !bFollows) return true;
    if (!aFollows && bFollows) return false;
  }

  // Finally, use rankOrderIndex: lower index means stronger card
  const ai = rankOrderIndex(a.rank, trumpContract as any, aIsTrump);
  const bi = rankOrderIndex(b.rank, trumpContract as any, bIsTrump);
  return ai < bi;
}
