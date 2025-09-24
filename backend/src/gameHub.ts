import { SwissJassEngine, TrumpContract, SwissCard } from './gameEngine/SwissJassEngine';

type GameId = string;

interface GameInstance {
  engine: SwissJassEngine;
  botInterval?: NodeJS.Timeout;
}

class GameHub {
  private games = new Map<GameId, GameInstance>();
  // Map a tableId to its active game (for late join / reconnect)
  private tableGameMap = new Map<string, { gameId: GameId; engine: SwissJassEngine; tableConfig?: any }>();

  create(playerNames?: string[], gameType?: string): { id: GameId; engine: SwissJassEngine } {
    const id = this.generateGameId();
    const engine = new SwissJassEngine(gameType as any || 'schieber');
    
    // Set player display names and link userIds if provided
    if (playerNames) {
      const players = engine.getPlayers();
      playerNames.forEach((userId, index) => {
        if (players[index]) {
          // store userId for server reporting
          (players[index] as any).userId = userId;
          // optionally use userId as display name or leave engine default
          players[index].name = players[index].name || userId;
        }
      });
    }
    
    // Set up event listeners
    this.setupEngineEvents(id, engine);
    
    this.games.set(id, { engine });
    return { id, engine };
  }

  // Associate a table with a running game so that new sockets joining the table room
  // can immediately receive the current game state.
  registerTableGame(tableId: string, gameId: string, engine: SwissJassEngine, tableConfig?: any) {
    this.tableGameMap.set(tableId, { gameId, engine, tableConfig });
  }

  getByTableId(tableId: string): { gameId: string; engine: SwissJassEngine; tableConfig?: any } | null {
    return this.tableGameMap.get(tableId) || null;
  }

  removeTableGame(tableId: string) {
    const entry = this.tableGameMap.get(tableId);
    if (entry) {
      this.tableGameMap.delete(tableId);
    }
  }

  get(id: GameId): SwissJassEngine {
    const game = this.games.get(id);
    if (!game) throw new Error('Game not found');
    return game.engine;
  }

