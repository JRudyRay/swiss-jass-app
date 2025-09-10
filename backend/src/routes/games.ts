import { Router } from 'express';
import { gameHub } from '../gameHub';
import { SwissSuit, TrumpContract } from '../gameEngine/SwissJassEngine';

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

export default router;
