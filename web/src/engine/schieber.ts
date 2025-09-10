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

export type WeisType = 'sequence3' | 'sequence4' | 'sequence5plus' | 'four_jacks' | 'four_nines' | 'four_aces' | 'four_kings' | 'four_queens' | 'four_tens' | 'stoeck';

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
  // Swiss Jass authentic features
  trumpMultiplier?: number; // 1x, 2x (Schellen/Schilten), 3x (Oben-abe), 4x (Unden-ufe)
  matchBonus?: number; // 100 for taking all 9 tricks
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
  // Trump selector is the player to the left of dealer (dealer + 1)
  const trumpSelector = (dealer + 1) % 4;
  const st: State = { 
    phase: 'trump_selection', 
    trump: null, 
    currentPlayer: trumpSelector, 
    dealer,
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
  // Trump selector is the player to the left of dealer
  const trumpSelector = (dealer + 1) % 4;
  const st: State = { 
    phase: 'trump_selection', 
    trump: null, 
    currentPlayer: trumpSelector, 
    dealer,
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

// Set trump and detect all Weis
export function setTrumpAndDetectWeis(state: State, trump: TrumpContract): State {
  const st = JSON.parse(JSON.stringify(state)) as State;
  st.trump = trump;
  
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
  
  // Detect Weis for all players now that trump is known
  st.weis = {};
  for (const player of st.players) {
    // For no-trump contracts, pass null to detectWeis
    const trumpSuit = (trump === 'oben-abe' || trump === 'unden-ufe') ? null : trump;
    player.weis = detectWeis(player.hand, trumpSuit);
    st.weis[player.id] = player.weis;
  }
  
  st.phase = 'playing';
  return st;
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
    
    // Distribute team scores to individual players for rankings
    const team1Players = st.players.filter(p => p.team === 1);
    const team2Players = st.players.filter(p => p.team === 2);
    const team1Score = st.scores.team1;
    const team2Score = st.scores.team2;
    
    // Each player gets their team's total score (for individual rankings)
    team1Players.forEach(p => p.points = team1Score);
    team2Players.forEach(p => p.points = team2Score);
  } else {
    st.phase = 'playing';
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
      // Find consecutive sequences
      const sequences = findSequences(cards);
      for (const seq of sequences) {
        if (seq.length >= 5) {
          weis.push({
            type: 'sequence5plus',
            cards: seq,
            points: 100,
            description: `Sequenz ${seq.length} (${seq[0].rank}-${seq[seq.length-1].rank} ${suit})`
          });
        } else if (seq.length === 4) {
          weis.push({
            type: 'sequence4',
            cards: seq,
            points: 50,
            description: `Sequenz 4 (${seq[0].rank}-${seq[seq.length-1].rank} ${suit})`
          });
        } else if (seq.length === 3) {
          weis.push({
            type: 'sequence3',
            cards: seq,
            points: 20,
            description: `Sequenz 3 (${seq[0].rank}-${seq[seq.length-1].rank} ${suit})`
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
      if (rank === 'U') {
        weis.push({
          type: 'four_jacks',
          cards: byRank[rank],
          points: 200,
          description: 'Vier Buben'
        });
      } else if (rank === '9') {
        weis.push({
          type: 'four_nines',
          cards: byRank[rank],
          points: 150,
          description: 'Vier Neuner'
        });
      } else if (rank === 'A') {
        weis.push({
          type: 'four_aces',
          cards: byRank[rank],
          points: 100,
          description: 'Vier Asse'
        });
      } else if (rank === 'K') {
        weis.push({
          type: 'four_kings',
          cards: byRank[rank],
          points: 100,
          description: 'Vier Könige'
        });
      } else if (rank === 'O') {
        weis.push({
          type: 'four_queens',
          cards: byRank[rank],
          points: 100,
          description: 'Vier Damen'
        });
      } else if (rank === '10') {
        weis.push({
          type: 'four_tens',
          cards: byRank[rank],
          points: 100,
          description: 'Vier Zehner'
        });
      }
    }
  }
  
  // Check for Stöck (King and Queen of trump)
  if (trump && byRank['K'] && byRank['O']) {
    const trumpKing = byRank['K'].find(c => c.suit === trump);
    const trumpQueen = byRank['O'].find(c => c.suit === trump);
    if (trumpKing && trumpQueen) {
      weis.push({
        type: 'stoeck',
        cards: [trumpKing, trumpQueen],
        points: 20,
        description: `Stöck (${trump})`
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
function isWeisBetter(a: WeisDeclaration, b: WeisDeclaration): boolean {
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
  
  // Add Weis points if this is the last trick
  if (isLastTrick) {
    const weisScore = calculateTeamWeis(st.players);
    st.scores.team1 += weisScore.team1;
    st.scores.team2 += weisScore.team2;
  }
  
  st.currentTrick = [];
  st.trickLead = null;
  st.currentPlayer = winnerPlayer;
  st.pendingResolve = false;
  
  // if all hands empty, finish and distribute scores to individual players
  if (st.players.every(p => p.hand.length === 0)) {
    st.phase = 'finished';
    
    // Distribute team scores to individual players for rankings
    const team1Players = st.players.filter(p => p.team === 1);
    const team2Players = st.players.filter(p => p.team === 2);
    const team1Score = st.scores.team1;
    const team2Score = st.scores.team2;
    
    // Each player gets their team's total score (for individual rankings)
    team1Players.forEach(p => p.points = team1Score);
    team2Players.forEach(p => p.points = team2Score);
  } else {
    st.phase = 'playing';
  }
  return st;
}

// Enhanced bot choice: strategic Swiss Jass AI
export function chooseBotCard(state: State, botId: number): string | null {
  const legal = getLegalCardsForPlayer(state, botId);
  if (legal.length === 0) return null;
  
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
      const strongTrump = trumpCards.filter(c => ['U', 'O', 'K', 'A'].includes(c.rank));
      if (strongTrump.length > 0) {
        return strongTrump[Math.floor(Math.random() * strongTrump.length)].id;
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
      // Win with lowest possible card
      return canWin.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0].id;
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
    const lowest = legal.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0];
    return lowest.id;
  } else {
    // Try to win the trick
    const canWin = canBotWinTrick(legal, trick, trumpSuit, leadSuit);
    if (canWin.length > 0) {
      return canWin.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0].id;
    }
  }
  
  // Fallback: play a reasonable card
  const pick = legal[Math.floor(Math.random() * legal.length)];
  return pick.id;
}

// Helper: Check which cards can win the current trick
function canBotWinTrick(legal: Card[], trick: (Card & { playerId: number })[], trump: string | null | undefined, leadSuit: Suit | null | undefined): Card[] {
  if (trick.length === 0) return legal; // First card always "wins" initially
  
  let currentBest = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (isCardBetter(trick[i], currentBest, trump, leadSuit)) {
      currentBest = trick[i];
    }
  }
  
  return legal.filter(card => isCardBetter(card, currentBest, trump, leadSuit));
}

// Helper: Get current trick winner
function getCurrentTrickWinner(trick: (Card & { playerId: number })[], trump: string | null | undefined, leadSuit: Suit | null | undefined): (Card & { playerId: number }) | null {
  if (trick.length === 0) return null;
  
  let winner = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (isCardBetter(trick[i], winner, trump, leadSuit)) {
      winner = trick[i];
    }
  }
  return winner;
}

// Helper: Compare card values for sorting (low to high)
function compareCardValue(a: Card, b: Card, trump: string | null | undefined, leadSuit: Suit | null | undefined): number {
  const aIsTrump = a.suit === trump;
  const bIsTrump = b.suit === trump;
  
  if (aIsTrump && !bIsTrump) return 1; // Trump is higher
  if (!aIsTrump && bIsTrump) return -1;
  
  if (aIsTrump && bIsTrump) {
    const trumpOrder = ['6', '7', '8', '9', '10', 'K', 'A', 'O', 'U'];
    return trumpOrder.indexOf(a.rank) - trumpOrder.indexOf(b.rank);
  }
  
  const normalOrder = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
  return normalOrder.indexOf(a.rank) - normalOrder.indexOf(b.rank);
}

// Helper: Check if card A beats card B in the current context
function isCardBetter(a: Card, b: Card, trump: string | null | undefined, leadSuit: Suit | null | undefined): boolean {
  const aIsTrump = a.suit === trump;
  const bIsTrump = b.suit === trump;
  
  // Trump always beats non-trump
  if (aIsTrump && !bIsTrump) return true;
  if (!aIsTrump && bIsTrump) return false;
  
  // Both trump: compare trump values
  if (aIsTrump && bIsTrump) {
    const trumpOrder = ['6', '7', '8', '9', '10', 'K', 'A', 'O', 'U'];
    return trumpOrder.indexOf(a.rank) > trumpOrder.indexOf(b.rank);
  }
  
  // Both non-trump: must follow suit if possible
  const aFollows = a.suit === leadSuit;
  const bFollows = b.suit === leadSuit;
  
  if (aFollows && !bFollows) return true;
  if (!aFollows && bFollows) return false;
  
  // Both follow suit or both don't: compare normal values
  const normalOrder = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
  return normalOrder.indexOf(a.rank) > normalOrder.indexOf(b.rank);
}
