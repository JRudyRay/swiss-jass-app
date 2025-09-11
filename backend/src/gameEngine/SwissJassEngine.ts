// Complete Swiss Jass Game Engine with Authentic Rules
export type SwissSuit = 'eicheln' | 'schellen' | 'rosen' | 'schilten';
export type SwissRank = '6' | '7' | '8' | '9' | '10' | 'U' | 'O' | 'K' | 'A';
export type TrumpContract = SwissSuit | 'obenabe' | 'undenufe' | 'slalom';
export type GamePhase = 'waiting' | 'dealing' | 'examining' | 'trump_selection' | 'playing' | 'scoring' | 'finished';

export interface SwissCard {
  id: string;
  suit: SwissSuit;
  rank: SwissRank;
  points: number;
  isTrump: boolean;
  displayName: string;
}

export interface JassPlayer {
  id: number;
  userId?: string;
  name: string;
  hand: SwissCard[];
  team: 1 | 2;
  position: 'south' | 'west' | 'north' | 'east';
  isBot: boolean;
  connected: boolean;
  weis?: WeisDeclaration[];
}

export interface GameState {
  phase: GamePhase;
  dealer: number;
  forehand: number;
  currentPlayer: number;
  trickLeader: number;
  trumpSuit: TrumpContract | null;
  contract: TrumpContract | null;
  currentTrick: (SwissCard & { playerId: number })[];
  playedTricks: (SwissCard & { playerId: number })[][];
  scores: { team1: number; team2: number };
  roundScores: { team1: number; team2: number };
  gameNumber: number;
  pointsToWin: number;
  lastTrickWinner: number | null;
  gameStartTime: Date;
  gameType: 'schieber' | 'handjass' | 'coiffeur' | 'differenzler';
  // Weis declarations mapped by player id
  weis?: Record<number, WeisDeclaration[]>;
  // who declared the contract (player id)
  declarer?: number | null;
}

// Weis declaration type for backend
export type WeisDeclaration = {
  type: string;
  cards: SwissCard[];
  points: number;
  description: string;
};

// Swiss Jass Constants with Authentic Values
export const SWISS_SUITS_INFO = {
  eicheln: { name: 'Eicheln', symbol: 'acorns', color: '#8B4513', cultural: 'Strength & endurance' },
  schellen: { name: 'Schellen', symbol: 'bells', color: '#FFD700', cultural: 'Community & tradition' },
  rosen: { name: 'Rosen', symbol: 'roses', color: '#DC143C', cultural: 'Love & passion' },
  schilten: { name: 'Schilten', symbol: 'shields', color: '#2F4F4F', cultural: 'Protection & military' }
};

export const SWISS_RANKS_INFO = {
  '6': { name: 'Sächsi', order: 0 },
  '7': { name: 'Sibni', order: 1 },
  '8': { name: 'Achti', order: 2 },
  '9': { name: 'Nüni', order: 3 },
  '10': { name: 'Zähni', order: 4 },
  'U': { name: 'Under', order: 5 },
  'O': { name: 'Ober', order: 6 },
  'K': { name: 'König', order: 7 },
  'A': { name: 'Ass', order: 8 }
};

// Authentic Swiss Jass Point System
export const JASS_POINTS = {
  trump: { 'U': 20, '9': 14, 'A': 11, 'K': 4, 'O': 3, '10': 10, '8': 0, '7': 0, '6': 0 },
  normal: { 'A': 11, '10': 10, 'K': 4, 'O': 3, 'U': 2, '9': 0, '8': 0, '7': 0, '6': 0 },
  obenabe: { 'A': 11, 'K': 4, 'O': 3, 'U': 2, '10': 10, '9': 0, '8': 8, '7': 0, '6': 0 },
  undenufe: { '6': 11, '7': 0, '8': 8, '9': 0, '10': 10, 'U': 2, 'O': 3, 'K': 4, 'A': 0 }
};

// Card hierarchy for trick-taking
export const TRUMP_HIERARCHY: SwissRank[] = ['U', '9', 'A', 'K', 'O', '10', '8', '7', '6'];
export const NORMAL_HIERARCHY: SwissRank[] = ['A', 'K', 'O', 'U', '10', '9', '8', '7', '6'];
export const OBENABE_HIERARCHY: SwissRank[] = ['A', 'K', 'O', 'U', '10', '9', '8', '7', '6'];
export const UNDENUFE_HIERARCHY: SwissRank[] = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];

export class SwissJassEngine {
  private deck: SwissCard[] = [];
  private players: JassPlayer[] = [];
  private gameState: GameState;
  private eventCallbacks: Record<string, Function[]> = {};

