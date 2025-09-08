import { Router } from 'express';

const router = Router();

// Simple middleware
const simpleAuth = (req: any, res: any, next: any) => {
  req.user = { userId: 'demo-user-123', username: 'demo-user' };
  next();
};

// Create new game
router.post('/create', simpleAuth, async (req: any, res) => {
  try {
    const gameId = 'game-' + Math.random().toString(36).substr(2, 9);
    res.status(201).json({
      success: true,
      game: {
        gameId,
        gameType: req.body.gameType || 'schieber',
        status: 'waiting',
        pointsToWin: req.body.pointsToWin || 1000
      }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Join game
router.post('/:gameId/join', simpleAuth, async (req: any, res) => {
  try {
    res.json({
      success: true,
      gameId: req.params.gameId,
      position: Math.floor(Math.random() * 4),
      team: Math.random() > 0.5 ? 1 : 2,
      canStart: true
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get game state
router.get('/:gameId', simpleAuth, async (req: any, res) => {
  try {
    res.json({
      success: true,
      gameState: {
        gameId: req.params.gameId,
        phase: 'waiting',
        players: [
          { id: 0, name: 'You', team: 1, hand: [] },
          { id: 1, name: 'Anna', team: 2, hand: [] },
          { id: 2, name: 'Partner', team: 1, hand: [] },
          { id: 3, name: 'Fritz', team: 2, hand: [] }
        ],
        scores: { team1: 0, team2: 0 },
        trumpSuit: null
      }
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

// Play a card
router.post('/:gameId/play', simpleAuth, async (req: any, res) => {
  try {
    res.json({
      success: true,
      message: 'Card played',
      cardId: req.body.cardId
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Select trump
router.post('/:gameId/trump', simpleAuth, async (req: any, res) => {
  try {
    res.json({
      success: true,
      trumpSuit: req.body.trumpSuit,
      message: 'Trump selected'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get user history
router.get('/user/history', simpleAuth, async (req: any, res) => {
  try {
    res.json({
      success: true,
      games: [
        { id: 'game1', status: 'finished', result: 'won' },
        { id: 'game2', status: 'finished', result: 'lost' }
      ]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;