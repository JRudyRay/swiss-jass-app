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
    // In Unden-ufe the 6 is highest, then 7,8,9,U,O,K,10,A
    const undenOrder: Rank[] = ['6','7','8','9','U','O','K','10','A'];
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

export function deal(): Player[] {
  const deck = createDeck();
  shuffle(deck);
  // Use Swiss-like names and mark bots
  const names = ['You', 'Anna (bot)', 'Reto (bot)', 'Fritz (bot)'];
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

export function startGameLocal(previousDealer?: number): State {
  const players = deal();
  // Dealer rotates clockwise each hand (0->1->2->3->0)
  const dealer = previousDealer !== undefined ? (previousDealer + 1) % 4 : 0;
  const forehand = (dealer + 1) % 4;
  // Dealer now chooses trump (user requested): currentPlayer set to dealer
  const st: State = { 
    phase: 'trump_selection', 
    trump: null, 
    currentPlayer: forehand, 
    dealer,
    forehand,
    currentTrick: [], 
    trickLead: null, 
    players, 
    scores: { team1: 0, team2: 0 } 
  };
  return st;
}

// Start a new hand with proper dealer rotation
export function startNewHand(previousState: State): State {
  const players = deal();
  // Dealer rotates clockwise each hand
  const dealer = (previousState.dealer + 1) % 4;
  const forehand = (dealer + 1) % 4;
  // Dealer chooses trump for the new hand
  const st: State = { 
    phase: 'trump_selection', 
    trump: null, 
    currentPlayer: forehand, 
    dealer,
    forehand,
    currentTrick: [], 
    trickLead: null, 
    players, 
    scores: previousState.scores // Keep cumulative scores
  };
  return st;
}

// Choose a random trump suit
export function chooseRandomTrump(): Suit {
  return suits[Math.floor(Math.random()*suits.length)];
}

// Smart bot trump selection based on hand analysis
export function chooseBotTrump(state: State, playerId: number): TrumpContract | 'schieben' {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return chooseRandomTrump();
  
  const hand = player.hand;
  
  // Count cards by suit
  const suitCounts: Record<Suit, number> = {
    'eicheln': 0,
    'schellen': 0, 
    'rosen': 0,
    'schilten': 0
  };
  
  const suitStrength: Record<Suit, number> = {
    'eicheln': 0,
    'schellen': 0,
    'rosen': 0, 
    'schilten': 0
  };
  
  // Analyze hand strength by suit
  hand.forEach(card => {
    suitCounts[card.suit]++;
    
    // Add strength points for high cards
    switch(card.rank) {
      case 'A': suitStrength[card.suit] += 4; break;
      case 'K': suitStrength[card.suit] += 3; break;
      case 'O': suitStrength[card.suit] += 3; break;
      case 'U': suitStrength[card.suit] += 5; break; // Jack is strong in trump
      case '10': suitStrength[card.suit] += 2; break;
      case '9': suitStrength[card.suit] += 1; break; // 9 is strong in trump
    }
  });
  
  // Find best suit (combination of count and strength)
  let bestSuit: Suit = 'eicheln';
  let bestScore = 0;
  
  (Object.keys(suitCounts) as Suit[]).forEach(suit => {
    const score = suitCounts[suit] * 2 + suitStrength[suit];
    if (score > bestScore) {
      bestScore = score;
      bestSuit = suit;
    }
  });
  
  // Sometimes choose special contracts with good hands
  const totalHighCards = hand.filter(c => ['A', 'K', 'O'].includes(c.rank)).length;
  const random = Math.random();
  
  // 10% chance to choose oben-abe with many high cards
  if (totalHighCards >= 5 && random < 0.1) {
    return 'oben-abe';
  }

  // 5% chance to choose unden-ufe with many low cards
  const totalLowCards = hand.filter(c => ['6', '7', '8'].includes(c.rank)).length;
  if (totalLowCards >= 5 && random < 0.05) {
    return 'unden-ufe';
  }

  // If hand is weak overall, sometimes choose to pass (schieben) to partner
  // Reduce pass probability if hand contains several trumps or high cards (don't pass strong hands)
  const handStrength = Object.values(suitStrength).reduce((a,b)=>a+b,0) + totalHighCards*2 - totalLowCards;
  const trumpCount = ['eicheln','schellen','rosen','schilten'].reduce((s, su) => s + player.hand.filter(c => c.suit === su).length, 0);
  let passProb = 0.2;
  if (trumpCount >= 4 || bestScore >= 10) passProb = 0.05; // strong hand -> rarely pass
  if (totalLowCards >= 6) passProb = 0.35; // very low hand -> more likely to pass
  if (handStrength < 6 && Math.random() < passProb) {
    return 'schieben';
  }

  return bestSuit;
}

// Set trump and detect all Weis
export function setTrumpAndDetectWeis(state: State, trump: TrumpContract | 'schieben'): State {
  const st = JSON.parse(JSON.stringify(state)) as State;
  // If trump passed as 'schieben' from bots, pass the decision to the partner (opposite player).
  // In Schieber a player may 'schieben' to their partner who must then choose; partner cannot pass back.
  if ((trump as any) === 'schieben') {
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
    st.forehand = (state.dealer + 1) % 4;
  }
  
  // Set multiplier based on trump contract (authentic Swiss Jass rules)
  if (trump === 'schellen' || trump === 'schilten') {
    st.trumpMultiplier = 2; // Double for "Sch-" suits (black suits)
  } else if (trump === 'oben-abe') {
    st.trumpMultiplier = 3; // Triple for "tops-down"
  } else if (trump === 'unden-ufe') {
    st.trumpMultiplier = 4; // Quadruple for "bottoms-up"
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
  // After trump selection, play always starts with the dealer (even if partner chose via schieben)
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

  // If player has cards of the lead suit, they must follow suit.
  const sameSuit = player.hand.filter(c => c.suit === leadSuit);
  if (sameSuit.length > 0) return sameSuit;

  // No lead suit: if there is a suit-trump, player must play a trump if they have any
  const suitTrump: Suit | null = (trumpContract && (suits as any).includes(trumpContract)) ? trumpContract as Suit : null;
  if (suitTrump) {
    const trumpCards = player.hand.filter(c => c.suit === suitTrump);
    if (trumpCards.length > 0) return trumpCards;
  }

  // Otherwise any card allowed
  const fallback = player.hand.slice();
  return fallback.length > 0 ? fallback : [];
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

  // if trick complete
  if (st.currentTrick.length===4) {
  // Instead of resolving immediately, mark pendingResolve so UI can show the last card for a short pause
  st.pendingResolve = true;
  st.phase = 'resolving';
  // do not clear currentTrick here
  } else {
    st.currentPlayer = (st.currentPlayer + 1) % 4;
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
        : { type: 'four_misc' as WeisType, points: 100, label: 'Vier Gleiche' };
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

// Calculate Weis points for a team (only best Weis counts)
export function calculateTeamWeis(players: Player[]): { team1: number, team2: number, details: { [playerId: number]: WeisDeclaration[] } } {
  const team1Players = players.filter(p => p.team === 1);
  const team2Players = players.filter(p => p.team === 2);
  
  let team1BestWeis: WeisDeclaration | null = null;
  let team2BestWeis: WeisDeclaration | null = null;
  
  const details: { [playerId: number]: WeisDeclaration[] } = {};
  
  // Find best Weis for each team
  for (const player of team1Players) {
    details[player.id] = player.weis || [];
    for (const weis of player.weis || []) {
      if (!team1BestWeis || isWeisBetter(weis, team1BestWeis)) {
        team1BestWeis = weis;
      }
    }
  }
  
  for (const player of team2Players) {
    details[player.id] = player.weis || [];
    for (const weis of player.weis || []) {
      if (!team2BestWeis || isWeisBetter(weis, team2BestWeis)) {
        team2BestWeis = weis;
      }
    }
  }
  
  // Determine winning team and award all their Weis points
  let team1Points = 0;
  let team2Points = 0;
  
  if (team1BestWeis && team2BestWeis) {
    if (isWeisBetter(team1BestWeis, team2BestWeis)) {
      // Team 1 wins, gets all their Weis points
      team1Points = team1Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
    } else if (isWeisBetter(team2BestWeis, team1BestWeis)) {
      // Team 2 wins, gets all their Weis points
      team2Points = team2Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
    }
    // If equal, nobody scores Weis points
  } else if (team1BestWeis) {
    team1Points = team1Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
  } else if (team2BestWeis) {
    team2Points = team2Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
  }
  
  return { team1: team1Points, team2: team2Points, details };
}

// Compare two Weis to determine which is better
export function isWeisBetter(a: WeisDeclaration, b: WeisDeclaration): boolean {
  // Higher points wins
  if (a.points !== b.points) return a.points > b.points;
  
  // Same points - check by type priority and length
  if (a.type.startsWith('sequence') && b.type.startsWith('sequence')) {
    // Longer sequence wins
    if (a.cards.length !== b.cards.length) return a.cards.length > b.cards.length;
    // Same length - higher top card wins
    const aTop = Math.max(...a.cards.map(c => rankToNumber(c.rank)));
    const bTop = Math.max(...b.cards.map(c => rankToNumber(c.rank)));
    return aTop > bTop;
  }
  
  // For equal Weis, consider trump suit sequences higher
  return false; // Equal
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
  
  // Add 5 points bonus for winning the last trick (when all hands are empty)
  const isLastTrick = st.players.every(p => p.hand.length === 0);
  if (isLastTrick) {
    trickPoints += 5;
  }
  const winnerTeam = st.players.find(p=>p.id===winnerPlayer)!.team;
  if (winnerTeam === 1) st.scores.team1 += trickPoints; else st.scores.team2 += trickPoints;
  
  // Weis points are tracked separately and applied elsewhere; do not add them here
  
  st.currentTrick = [];
  st.trickLead = null;
  st.currentPlayer = winnerPlayer;
  st.pendingResolve = false;
  
  // if all hands empty, finish: perform final settlement (Weis, multiplier, match bonus) and distribute scores
  if (st.players.every(p => p.hand.length === 0)) {
    const settled = settleHand(st);
    st.scores = settled.scores;
    st.trumpMultiplier = settled.trumpMultiplier;
    st.matchBonus = settled.matchBonus;
    st.phase = 'finished';

    // Distribute team scores to individual players for rankings
    const team1Players = st.players.filter(p => p.team === 1);
    const team2Players = st.players.filter(p => p.team === 2);
    const team1Score = st.scores.team1;
    const team2Score = st.scores.team2;
    team1Players.forEach(p => p.points = team1Score);
    team2Players.forEach(p => p.points = team2Score);
  } else {
    st.phase = 'playing';
  }
  return st;
}

// Apply Weis points, contract multiplier and match bonus in one settlement step
export function settleHand(state: State): State {
  const st = JSON.parse(JSON.stringify(state)) as State;
  const multiplier = st.trumpMultiplier || 1;

  // Weis resolution (which team wins the Weis and their total Weis points)
  const weisScore = calculateTeamWeis(st.players);

  // Raw trick scores (should sum to 157 including last-trick bonus)
  const rawTeam1 = st.scores.team1 || 0;
  const rawTeam2 = st.scores.team2 || 0;

  // Add Weis points to the raw totals
  let t1 = rawTeam1 + (weisScore.team1 || 0);
  let t2 = rawTeam2 + (weisScore.team2 || 0);

  // Debug logging to diagnose scoring mismatches
  try {
    console.log('settleHand debug: rawTeam1=', rawTeam1, 'rawTeam2=', rawTeam2, 'weisTeam1=', weisScore.team1, 'weisTeam2=', weisScore.team2, 'multiplier=', multiplier, 'declarer=', st.declarer);
    console.log('  after weis: t1=', t1, 't2=', t2);
  } catch (e) {
    // ignore console errors in environments without console
  }

  // Apply contract multiplier only to the declarer's team (authentic Schieber semantics)
  t1 = t1 * multiplier;
  t2 = t2 * multiplier;

  try {
    console.log('  after multiplier: t1=', t1, 't2=', t2);
  } catch (e) {}

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

  try {
    console.log('  after match bonus: t1=', t1, 't2=', t2);
  } catch (e) {}

  st.scores.team1 = t1;
  st.scores.team2 = t2;
  return st;
}

// Enhanced bot choice: strategic Swiss Jass AI
export function chooseBotCard(state: State, botId: number): string | null {
  const legal = getLegalCardsForPlayer(state, botId);
  if (legal.length === 0) {
    const fallback = state.players.find(p => p.id === botId)?.hand?.[0];
    return fallback ? fallback.id : null;
  }
  
  const bot = state.players.find(p => p.id === botId)!;
  const trumpSuit = state.trump;
  const trick = state.currentTrick;
  const isFirstCard = trick.length === 0;
  const isLastCard = trick.length === 3;
  const leadSuit = state.trickLead;
  
  // Strategy 1: If leading, play strong trump or high non-trump
  if (isFirstCard) {
    // Look for strong trump cards (U, O, K, A in trump)
    const trumpCards = legal.filter(c => c.suit === trumpSuit);
    if (trumpCards.length > 0) {
      // Prefer to lead with non-wasting strong trump but avoid U unless safe
      const strongTrump = trumpCards.filter(c => ['O', 'K', 'A'].includes(c.rank));
      if (strongTrump.length > 0) {
        return strongTrump[Math.floor(Math.random() * strongTrump.length)].id;
      }
      // If only U is strong and we have many trumps, consider holding it
      if (trumpCards.some(c => c.rank === 'U') && trumpCards.length <= 2) {
        return trumpCards.find(c=>c.rank==='U')!.id;
      }
    }
    
    // Otherwise play high non-trump
    const nonTrump = legal.filter(c => c.suit !== trumpSuit);
    if (nonTrump.length > 0) {
      const highCards = nonTrump.filter(c => ['A', 'K', 'O'].includes(c.rank));
      if (highCards.length > 0) {
        return highCards[Math.floor(Math.random() * highCards.length)].id;
      }
    }
  }
  
  // Strategy 2: If last to play, try to win or play low
  if (isLastCard) {
  const canWin = canBotWinTrick(legal, trick, trumpSuit, leadSuit);
    if (canWin.length > 0) {
      // Win with the winning card that spends the fewest points (lowest point value)
      const best = canWin.slice().sort((x,y)=> {
        const vx = (x.suit === trumpSuit ? trumpOverride[x.rank] : basePoints[x.rank]);
        const vy = (y.suit === trumpSuit ? trumpOverride[y.rank] : basePoints[y.rank]);
        if (vx !== vy) return vx - vy; // lower point cost preferred
        return compareCardValue(x,y,trumpSuit,leadSuit);
      })[0];
      return best.id;
    } else {
      // Can't win, play lowest card
      const lowest = legal.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0];
      return lowest.id;
    }
  }
  
  // Strategy 3: Middle positions - cooperative play
  const partner = state.players.find(p => p.team === bot.team && p.id !== bot.id);
  const currentWinner = getCurrentTrickWinner(trick, trumpSuit, leadSuit);
  const isPartnerWinning = partner && currentWinner?.playerId === partner.id;
  
  if (isPartnerWinning) {
    // Partner is winning, play low to save good cards
    // Prefer to avoid playing high trump if partner is winning
    const nonTrump = legal.filter(c => c.suit !== trumpSuit);
    if (nonTrump.length > 0) return nonTrump.sort((a,b)=>compareCardValue(a,b, trumpSuit, leadSuit))[0].id;
    const lowest = legal.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0];
    return lowest.id;
  } else {
    // Try to win the trick
    const canWin = canBotWinTrick(legal, trick, trumpSuit, leadSuit);
    if (canWin.length > 0) {
      // avoid using U (Jack) to win unless necessary
      const nonUBest = canWin.filter(c => c.rank !== 'U');
      if (nonUBest.length > 0) return nonUBest.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0].id;
      return canWin.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0].id;
    }
  }
  
  // Fallback: play a reasonable card
  const pick = legal[Math.floor(Math.random() * legal.length)];
  return pick.id;
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
function getCurrentTrickWinner(trick: (Card & { playerId: number })[], trumpContract: TrumpContract | 'schieben' | null | undefined, leadSuit: Suit | null | undefined): (Card & { playerId: number }) | null {
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
  const aPts = aIsTrump ? trumpOverride[a.rank] : basePoints[a.rank];
  const bPts = bIsTrump ? trumpOverride[b.rank] : basePoints[b.rank];
  if (aPts !== bPts) return aPts - bPts;

  // Tie-breaker: use rank order index (lower index is stronger) so we want weaker first for ascending order
  const ai = rankOrderIndex(a.rank, trumpContract as any, aIsTrump);
  const bi = rankOrderIndex(b.rank, trumpContract as any, bIsTrump);
  return ai - bi;
}

// Helper: Check if card A beats card B in the current context
function isCardBetter(a: Card, b: Card, trumpContract: TrumpContract | 'schieben' | null | undefined, leadSuit: Suit | null | undefined): boolean {
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
