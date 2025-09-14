import { Router } from 'express';
import { gameHub } from '../gameHub';
import { SwissSuit, TrumpContract } from '../gameEngine/SwissJassEngine';
import { AuthService } from '../services/authService';

const router = Router();

/**
 * POST /api/games/create
 * Creates a new game
 * body: { playerNames?: string[], gameType?: string }
 */
router.post('/create', (req, res) => {
  try {
    const { playerNames, gameType = 'schieber' } = req.body || {};
    const { id, engine } = gameHub.create(playerNames, gameType);
    
    // Deal cards to start the game
    engine.dealCards();
    
    const state = engine.getGameState();
    const players = engine.getPlayers();
    const humanPlayer = players.find(p => !p.isBot);
    
    res.json({ 
      success: true, 
      gameId: id, 
      state,
      players,
      hand: humanPlayer?.hand || []
    });
  } catch (e: any) {
    console.error('Error creating game:', e);
    res.status(400).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/games/report
 * Accepts a match report and updates stats for both teams using TrueSkill
 * body: { teamA: string[] (userIds), teamB: string[] (userIds), scoreA: number, scoreB: number, rounds?: number }
 */
router.post('/report', async (req, res) => {
  try {
    const { teamA, teamB, scoreA, scoreB, rounds } = req.body || {};
    if (!Array.isArray(teamA) || !Array.isArray(teamB)) return res.status(400).json({ success: false, message: 'Invalid teams' });

    const { updateStatsForMatch } = require('../services/gameService');
    await updateStatsForMatch(teamA, teamB, Number(scoreA || 0), Number(scoreB || 0), Number(rounds || 0));

    res.json({ success: true, message: 'Match report processed' });
  } catch (e: any) {
    console.error('Error processing match report:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/games/:id
 * Get game state
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const engine = gameHub.get(id);
    const state = engine.getGameState();
    const players = engine.getPlayers();
    const humanPlayer = players.find(p => !p.isBot);
    
    res.json({ 
      success: true,
      gameId: id,
      state,
      players,
      hand: humanPlayer?.hand || [],
      legalCards: state.currentPlayer === 0 ? engine.getLegalCards(0) : []
    });
  } catch (e: any) {
    res.status(404).json({ success: false, message: 'Game not found' });
  }
});

/**
 * POST /api/games/:id/trump
 * Select trump
 * body: { trump: TrumpContract, playerId: number }
 */
router.post('/:id/trump', (req, res) => {
  try {
    const { id } = req.params;
    const { trump, playerId = 0 } = req.body as { trump: TrumpContract; playerId?: number };
    const engine = gameHub.get(id);
    
    const success = engine.selectTrump(trump, playerId);
    
    if (!success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot select trump at this time' 
      });
    }
    
    const state = engine.getGameState();
    const players = engine.getPlayers();
    const humanPlayer = players.find(p => !p.isBot);
    
    // Start bot play after trump selection
    gameHub.startBotPlay(id);
    
    res.json({ 
      success: true, 
      state,
      players,
      hand: humanPlayer?.hand || []
    });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/games/:id/play
 * Play a card
 * body: { playerId: number, cardId: string }
 */
router.post('/:id/play', (req, res) => {
  try {
    const { id } = req.params;
    const { playerId = 0, cardId } = req.body;
    const engine = gameHub.get(id);
    
    const success = engine.playCard(cardId, playerId);
    
    if (!success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Illegal card play' 
      });
    }
    
    const state = engine.getGameState();
    const players = engine.getPlayers();
    const humanPlayer = players.find(p => !p.isBot);
    
    res.json({ 
      success: true, 
      state,
      players,
      hand: humanPlayer?.hand || [],
      legalCards: state.currentPlayer === 0 ? engine.getLegalCards(0) : []
    });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/games/:id/bot-action
 * Trigger bot to play (for testing)
 */
router.post('/:id/bot-action', (req, res) => {
  try {
    const { id } = req.params;
    gameHub.performBotAction(id);
    
    const engine = gameHub.get(id);
    const state = engine.getGameState();
    const players = engine.getPlayers();
    const humanPlayer = players.find(p => !p.isBot);
    
    res.json({ 
      success: true, 
      state,
      players,
      hand: humanPlayer?.hand || []
    });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/games/:id/complete
 * Handles game completion and updates user stats
 * body: { userTeamScore: number, opponentTeamScore: number, userWon: boolean, totalRounds: number }
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { userTeamScore, opponentTeamScore, userWon, totalRounds } = req.body;
    // Try to extract userId from Authorization header (JWT)
    let userId: string | null = null;
    try {
      const authHeader = (req.headers && (req.headers as any).authorization) || null;
      const token = authHeader ? String(authHeader).split(' ')[1] : null;
      if (token) {
        const decoded = AuthService.verifyToken(token) as any;
        userId = decoded?.userId || null;
      }
    } catch (e) {
      // fall through - userId stays null
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    // Import the gameService here to avoid circular dependencies
    const { updateUserStats } = require('../services/gameService');
    
    // Calculate points earned (Swiss Jass typically awards 1-3 points based on margin)
    let pointsEarned = 0;
    if (userWon) {
      const margin = userTeamScore - opponentTeamScore;
      if (margin >= 100) {
        pointsEarned = 3; // Dominant victory
      } else if (margin >= 50) {
        pointsEarned = 2; // Clear victory
      } else {
        pointsEarned = 1; // Close victory
      }
    }
    
    // Update user stats
    await updateUserStats(userId, {
      gamesPlayed: 1,
      gamesWon: userWon ? 1 : 0,
      totalPoints: pointsEarned,
      totalRounds: totalRounds || 0
    });
    
    // Clean up the game from memory
    gameHub.destroyGame(id);
    
    res.json({ 
      success: true, 
      pointsEarned,
      message: userWon ? `Congratulations! You earned ${pointsEarned} points!` : 'Better luck next time!'
    });
  } catch (e: any) {
    console.error('Error completing game:', e);
    res.status(500).json({ success: false, message: 'Failed to update stats' });
  }
});

export default router;

