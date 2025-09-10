import { PrismaClient } from '@prisma/client';
import { SwissJassEngine, GameState, JassPlayer } from '../gameEngine/SwissJassEngine';

const prisma = new PrismaClient();

export interface CreateGameData {
  gameType: 'schieber' | 'handjass' | 'coiffeur' | 'differenzler';
  pointsToWin: number;
  isPrivate: boolean;
  maxPlayers: number;
}

export interface JoinGameData {
  userId: string;
  position?: number;
}

export class GameService {
  private static activeGames = new Map<string, SwissJassEngine>();

  static async createGame(hostUserId: string, gameData: CreateGameData) {
    // Create game in database
    const game = await prisma.game.create({
      data: {
        gameType: gameData.gameType,
        pointsToWin: gameData.pointsToWin,
        status: 'waiting'
      }
    });

    // Add host as first participant
    await prisma.gameParticipation.create({
      data: {
        gameId: game.id,
        userId: hostUserId,
        position: 0,
        team: 1,
        isBot: false
      }
    });

    // Create game engine instance
    const gameEngine = new SwissJassEngine(gameData.gameType);
    this.activeGames.set(game.id, gameEngine);

    return {
      gameId: game.id,
      gameType: game.gameType,
      status: game.status,
      pointsToWin: game.pointsToWin
    };
  }