  constructor(gameType: 'schieber' | 'handjass' | 'coiffeur' | 'differenzler' = 'schieber') {
    this.gameState = this.initializeGameState(gameType);
    this.players = this.initializePlayers();
  }

  // Start a new round
  public startRound(): void {
    this.dealCards();
  }

  private initializeGameState(gameType: string): GameState {
    return {
      phase: 'waiting',
      dealer: 3,
      forehand: 0,
      currentPlayer: 0,
      trickLeader: 0,
      trumpSuit: null,
      contract: null,
      currentTrick: [],
      playedTricks: [],
      scores: { team1: 0, team2: 0 },
      roundScores: { team1: 0, team2: 0 },
      gameNumber: 1,
      pointsToWin: 1000,
      lastTrickWinner: null,
      gameStartTime: new Date(),
      gameType: gameType as any
    };
  }

  private initializePlayers(): JassPlayer[] {
    return [
      { id: 0, name: 'You', hand: [], team: 1, position: 'south', isBot: false, connected: true },
      { id: 1, name: 'Anna', hand: [], team: 2, position: 'west', isBot: true, connected: true },
      { id: 2, name: 'Partner', hand: [], team: 1, position: 'north', isBot: true, connected: true },
      { id: 3, name: 'Fritz', hand: [], team: 2, position: 'east', isBot: true, connected: true }
    ];
  }

  // Create authentic 36-card Swiss deck
  private createDeck(): SwissCard[] {
    const deck: SwissCard[] = [];
    
    (Object.keys(SWISS_SUITS_INFO) as SwissSuit[]).forEach(suit => {
      (Object.keys(SWISS_RANKS_INFO) as SwissRank[]).forEach(rank => {
        deck.push({
          id: `${suit}-${rank}`,
          suit,
          rank,
          points: 0,
          isTrump: false,
          displayName: `${SWISS_RANKS_INFO[rank].name} ${SWISS_SUITS_INFO[suit].name}`
        });
      });
    });

    return this.shuffleDeck(deck);
  }

  // Traditional Swiss shuffling technique
  private shuffleDeck(deck: SwissCard[]): SwissCard[] {
    const shuffled = [...deck];
    
    // Multiple shuffle passes for authenticity
    for (let pass = 0; pass < 3; pass++) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }
    
