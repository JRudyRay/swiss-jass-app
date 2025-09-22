import { Router } from 'express';
import { TableService } from '../services/tableService';
import { multiGameManager } from '../gameEngine/multiGameManager';
import { gameHub } from '../gameHub';
import { AuthService } from '../services/authService';

const router = Router();

// Auth middleware (duplicate simple variant)
const authenticate = (req: any, res: any, next: any) => {
  try {
    const header = req.headers.authorization;
    const token = header && header.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token required' });
    req.user = AuthService.verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Create table
router.post('/', authenticate, async (req: any, res) => {
  try {
    const table = await TableService.createTable(req.user.userId, req.body || {});
    const io = req.app.get('io');
    io?.emit('tables:updated');
    res.status(201).json({ success: true, table });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// List open tables
router.get('/', authenticate, async (req: any, res) => {
  try {
    const tables = await TableService.listOpenTables();
    res.json({ success: true, tables });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Get single table
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const table = await TableService.getTable(req.params.id);
    if (!table) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, table });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Join table
router.post('/:id/join', authenticate, async (req: any, res) => {
  try {
    const table = await TableService.joinTable(req.params.id, req.user.userId, req.body?.password);
    const io = req.app.get('io');
    io?.emit('tables:updated');
    res.json({ success: true, table });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// Start table and initialize game engine
router.post('/:id/start', authenticate, async (req: any, res: any) => {
  try {
    // Start table in DB (status update, seat assignment, bot fill)
    const table = await TableService.startTable(req.params.id, req.user.userId);
    const io = req.app.get('io');
    io?.emit('tables:updated');
    io?.emit('table:starting', { tableId: table.id, table });

    // Initialize game engine for this table
    const userIds = (table.players || []).map(p => p.userId as string);
    const { id: gameId, engine } = gameHub.create(userIds, table.gameType);
    // Broadcast state updates on engine events
    const room = `table:${table.id}`;
    ['phaseChange', 'cardPlayed', 'trickCompleted', 'gameFinished'].forEach(evt => {
      engine.on(evt, () => {
        io?.to(room).emit('game:state', { tableId: table.id, state: engine.getGameState() });
      });
    });
    // Randomly pick dealer among players
    const dealerIndex = Math.floor(Math.random() * userIds.length);
    const dealerUserId = userIds[dealerIndex];
    // Set dealer and forehand in engine state
    (engine as any).gameState.dealer = dealerIndex;
    (engine as any).gameState.forehand = (dealerIndex + 1) % userIds.length;
    // Broadcast dealer assignment to table room
    io?.to(`table:${table.id}`).emit('game:dealerAssigned', { tableId: table.id, gameId, dealerUserId });

    res.json({ success: true, table, gameId, dealerUserId });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});
// Start table
router.post('/:id/start', authenticate, async (req: any, res) => {
  try {
    const table = await TableService.startTable(req.params.id, req.user.userId);
    const io = req.app.get('io');
  io?.emit('tables:updated');
    io?.emit('table:starting', { tableId: table?.id, table });
    res.json({ success: true, table });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// Player ready
router.post('/:id/ready', authenticate, async (req: any, res) => {
  try {
    const table = await TableService.setPlayerReady(req.params.id, req.user.userId);
    const io = req.app.get('io');
    io?.emit('tables:updated');
    if ((table as any)?.status === 'IN_PROGRESS') {
      // Build initial game state
      const seats = (table as any).players.map((p: any) => ({ userId: p.userId, seatIndex: p.seatIndex ?? 0 }));
      const state = multiGameManager.startGame(table.id, (table as any).gameType || 'schieber', seats);
      io?.to(`table:${table.id}`).emit('game:state', { tableId: table.id, state });
      io?.emit('table:started', { tableId: table?.id, table });
    }
    res.json({ success: true, table });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// Cancel table
router.post('/:id/cancel', authenticate, async (req: any, res) => {
  try {
    const table = await TableService.cancelTable(req.params.id, req.user.userId);
    const io = req.app.get('io');
    io?.emit('tables:updated');
    res.json({ success: true, table });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

export default router;