  static async joinGame(gameId: string, joinData: JoinGameData) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        participants: true
      }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'waiting') {
      throw new Error('Game is not accepting new players');
    }

    // Find available position
    const occupiedPositions = game.participants.map(p => p.position);
    const availablePosition = [0, 1, 2, 3].find(pos => !occupiedPositions.includes(pos));

    if (availablePosition === undefined) {
      throw new Error('Game is full');
    }

    // Determine team (positions 0,2 = team 1, positions 1,3 = team 2)
    const team = availablePosition % 2 === 0 ? 1 : 2;

    // Add participant
    await prisma.gameParticipation.create({
      data: {
        gameId,
        userId: joinData.userId,
        position: availablePosition,
        team,
        isBot: false
      }
    });

    // Check if game is full (4 players) and can start
    const updatedGame = await prisma.game.findUnique({
      where: { id: gameId },
      include: { participants: true }
    });

    if (updatedGame?.participants.length === 4) {
      await this.startGame(gameId);
    }

    return {
      gameId,
      position: availablePosition,
      team,
      canStart: updatedGame?.participants.length === 4
    };
  }

  static async startGame(gameId: string) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    if (!game) {
      throw new Error('Game not found');
    }

    // Update game status
    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'playing' }
    });

    // Get or create game engine
    let gameEngine = this.activeGames.get(gameId);
    if (!gameEngine) {
      gameEngine = new SwissJassEngine(game.gameType as any);
      this.activeGames.set(gameId, gameEngine);
    }

    // Set up players with real user data
    const players = gameEngine.getPlayers() as JassPlayer[];
    game.participants.forEach(participant => {
      const player = players[participant.position];
      player.userId = participant.userId;
      player.name = participant.user.username;
      player.isBot = participant.isBot;
    });

    // Start the game
    gameEngine.dealCards();

    return {
      gameId,
      status: 'playing',
      gameState: gameEngine.getGameState()
    };
  }

  static async playCard(gameId: string, userId: string, cardId: string) {
    const gameEngine = this.activeGames.get(gameId);
    if (!gameEngine) {
      throw new Error('Game not found or not active');
    }

    // Find player position
    const participation = await prisma.gameParticipation.findFirst({
      where: {
        gameId,
        userId
      }
    });

    if (!participation) {
      throw new Error('Player not in this game');
    }

    // Record move in database
    await prisma.gameMove.create({
      data: {
        gameId,
        playerId: participation.position,
        moveType: 'play_card',
        cardId,
        data: JSON.stringify({ cardId })
      }
    });

    // Play the card
    const success = gameEngine.playCard(cardId, participation.position);
    
    if (!success) {
      throw new Error('Invalid card play');
    }

    const gameState = gameEngine.getGameState();

    // Check if game is finished
    if (gameState.phase === 'finished') {
      await this.finishGame(gameId, gameState);
    }

    return {
      success: true,
      gameState
    };
  }

  static async selectTrump(gameId: string, userId: string, trumpSuit: string) {
    const gameEngine = this.activeGames.get(gameId);
    if (!gameEngine) {
      throw new Error('Game not found');
    }

    const participation = await prisma.gameParticipation.findFirst({
      where: { gameId, userId }
    });

    if (!participation) {
      throw new Error('Player not in this game');
    }

    // Record trump selection
    await prisma.gameMove.create({
      data: {
        gameId,
        playerId: participation.position,
        moveType: 'trump_select',
        data: JSON.stringify({ trumpSuit })
      }
    });

    const success = gameEngine.selectTrump(trumpSuit as any, participation.position);
    
    return {
      success,
      gameState: gameEngine.getGameState()
    };
  }

  static async getGameState(gameId: string, userId?: string) {
    const gameEngine = this.activeGames.get(gameId);
    if (!gameEngine) {
      // Try to load from database
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          participants: {
            include: { user: true }
          }
        }
      });

      if (!game) {
        throw new Error('Game not found');
      }

      return {
        gameId,
        status: game.status,
        gameType: game.gameType,
        participants: game.participants.map(p => ({
          position: p.position,
          team: p.team,
          username: p.user.username,
          isBot: p.isBot
        }))
      };
    }

    const gameState = gameEngine.getGameState();
    const players = gameEngine.getPlayers();

    // If user is specified, only show their hand
    if (userId) {
      const participation = await prisma.gameParticipation.findFirst({
        where: { gameId, userId }
      });

      if (participation) {
        const playerHand = players[participation.position].hand;
        return {
          ...gameState,
          playerHand,
          playerPosition: participation.position,
          legalCards: gameEngine.getLegalCards(participation.position)
        };
      }
    }

    return gameState;
  }

  static async finishGame(gameId: string, finalGameState: GameState) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        participants: {
          include: { user: true }
        }
      }
    });

    if (!game) return;

    // Update game status
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'finished',
        finishedAt: new Date(),
        team1Score: finalGameState.scores.team1,
        team2Score: finalGameState.scores.team2
      }
    });

    // Update player statistics
    const winningTeam = finalGameState.scores.team1 > finalGameState.scores.team2 ? 1 : 2;
    
    for (const participant of game.participants) {
      if (!participant.isBot) {
        const won = participant.team === winningTeam;
        const points = participant.team === 1 ? 
          finalGameState.scores.team1 : finalGameState.scores.team2;

        // Calculate average opponent ELO
        const opponents = game.participants.filter(p => 
          p.team !== participant.team && !p.isBot
        );
        const avgOpponentElo = opponents.length > 0 ? 
          opponents.reduce((sum, p) => sum + p.user.eloRating, 0) / opponents.length : 1200;

        await prisma.user.update({
          where: { id: participant.userId },
          data: {
            totalGames: { increment: 1 },
            totalWins: won ? { increment: 1 } : undefined,
            totalPoints: { increment: points },
            eloRating: this.calculateNewElo(participant.user.eloRating, avgOpponentElo, won),
            currentStreak: won ? { increment: 1 } : 0,
            bestStreak: won ? 
              Math.max(participant.user.bestStreak, participant.user.currentStreak + 1) : 
              undefined
          }
        });
      }
    }

    // Remove from active games
    this.activeGames.delete(gameId);
  }

  private static calculateNewElo(playerElo: number, opponentElo: number, won: boolean): number {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    const actualScore = won ? 1 : 0;
    
    return Math.round(playerElo + K * (actualScore - expectedScore));
  }

  static getActiveGames() {
    return Array.from(this.activeGames.keys());
  }

  static async getUserGames(userId: string, limit: number = 10) {
    return await prisma.game.findMany({
      where: {
        participants: {
          some: {
            userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                username: true,
                eloRating: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }
}