    return shuffled;
  }

  // Authentic Swiss dealing pattern: 3-2-4
  public dealCards(): void {
    this.deck = this.createDeck();
    this.gameState.phase = 'dealing';
    this.emit('phaseChange', 'dealing');

    const dealingPattern = [3, 2, 4]; // Traditional Swiss pattern
    let cardIndex = 0;

    dealingPattern.forEach(cardCount => {
      for (let round = 0; round < cardCount; round++) {
        for (let playerOffset = 0; playerOffset < 4; playerOffset++) {
          const playerId = (this.gameState.forehand + playerOffset) % 4;
          if (cardIndex < this.deck.length) {
            this.players[playerId].hand.push(this.deck[cardIndex]);
            cardIndex++;
          }
        }
      }
    });

    // Sort hands by suit and rank
    this.players.forEach(player => {
      player.hand = this.sortHand(player.hand);
    });

    setTimeout(() => {
      this.gameState.phase = 'examining';
      this.emit('phaseChange', 'examining');
      
      setTimeout(() => {
        this.gameState.phase = 'trump_selection';
        this.gameState.currentPlayer = this.gameState.forehand;
        this.emit('phaseChange', 'trump_selection');
      }, 3000);
    }, 2000);
  }

  private sortHand(hand: SwissCard[]): SwissCard[] {
    return hand.sort((a, b) => {
      const suitOrder: SwissSuit[] = ['eicheln', 'schellen', 'rosen', 'schilten'];
      const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      
      return SWISS_RANKS_INFO[a.rank].order - SWISS_RANKS_INFO[b.rank].order;
    });
  }

  public selectTrump(trump: TrumpContract, playerId: number): boolean {
    if (this.gameState.phase !== 'trump_selection' || playerId !== this.gameState.currentPlayer) {
      return false;
    }

    this.gameState.trumpSuit = trump;
    this.gameState.contract = trump;
    // record who declared the contract
    this.gameState.declarer = playerId;

    // set multiplier based on contract
    if (trump === 'schellen' || trump === 'schilten') {
      // double
      (this.gameState as any).trumpMultiplier = 2;
    } else if (trump === 'obenabe') {
      (this.gameState as any).trumpMultiplier = 3;
    } else if (trump === 'undenufe') {
      (this.gameState as any).trumpMultiplier = 4;
    } else {
      (this.gameState as any).trumpMultiplier = 1;
    }

    // detect weis for all players now that trump is known
    try {
      const realTrumpSuit = (trump === 'obenabe' || trump === 'undenufe') ? null : trump as SwissSuit;
      this.gameState.weis = {};
      for (const p of this.players) {
        // compute weis using a simple detection function (ported from client engine)
        const w = this.detectWeisForHand(p.hand, realTrumpSuit);
        p.weis = w;
        (this.gameState.weis as any)[p.id] = w;
      }
    } catch (e) {
      // ignore errors in detection, continue
    }

    this.gameState.phase = 'playing';
    this.gameState.currentPlayer = this.gameState.forehand;
    this.gameState.trickLeader = this.gameState.forehand;

    this.updateCardValues();
    this.emit('trumpSelected', { trump, playerId });
    return true;
  }

  private updateCardValues(): void {
    const trump = this.gameState.trumpSuit;
    
    this.players.forEach(player => {
      player.hand.forEach(card => {
        card.isTrump = this.isCardTrump(card, trump);
        card.points = this.calculateCardPoints(card, trump);
      });
    });
  }

  private isCardTrump(card: SwissCard, trump: TrumpContract | null): boolean {
    if (!trump || trump === 'obenabe' || trump === 'undenufe') return false;
    return card.suit === trump;
  }

  private calculateCardPoints(card: SwissCard, trump: TrumpContract | null): number {
    if (!trump) return 0;
    
    if (trump === 'obenabe') {
      return JASS_POINTS.obenabe[card.rank] || 0;
    }
    
    if (trump === 'undenufe') {
      return JASS_POINTS.undenufe[card.rank] || 0;
    }
    
    if (card.suit === trump) {
      return JASS_POINTS.trump[card.rank] || 0;
    }
    
    return JASS_POINTS.normal[card.rank] || 0;
  }

  public playCard(cardId: string, playerId: number): boolean {
    if (this.gameState.phase !== 'playing' || playerId !== this.gameState.currentPlayer) {
  console.warn(`playCard rejected: wrong phase or not player's turn (phase=${this.gameState.phase} playerId=${playerId} currentPlayer=${this.gameState.currentPlayer})`);
      return false;
    }

    const player = this.players[playerId];
    const cardIndex = player.hand.findIndex(card => card.id === cardId);
    
    if (cardIndex === -1) return false;

    const card = player.hand[cardIndex];
    
    // Validate legal play according to Swiss Jass rules
    if (!this.isLegalPlay(card, playerId)) {
      console.warn(`Illegal play attempt by player ${playerId} for card ${card.id}; hand contains ${player.hand.length} cards; currentTrick length ${this.gameState.currentTrick.length}`);
      return false;
    }

    // Play the card
    player.hand.splice(cardIndex, 1);
    this.gameState.currentTrick.push({ ...card, playerId });
    
    this.emit('cardPlayed', { card, playerId });

    // Move to next player (counter-clockwise)
    this.gameState.currentPlayer = (this.gameState.currentPlayer + 1) % 4;

    // Check if trick is complete
    if (this.gameState.currentTrick.length === 4) {
      setTimeout(() => this.completeTrick(), 1500);
    }

    return true;
  }

  private isLegalPlay(card: SwissCard, playerId: number): boolean {
    // First card of trick - any card allowed
    if (this.gameState.currentTrick.length === 0) return true;

    const leadCard = this.gameState.currentTrick[0];
    const player = this.players[playerId];

    // Must follow suit if possible (fundamental Swiss Jass rule)
    if (card.suit !== leadCard.suit) {
      const hasSuit = player.hand.some(c => c.suit === leadCard.suit);
      // If player has the lead suit, they may play any card of that suit OR a trump card.
      if (hasSuit) {
        // allowed only if card is trump or card is of the lead suit
        const trump = this.gameState.trumpSuit;
        const isTrump = trump && card.suit === trump;
        if (card.suit === leadCard.suit) return true;
        if (isTrump) return true;
        return false;
      }
    }

    return true;
  }

  private completeTrick(): void {
    const trickWinner = this.determineTrickWinner();
    const trickPoints = this.calculateTrickPoints();
    
    // Add last trick bonus if this is the final trick
    const isLastTrick = this.players.every(p => p.hand.length === 0);
    const finalBonus = isLastTrick ? 5 : 0;
    const totalTrickPoints = trickPoints + finalBonus;

    // Store completed trick
    this.gameState.playedTricks.push([...this.gameState.currentTrick]);
    this.gameState.currentTrick = [];
    this.gameState.lastTrickWinner = trickWinner;

    // Award points to winning team
    const winnerTeam = this.players[trickWinner].team;
    this.gameState.roundScores[`team${winnerTeam}`] += totalTrickPoints;

    // Winner leads next trick
    this.gameState.currentPlayer = trickWinner;
    this.gameState.trickLeader = trickWinner;

    this.emit('trickCompleted', {
      winner: trickWinner,
      points: totalTrickPoints,
      isLastTrick
    });

    // Check if round is complete
    if (isLastTrick) {
      setTimeout(() => this.completeRound(), 2000);
    }
  }

  private determineTrickWinner(): number {
    const trick = this.gameState.currentTrick;
    const leadSuit = trick[0].suit;
    const trump = this.gameState.trumpSuit;
    
    let winner = 0;

    for (let i = 1; i < trick.length; i++) {
      if (this.cardBeats(trick[i], trick[winner], leadSuit, trump)) {
        winner = i;
      }
    }

    return trick[winner].playerId;
  }

  private cardBeats(challenger: SwissCard, current: SwissCard, leadSuit: SwissSuit, trump: TrumpContract | null): boolean {
    // Handle special contracts
    if (trump === 'obenabe') {
      if (challenger.suit === leadSuit && current.suit !== leadSuit) return true;
      if (challenger.suit !== leadSuit && current.suit === leadSuit) return false;
      if (challenger.suit === leadSuit && current.suit === leadSuit) {
        return OBENABE_HIERARCHY.indexOf(challenger.rank) < OBENABE_HIERARCHY.indexOf(current.rank);
      }
      return false;
    }

    if (trump === 'undenufe') {
      if (challenger.suit === leadSuit && current.suit !== leadSuit) return true;
      if (challenger.suit !== leadSuit && current.suit === leadSuit) return false;
      if (challenger.suit === leadSuit && current.suit === leadSuit) {
        return UNDENUFE_HIERARCHY.indexOf(challenger.rank) < UNDENUFE_HIERARCHY.indexOf(current.rank);
      }
      return false;
    }

    // Normal trump suit logic
    const challengerIsTrump = challenger.suit === trump;
    const currentIsTrump = current.suit === trump;

    // Trump always beats non-trump
    if (challengerIsTrump && !currentIsTrump) return true;
    if (!challengerIsTrump && currentIsTrump) return false;

    // Both trump - compare trump hierarchy
    if (challengerIsTrump && currentIsTrump) {
      return TRUMP_HIERARCHY.indexOf(challenger.rank) < TRUMP_HIERARCHY.indexOf(current.rank);
    }

    // Neither trump - follow suit and compare normal hierarchy
    if (challenger.suit === leadSuit && current.suit !== leadSuit) return true;
    if (challenger.suit !== leadSuit && current.suit === leadSuit) return false;
    if (challenger.suit === leadSuit && current.suit === leadSuit) {
      return NORMAL_HIERARCHY.indexOf(challenger.rank) < NORMAL_HIERARCHY.indexOf(current.rank);
    }

    return false;
  }

  private calculateTrickPoints(): number {
    return this.gameState.currentTrick.reduce((sum, card) => sum + card.points, 0);
  }

  private completeRound(): void {
    this.gameState.phase = 'scoring';
    
    const team1Score = this.gameState.roundScores.team1;
    const team2Score = this.gameState.roundScores.team2;

    this.gameState.scores.team1 += team1Score;
    this.gameState.scores.team2 += team2Score;

    this.emit('roundCompleted', {
      roundScores: this.gameState.roundScores,
      totalScores: this.gameState.scores
    });

    // Check for game end
    if (this.gameState.scores.team1 >= this.gameState.pointsToWin || 
        this.gameState.scores.team2 >= this.gameState.pointsToWin) {
      this.gameState.phase = 'finished';
      this.emit('gameFinished', {
        winner: this.gameState.scores.team1 > this.gameState.scores.team2 ? 1 : 2,
        finalScores: this.gameState.scores
      });
    } else {
      setTimeout(() => this.prepareNextRound(), 3000);
    }
  }

  private prepareNextRound(): void {
    // Rotate dealer
    this.gameState.dealer = (this.gameState.dealer + 1) % 4;
    this.gameState.forehand = (this.gameState.dealer + 1) % 4;
    
    // Reset round state
    this.gameState.roundScores = { team1: 0, team2: 0 };
    this.gameState.playedTricks = [];
    this.gameState.trumpSuit = null;
    this.gameState.contract = null;
    this.gameState.gameNumber++;

    // Clear hands
    this.players.forEach(player => player.hand = []);

    setTimeout(() => this.dealCards(), 1000);
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }

  private emit(event: string, data?: any): void {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => callback(data));
    }
  }

  // Getters
  public getGameState(): Readonly<GameState> {
    return { ...this.gameState };
  }

  public getPlayers(): JassPlayer[] {
    return this.players;
  }

  public getPublicState(): any {
    return {
      phase: this.gameState.phase,
      currentPlayer: this.gameState.currentPlayer,
      trumpSuit: this.gameState.trumpSuit,
      currentTrick: this.gameState.currentTrick,
      scores: this.gameState.scores,
      roundScores: this.gameState.roundScores,
      dealer: this.gameState.dealer,
  weis: this.gameState.weis,
  declarer: this.gameState.declarer,
      gameType: this.gameState.gameType
    };
  }

  public getPlayerHand(playerId: number): SwissCard[] {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.hand : [];
  }

