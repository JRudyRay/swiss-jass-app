import { Router } from 'express';
import { TableService } from '../services/tableService';
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

// Get current game state for a table (if an active engine exists)
router.get('/:id/state', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const entry = gameHub.getByTableId(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'No active game for table' });
    }
    const { engine, gameId, tableConfig } = entry as any;
    return res.json({ success: true, tableId: id, gameId, state: engine.getGameState(), players: engine.getPlayers(), tableConfig });
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

    // Re-fetch table with user details for names/bot detection
    const fullTable = await TableService.getTable(table.id);

    // Build seat-ordered userId list (0..3)
    const ordered = ((fullTable as any)?.players || [])
      .slice()
      .sort((a: any, b: any) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
    const userIds: string[] = ordered.map((p: any) => p.userId as string);

    // Initialize game engine for this table (players in seat order)
    const { id: gameId, engine } = gameHub.create(userIds, (table as any).gameType);

    // Set target points from table configuration
    try { (engine as any).gameState.pointsToWin = (fullTable as any)?.targetPoints || (table as any)?.targetPoints || 1000; } catch {}

    // Set player display names and bot flags based on usernames
    try {
      const playersWithUsers = ordered.map((p: any) => ({ userId: p.userId, username: p.user?.username || p.userId }));
      const engPlayers = engine.getPlayers();
      playersWithUsers.forEach((pu, idx) => {
        if (!engPlayers[idx]) return;
        engPlayers[idx].name = pu.username;
        // mark bots by username convention
        (engPlayers[idx] as any).isBot = /^bot_/i.test(pu.username);
      });
    } catch {}

    // Pick a random dealer BEFORE dealing, set forehand accordingly
    const dealerIndex = Math.floor(Math.random() * Math.max(userIds.length, 1));
    const dealerUserId = userIds[dealerIndex];
  (engine as any).gameState.dealer = dealerIndex;
  // Counter-clockwise & dealer leads first trick: forehand = dealer
  (engine as any).gameState.forehand = dealerIndex;

    // Start the first round: this will deal cards and progress phases
    engine.startRound();

    // Prepare room and broadcast initial state + players consistently
    const room = `table:${table.id}`;
    const tableConfig = { team1Name: (fullTable as any)?.team1Name || (table as any)?.team1Name, team2Name: (fullTable as any)?.team2Name || (table as any)?.team2Name, targetPoints: (fullTable as any)?.targetPoints || (table as any)?.targetPoints };

  // Register mapping for late joiners
  gameHub.registerTableGame(table.id, gameId, engine, tableConfig);
    io?.to(room).emit('game:state', {
      tableId: table.id,
      state: engine.getGameState(),
      players: engine.getPlayers(),
      gameId,
      tableConfig
    });

    // Broadcast state updates on engine events (always include players)
    ['phaseChange', 'cardPlayed', 'trickCompleted', 'gameFinished', 'trumpSelected', 'roundCompleted'].forEach(evt => {
      engine.on(evt, () => {
        io?.to(room).emit('game:state', {
          tableId: table.id,
          state: engine.getGameState(),
          players: engine.getPlayers(),
          gameId,
          tableConfig
        });
      });
    });

    // Inform clients which seat/user is dealer for trump selection UI
    io?.to(room).emit('game:dealerAssigned', { tableId: table.id, gameId, dealerUserId });

    res.json({ success: true, table, gameId, dealerUserId });
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
      // Notify table that gameplay is active; ongoing engine broadcasts will keep clients in sync
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