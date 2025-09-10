// Swiss Jass Game Engine - Fixed Version
export interface SwissCard {
  id: string;
  suit: string;
  rank: string;
  points: number;
  isTrump: boolean;
}

export interface JassPlayer {
  id: number;
  name: string;
  hand: SwissCard[];
  team: number;
}

export class SwissJassEngine {
  private players: JassPlayer[] = [];
  private deck: SwissCard[] = [];
  private trumpSuit: string | null = null;
  private currentTrick: SwissCard[] = [];
  private scores = { team1: 0, team2: 0 };
  private currentPlayer = 0;

  constructor() {
    this.initializePlayers();
    this.createDeck();
  }

  private initializePlayers() {
    this.players = [
      { id: 0, name: 'You', hand: [], team: 1 },
      { id: 1, name: 'Anna', hand: [], team: 2 },
      { id: 2, name: 'Partner', hand: [], team: 1 },
      { id: 3, name: 'Fritz', hand: [], team: 2 }
    ];
  }

  private createDeck() {
    const suits = ['eicheln', 'schellen', 'rosen', 'schilten'];
    const ranks = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
    this.deck = [];
    
    suits.forEach(suit => {
      ranks.forEach(rank => {
        this.deck.push({
          id: suit + '-' + rank,
          suit: suit,
          rank: rank,
          points: this.getCardPoints(rank),
          isTrump: false
        });
      });
    });
  }

  private getCardPoints(rank: string): number {
    if (rank === 'A') return 11;
    if (rank === '10') return 10;
    if (rank === 'K') return 4;
    if (rank === 'O') return 3;
    if (rank === 'U') return 2;
    return 0;
  }

  public dealCards() {
    this.shuffleDeck();
    for (let i = 0; i < 9; i++) {
      this.players.forEach(player => {
        if (this.deck.length > 0) {
          const card = this.deck.pop();
          if (card) {
            player.hand.push(card);
          }
        }
      });
    }
  }

  private shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = this.deck[i];
      this.deck[i] = this.deck[j];
      this.deck[j] = temp;
    }
  }

  public setTrump(suit: string) {
    this.trumpSuit = suit;
    this.updateTrumpCards();
  }

  private updateTrumpCards() {
    this.players.forEach(player => {
      player.hand.forEach(card => {
        card.isTrump = card.suit === this.trumpSuit;
        if (card.isTrump) {
          if (card.rank === 'U') card.points = 20;
          if (card.rank === '9') card.points = 14;
        }
      });
    });
  }

  public getGameState() {
    return {
      players: this.players,
      trumpSuit: this.trumpSuit,
      currentTrick: this.currentTrick,
      scores: this.scores,
      currentPlayer: this.currentPlayer
    };
  }

  public playCard(playerId: number, cardId: string) {
    const player = this.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = player.hand.splice(cardIndex, 1)[0];
    this.currentTrick.push(card);
    this.currentPlayer = (this.currentPlayer + 1) % 4;
    return true;
  }
}