// === WEIS DETECTION (backend helper, simplified port of client logic) ===
private rankIndex(rank: SwissRank) {
  const order: SwissRank[] = ['6','7','8','9','10','U','O','K','A'];
  return order.indexOf(rank);
}

private findSequencesInSuit(cards: SwissCard[]) : SwissCard[][] {
  if (!cards || cards.length === 0) return [];
  const sorted = cards.slice().sort((a,b) => this.rankIndex(a.rank) - this.rankIndex(b.rank));
  const sequences: SwissCard[][] = [];
  let cur: SwissCard[] = [sorted[0]];
  for (let i=1;i<sorted.length;i++) {
    if (this.rankIndex(sorted[i].rank) === this.rankIndex(sorted[i-1].rank) + 1) {
      cur.push(sorted[i]);
    } else {
      if (cur.length >= 3) sequences.push(cur);
      cur = [sorted[i]];
    }
  }
  if (cur.length >= 3) sequences.push(cur);
  return sequences;
}

private detectWeisForHand(hand: SwissCard[], trump?: SwissSuit | null): WeisDeclaration[] {
  const res: WeisDeclaration[] = [];
  const bySuit: Record<string, SwissCard[]> = {};
  hand.forEach(c => { (bySuit[c.suit] = bySuit[c.suit] || []).push(c); });
  for (const s in bySuit) {
    const seqs = this.findSequencesInSuit(bySuit[s]);
    for (const seq of seqs) {
      if (seq.length >= 5) res.push({ type: 'sequence5plus', cards: seq, points: 100, description: `Sequenz ${seq.length} (${s})` });
      else if (seq.length === 4) res.push({ type: 'sequence4', cards: seq, points: 50, description: `Sequenz 4 (${s})` });
      else if (seq.length === 3) res.push({ type: 'sequence3', cards: seq, points: 20, description: `Sequenz 3 (${s})` });
    }
  }

  // four-of-a-kind detection
  const byRank: Record<string, SwissCard[]> = {};
  hand.forEach(c => { (byRank[c.rank] = byRank[c.rank] || []).push(c); });
  for (const r in byRank) {
    if (byRank[r].length === 4) {
      let pts = 100;
      if (r === 'U') pts = 200; else if (r === '9') pts = 150; else pts = 100;
      res.push({ type: `four_${r}`, cards: byRank[r], points: pts, description: `Vier ${r}` });
    }
  }

  // Stöck (K + O of trump)
  if (trump) {
    const k = hand.find(c => c.rank === 'K' && c.suit === trump);
    const o = hand.find(c => c.rank === 'O' && c.suit === trump);
    if (k && o) res.push({ type: 'stoeck', cards: [k,o], points: 20, description: `Stöck (${trump})` });
  }

  return res;
}

  public getPlayer(playerId: number): Readonly<JassPlayer> | null {
    return this.players.find(p => p.id === playerId) || null;
  }

  public getLegalCards(playerId: number): SwissCard[] {
    const player = this.players[playerId];
    const hand = player.hand;
    
    if (this.gameState.currentTrick.length === 0) return hand;
    
    const leadCard = this.gameState.currentTrick[0];
    const followSuit = hand.filter(card => card.suit === leadCard.suit);
    
    // If player has cards of the lead suit, allow any of those cards.
    // Also allow trump cards as an option even when the player can follow suit.
    const result: SwissCard[] = [];
    if (followSuit.length > 0) {
      result.push(...followSuit);
      const trump = this.gameState.trumpSuit;
      if (trump) {
        const trumpCards = hand.filter(c => c.suit === trump);
        for (const t of trumpCards) if (!result.find(r => r.id === t.id)) result.push(t);
      }
      return result;
    }

    return hand;
  }
}