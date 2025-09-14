import { Router } from 'express';
import { FriendService } from '../services/friendService';
import { AuthService } from '../services/authService';

const router = Router();

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

// Send friend request
router.post('/request', authenticate, async (req: any, res) => {
  try {
    const fr = await FriendService.sendRequest(req.user.userId, req.body.username);
    const io = req.app.get('io');
    io?.to(fr.receiverId).emit('friends:update');
    res.status(201).json({ success: true, request: fr });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// List friend requests
router.get('/requests', authenticate, async (req: any, res) => {
  try {
    const requests = await FriendService.listRequests(req.user.userId);
    res.json({ success: true, requests });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Respond to request
router.post('/requests/:id/respond', authenticate, async (req: any, res) => {
  try {
    const updated = await FriendService.respond(req.params.id, req.user.userId, !!req.body.accept);
    const io = req.app.get('io');
    io?.emit('friends:update');
    res.json({ success: true, request: updated });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// List friends (now includes online flag)
router.get('/', authenticate, async (req: any, res) => {
  try {
    const friends = await FriendService.listFriends(req.user.userId);
    res.json({ success: true, friends });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;