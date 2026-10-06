import { Router, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../secrets';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();
const MAX_POINTS_PER_SYNC = 5000;

// Destructive routes need ADMIN_TOKEN (header x-admin-token); disabled when unset.
const requireAdmin: RequestHandler = (req, res, next) => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || req.header('x-admin-token') !== expected) {
    return res.status(403).json({ success: false, message: 'Admin token required' });
  }
  next();
};

// Totals sync needs a logged-in user's bearer token.
const requireUser: RequestHandler = (req, res, next) => {
  const m = /^Bearer (.+)$/.exec(req.header('authorization') || '');
  if (!m) return res.status(401).json({ success: false, message: 'Login required' });
  try {
    const payload = jwt.verify(m[1], JWT_SECRET) as { username?: string };
    res.locals.username = payload.username;
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  next();
};

// GET /api/admin/users - list users and their totalPoints
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        totalPoints: true,
        totalWins: true,
        totalGames: true,
      },
    });
    res.json({ success: true, users });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/admin/leaderboard - ranking by wins (primary), then games, then points
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        totalWins: true,
        totalGames: true,
        totalPoints: true,
      },
    });
    const ranked = users
      .map((u) => ({
        ...u,
        winRate: u.totalGames > 0 ? u.totalWins / u.totalGames : 0,
      }))
      .sort((a, b) => {
        if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
        if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      });
    res.json({ success: true, leaderboard: ranked });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/admin/users/:id - delete a user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'User deleted' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/admin/totals/sync - accept totals map { username: points }
router.post('/totals/sync', requireUser, async (req, res) => {
  try {
    const { totals } = req.body || {};
    if (!totals || typeof totals !== 'object')
      return res.status(400).json({ success: false, message: 'Invalid totals payload' });

    const results: any[] = [];

    for (const [username, rawPts] of Object.entries(totals)) {
      // A user may only add points to their own account, within a sane per-match range.
      if (username !== res.locals.username) {
        results.push({ username, updated: false, reason: 'not your account' });
        continue;
      }
      const pts = Number(rawPts);
      if (!Number.isFinite(pts) || pts < 0 || pts > MAX_POINTS_PER_SYNC) {
        results.push({ username, updated: false, reason: 'invalid points' });
        continue;
      }
      try {
        const user = await prisma.user.findFirst({ where: { username } });
        if (!user) {
          results.push({ username, updated: false, reason: 'user not found' });
          continue;
        }
        const newPoints = (user.totalPoints || 0) + pts;
        await prisma.user.update({ where: { id: user.id }, data: { totalPoints: newPoints } });
        // Optionally record a GameSession entry
        await prisma.gameSession.create({
          data: {
            userId: user.id,
            gameType: 'schieber',
            result: 'played',
            points: pts,
            duration: 0,
          },
        });
        results.push({ username, updated: true, newPoints });
      } catch (inner) {
        results.push({ username, updated: false, reason: (inner as any).message });
      }
    }

    res.json({ success: true, results });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