  private generateGameId(): string {
    return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEngineEvents(gameId: string, engine: SwissJassEngine): void {
    // Listen for phase changes
    engine.on('phaseChange', (phase: string) => {
      console.log(`[${gameId}] Phase changed to: ${phase}`);
      
      // Handle bot actions for trump selection
      if (phase === 'trump_selection') {
        this.handleBotTrumpSelection(gameId);
      }
    });

    // Listen for card played events
    engine.on('cardPlayed', (data: any) => {
      console.log(`[${gameId}] Card played:`, data);
      
      // Trigger next bot action after a human plays
      const state = engine.getGameState();
      if (state.phase === 'playing') {
        const players = engine.getPlayers();
        const cur = players[state.currentPlayer];
        if (cur && cur.isBot) setTimeout(() => this.performBotAction(gameId), 1200);
      }
    });

    // Listen for trick completion
    engine.on('trickCompleted', (data: any) => {
      console.log(`[${gameId}] Trick completed:`, data);
      
      // Continue bot play after trick
      setTimeout(() => {
        const state = engine.getGameState();
        if (state.phase === 'playing') {
          const players = engine.getPlayers();
          const cur = players[state.currentPlayer];
          if (cur && cur.isBot) this.performBotAction(gameId);
        }
      }, 2000);
    });

    // Listen for game finish to update stats
    engine.on('gameFinished', async (data: any) => {
      console.log(`[${gameId}] Game finished:`, data);
      try {
        // Import updateStatsForMatch dynamically to avoid circular
        const { updateStatsForMatch } = require('./services/gameService');
        const players = engine.getPlayers();
        // Filter real users
        const teamA = players.filter(p => p.team === 1 && p.userId).map(p => p.userId!);
        const teamB = players.filter(p => p.team === 2 && p.userId).map(p => p.userId!);
        const scoreA = data.finalScores.team1;
        const scoreB = data.finalScores.team2;
        await updateStatsForMatch(teamA, teamB, scoreA, scoreB, data.rounds || 0);
        console.log(`[${gameId}] Stats updated for teams`, teamA, teamB);
      } catch (err) {
        console.error(`[${gameId}] Error updating stats:`, err);
      }
    });
  }

  private handleBotTrumpSelection(gameId: string): void {
    const engine = this.get(gameId);
    const state = engine.getGameState();
    
    // If it's a bot's turn to select trump
  const players = engine.getPlayers();
  const cur = players[state.currentPlayer];
  if (cur && cur.isBot) {
      setTimeout(() => {
        const trumpOptions: TrumpContract[] = ['eicheln', 'schellen', 'rosen', 'schilten', 'obenabe', 'undenufe'];
        const selectedTrump = trumpOptions[Math.floor(Math.random() * trumpOptions.length)];
        
        console.log(`[${gameId}] Bot ${state.currentPlayer} selecting trump: ${selectedTrump}`);
        engine.selectTrump(selectedTrump, state.currentPlayer);
        
        // Start bot play if needed
        const newState = engine.getGameState();
        if (newState.phase === 'playing' && newState.currentPlayer !== 0) {
          setTimeout(() => this.performBotAction(gameId), 1500);
        }
      }, 2000);
    }
  }

  startBotPlay(gameId: string): void {
    const engine = this.get(gameId);
    const state = engine.getGameState();
    
    // If it's a bot's turn, trigger their action
    if (state.phase === 'playing') {
      const players = engine.getPlayers();
      const cur = players[state.currentPlayer];
      if (cur && cur.isBot) setTimeout(() => this.performBotAction(gameId), 1500);
    }
  }

  performBotAction(gameId: string): void {
    try {
      const engine = this.get(gameId);
      const state = engine.getGameState();
      
      // Only perform bot action if game is in playing phase
      if (state.phase !== 'playing') return;
      
      const currentPlayerId = state.currentPlayer;
      
      // Don't play for human player
      if (currentPlayerId === 0) return;
      
      const players = engine.getPlayers();
      const currentPlayer = players[currentPlayerId];
      
      if (!currentPlayer || !currentPlayer.isBot) return;
      
      // Get legal cards for the bot
      let legalCards = engine.getLegalCards(currentPlayerId);
      if (!legalCards || legalCards.length === 0) {
        // Defensive fallback: use full hand to avoid stalling
        legalCards = engine.getPlayer(currentPlayerId)?.hand.slice() || [];
        console.warn(`[${gameId}] Bot fallback using full hand (no legal cards computed)`);
      }
      
      if (legalCards.length === 0) {
        console.log(`[${gameId}] Bot ${currentPlayerId} has no legal cards`);
        return;
      }
      
      // Try legal cards until one succeeds (defensive against transient mismatches)
      // Prefer a simple strategy but fall back to trying all legal cards.
      let played = false;
      // pick preferred card first
      const preferred = this.selectBotCard(legalCards, state);
      const tryOrder = [preferred, ...legalCards.filter(c => c.id !== preferred.id)];

      for (const cardToPlay of tryOrder) {
        try {
          console.log(`[${gameId}] Bot ${currentPlayerId} attempting to play: ${cardToPlay.id}`);
          const success = engine.playCard(cardToPlay.id, currentPlayerId);
          if (success) {
            played = true;
            console.log(`[${gameId}] Bot ${currentPlayerId} played: ${cardToPlay.id}`);
            break;
          } else {
            console.warn(`[${gameId}] Bot ${currentPlayerId} failed to play ${cardToPlay.id}`);
          }
        } catch (err) {
          console.error(`[${gameId}] Error while bot ${currentPlayerId} tried to play ${cardToPlay.id}:`, err);
        }
      }

      if (!played) {
        console.warn(`[${gameId}] Bot ${currentPlayerId} could not play any legal cards (count=${legalCards.length}). CurrentPlayer: ${state.currentPlayer}`);
        return;
      }

      // If we played successfully, schedule next bot action if needed
      const newState = engine.getGameState();
      if (newState.phase === 'playing' && newState.currentPlayer !== 0) {
        setTimeout(() => this.performBotAction(gameId), 1500);
      }
    } catch (error) {
      console.error(`Error in bot action for game ${gameId}:`, error);
    }
  }

  private selectBotCard(legalCards: SwissCard[], state: any): SwissCard {
    // Simple strategy:
    // - If leading, play a medium-value card
    // - If following, try to win if partner isn't winning
    // - Otherwise play lowest card
    
    if (state.currentTrick.length === 0) {
      // Leading - play a medium card
      const sorted = [...legalCards].sort((a, b) => a.points - b.points);
      return sorted[Math.floor(sorted.length / 2)];
    }
    
    // Following - for now just play a random legal card
    // TODO: Implement smarter bot strategy
    return legalCards[Math.floor(Math.random() * legalCards.length)];
  }

  stopBotPlay(gameId: string): void {
    const game = this.games.get(gameId);
    if (game?.botInterval) {
      clearInterval(game.botInterval);
      game.botInterval = undefined;
    }
  }

  destroyGame(gameId: string): void {
    this.stopBotPlay(gameId);
    this.games.delete(gameId);
    // Also remove any table mapping referencing this game
    for (const [tId, info] of this.tableGameMap.entries()) {
      if (info.gameId === gameId) this.tableGameMap.delete(tId);
    }
  }
}

export const gameHub = new GameHub();
