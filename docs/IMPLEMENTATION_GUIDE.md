# Swiss Jass - Complete Implementation Guide

**Priority:** Phase 1 - Rankings Fix (CRITICAL)  
**Estimated Time:** 4-6 hours  
**Status:** Ready to implement

---

## 🎯 Overview

This guide provides PR-ready diffs to fix the critical ranking issues:

1. **Database Schema** - Add `isBot`, `isMultiplayer`, `gameMode` fields
2. **Bot Flagging** - Mark bot users correctly (done ✅)
3. **Stats Guards** - Only update rankings for multiplayer games with human players
4. **Event Handlers** - Pass `isMultiplayer` flag through the stack
5. **Routes** - Validate and enforce multiplayer-only stats

---

## 📦 Phase 1: Database Migration

### Step 1: Generate Prisma Migration

**Schema changes already made to `backend/prisma/schema.prisma`:**

```prisma
model User {
  // ... existing fields
  isBot     Boolean  @default(false)  // NEW
  // ... rest
}

model GameSession {
  // ... existing fields
  isMultiplayer Boolean  @default(false)  // NEW
  // ... rest
}

model GameTable {
  // ... existing fields
  gameMode    GameMode @default(MULTIPLAYER)  // NEW
  // ... rest
}

enum GameMode {
  OFFLINE       // Local/practice
  MULTIPLAYER   // Real multiplayer
}
```

**Run migration:**

```bash
cd backend
npx prisma migrate dev --name add-multiplayer-tracking
npx prisma generate
```

This will:
- Create migration files
- Add `isBot` column to `users` table
- Add `isMultiplayer` column to `game_sessions` table
- Add `gameMode` column to `game_tables` table
- Regenerate Prisma Client with new types

---

## 🔧 Phase 2: Fix gameService.ts

**File:** `backend/src/services/gameService.ts`

The file currently has partial edits. Here's the complete corrected version:

<details>
<summary>Click to see full gameService.ts</summary>

```typescript
// Minimal auth-only game service for Railway deployment
import { PrismaClient } from '@prisma/client';
// Import TrueSkill dynamically to avoid TS typing issues
const trueskillAny: any = require('ts-trueskill');
const TrueSkillClass = trueskillAny.TrueSkill || trueskillAny.default?.TrueSkill || trueskillAny;
const RatingClass = trueskillAny.Rating || trueskillAny.default?.Rating || TrueSkillClass?.Rating || trueskillAny;

const prisma = new PrismaClient();

// ✅ Helper: Filter out bot players from team arrays
async function filterRealPlayers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  
  const realUsers = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      isBot: false  // Only real players
    },
    select: { id: true }
  });
  
  return realUsers.map(u => u.id);
}

export class GameService {
  // Simple user stats update - kept for compatibility
  static async updateUserStats(userId: string, won: boolean, points: number) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalGames: { increment: 1 },
          totalWins: won ? { increment: 1 } : undefined,
          totalPoints: { increment: points },
        }
      });
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  // Simple game session logging
  static async logGameSession(userId: string, result: string, points: number, isMultiplayer: boolean = false) {
    try {
      await prisma.gameSession.create({
        data: {
          userId,
          gameType: 'schieber',
          result,
          points,
          duration: 30, // default duration
          isMultiplayer  // NEW: Track game mode
        }
      });
    } catch (error) {
      console.error('Error logging game session:', error);
    }
  }
}

// ✅ Update stats for a match between two teams
// Only updates stats if isMultiplayer=true and excludes bot players
export async function updateStatsForMatch(
  teamA: string[], 
  teamB: string[], 
  scoreA: number, 
  scoreB: number, 
  rounds = 0,
  isMultiplayer: boolean = false  // NEW PARAMETER
) {
  try {
    // ✅ GUARD #1: Skip offline games entirely
    if (!isMultiplayer) {
      console.log('⏭️  Skipping stats update for offline game');
      return false;
    }

    // ✅ GUARD #2: Filter out bot players
    const realTeamA = await filterRealPlayers(teamA);
    const realTeamB = await filterRealPlayers(teamB);

    if (realTeamA.length === 0 && realTeamB.length === 0) {
      console.log('⏭️  Skipping stats update: all players are bots');
      return false;
    }

    if (realTeamA.length === 0 || realTeamB.length === 0) {
      console.warn('⚠️  One team has no human players - partial stats update');
    }

    // Fetch current ratings (only for real players)
    const allPlayerIds = [...realTeamA, ...realTeamB];
    const users = await prisma.user.findMany({ 
      where: { 
        id: { in: allPlayerIds },
        isBot: false  // Double-check filter
      } 
    });
    const usersById: Record<string, any> = {};
    for (const u of users) usersById[u.id] = u;

    // Build TrueSkill ratings
    const env = new TrueSkillClass();
    const teamARatings = realTeamA.map(id => {
      const u = usersById[id];
      const mu = typeof u?.trueSkillMu === 'number' ? u.trueSkillMu : 25.0;
      const sigma = typeof u?.trueSkillSigma === 'number' ? u.trueSkillSigma : 8.333;
      return new RatingClass(mu, sigma);
    });
    const teamBRatings = realTeamB.map(id => {
      const u = usersById[id];
      const mu = typeof u?.trueSkillMu === 'number' ? u.trueSkillMu : 25.0;
      const sigma = typeof u?.trueSkillSigma === 'number' ? u.trueSkillSigma : 8.333;
      return new RatingClass(mu, sigma);
    });

    // Determine ranks: 0 = winner, 1 = loser
    const teamARank = scoreA > scoreB ? 0 : 1;
    const teamBRank = scoreB > scoreA ? 0 : 1;

    const [newTeamA, newTeamB] = env.rate([teamARatings, teamBRatings], [teamARank, teamBRank]);

    // Persist updates (transaction)
    await prisma.$transaction(async (prismaTx) => {
      const updates: Promise<any>[] = [];

      // Team A updates (only real players)
      for (let i = 0; i < realTeamA.length; i++) {
        const id = realTeamA[i];
        const newRating = newTeamA[i];
        const won = teamARank === 0;
        
        updates.push(prismaTx.user.update({ 
          where: { id }, 
          data: {
            totalGames: { increment: 1 },
            totalWins: won ? { increment: 1 } : undefined,
            totalPoints: { increment: Math.round((won ? 3 : 0)) },
            trueSkillMu: newRating.mu,
            trueSkillSigma: newRating.sigma
          }
        }));
        
        updates.push(prismaTx.gameSession.create({ 
          data: { 
            userId: id, 
            gameType: 'schieber', 
            result: won ? 'win' : 'loss', 
            points: Math.round((won ? 3 : 0)), 
            duration: rounds * 2,
            isMultiplayer: true  // ✅ Mark as multiplayer
          } 
        }));
      }

      // Team B updates (only real players)
      for (let i = 0; i < realTeamB.length; i++) {
        const id = realTeamB[i];
        const newRating = newTeamB[i];
        const won = teamBRank === 0;
        
        updates.push(prismaTx.user.update({ 
          where: { id }, 
          data: {
            totalGames: { increment: 1 },
            totalWins: won ? { increment: 1 } : undefined,
            totalPoints: { increment: Math.round((won ? 3 : 0)) },
            trueSkillMu: newRating.mu,
            trueSkillSigma: newRating.sigma
          }
        }));
        
        updates.push(prismaTx.gameSession.create({ 
          data: { 
            userId: id, 
            gameType: 'schieber', 
            result: won ? 'win' : 'loss', 
            points: Math.round((won ? 3 : 0)), 
            duration: rounds * 2,
            isMultiplayer: true  // ✅ Mark as multiplayer
          } 
        }));
      }

      await Promise.all(updates);
    });

    console.log(`✅ Updated stats for ${realTeamA.length + realTeamB.length} players (multiplayer game)`);
    return true;
  } catch (error) {
    console.error('Error updating match stats:', error);
    throw error;
  }
}

// Backwards-compatible function for single-user updates
export async function updateUserStats(
  userId: string, 
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalPoints: number;
    totalRounds: number;
  },
  isMultiplayer: boolean = false  // NEW PARAMETER
) {
  try {
    // ✅ GUARD: Skip offline games
    if (!isMultiplayer) {
      console.log(`⏭️  Skipping stats update for user ${userId} (offline game)`);
      return;
    }

    // ✅ GUARD: Check if user is a bot
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBot: true } });
    if (user?.isBot) {
      console.log(`⏭️  Skipping stats update for bot user ${userId}`);
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalGames: { increment: stats.gamesPlayed },
        totalWins: { increment: stats.gamesWon },
        totalPoints: { increment: stats.totalPoints },
      }
    });

    await prisma.gameSession.create({
      data: {
        userId,
        gameType: 'schieber',
        result: stats.gamesWon > 0 ? 'win' : 'loss',
        points: stats.totalPoints,
        duration: stats.totalRounds * 2,
        isMultiplayer: true  // ✅ Mark as multiplayer
      }
    });

    console.log(`✅ Updated stats for user ${userId} (multiplayer game)`);
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}
```

</details>

**Apply this change:**

Replace the entire `backend/src/services/gameService.ts` file with the corrected version above.

---

## 🎮 Phase 3: Update gameHub.ts

**File:** `backend/src/gameHub.ts`

**Current issue:** Line 118-130 calls `updateStatsForMatch` without `isMultiplayer` parameter.

**Fix:**

```typescript
// Line 37-42: When registering a table game, store isMultiplayer flag
registerTableGame(tableId: string, gameId: string, engine: SwissJassEngine, tableConfig?: any) {
  // Store full table config including gameMode
  this.tableGameMap.set(tableId, { gameId, engine, tableConfig });
}

// Line 115-135: Update gameFinished handler
engine.on('gameFinished', async (data: any) => {
  console.log(`[${gameId}] Game finished:`, data);
  try {
    // ✅ Get table config to determine if multiplayer
    const tableEntry = Array.from(this.tableGameMap.values()).find(e => e.gameId === gameId);
    const isMultiplayer = tableEntry?.tableConfig?.gameMode === 'MULTIPLAYER';

    if (!isMultiplayer) {
      console.log(`[${gameId}] Offline game - skipping stats update`);
      return;
    }

    // Import updateStatsForMatch dynamically
    const { updateStatsForMatch } = require('./services/gameService');
    const players = engine.getPlayers();
    
    // ✅ Filter to only human players (exclude bots)
    const teamA = players
      .filter(p => p.team === 1 && p.userId && !p.isBot)
      .map(p => p.userId!);
    const teamB = players
      .filter(p => p.team === 2 && p.userId && !p.isBot)
      .map(p => p.userId!);
    
    if (teamA.length === 0 && teamB.length === 0) {
      console.log(`[${gameId}] All bots - skipping stats update`);
      return;
    }

    const scoreA = data.finalScores.team1;
    const scoreB = data.finalScores.team2;
    
    // ✅ Pass isMultiplayer=true
    await updateStatsForMatch(teamA, teamB, scoreA, scoreB, data.rounds || 0, true);
    console.log(`[${gameId}] Stats updated for teams`, teamA, teamB);
  } catch (err) {
    console.error(`[${gameId}] Error updating stats:`, err);
  }
});
```

---

## 🛣️ Phase 4: Update routes/games.ts

**File:** `backend/src/routes/games.ts`

**Fix line 48-50:**

```typescript
// POST /api/games/report
router.post('/report', async (req, res) => {
  try {
    const { teamA, teamB, scoreA, scoreB, rounds, isMultiplayer } = req.body || {};
    
    if (!Array.isArray(teamA) || !Array.isArray(teamB)) {
      return res.status(400).json({ success: false, message: 'Invalid teams' });
    }

    // ✅ Validate isMultiplayer flag (default to false for safety)
    const isMultiplayerGame = isMultiplayer === true;

    const { updateStatsForMatch } = require('../services/gameService');
    await updateStatsForMatch(
      teamA, 
      teamB, 
      Number(scoreA || 0), 
      Number(scoreB || 0), 
      Number(rounds || 0),
      isMultiplayerGame  // ✅ Pass flag
    );

    res.json({ success: true, message: 'Match report processed' });
  } catch (e: any) {
    console.error('Error processing match report:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});
```

**Fix line 74-82 (`/user-result` endpoint):**

```typescript
const { updateUserStats } = require('../services/gameService');
await updateUserStats(userId, {
  gamesPlayed: 1,
  gamesWon: won ? 1 : 0,
  totalPoints: Number(points || 0),
  totalRounds: Number(rounds || 0)
}, false);  // ✅ Explicitly mark as offline (single-user endpoint is for offline games)
```

**Fix line 239-256 (`/:id/complete` endpoint):**

```typescript
// Extract userId from token
let userId: string | null = null;
let isMultiplayer = false;  // ✅ Track mode

try {
  const authHeader = (req.headers && (req.headers as any).authorization) || null;
  const token = authHeader ? String(authHeader).split(' ')[1] : null;
  if (token) {
    const decoded = AuthService.verifyToken(token) as any;
    userId = decoded?.userId || null;
  }

  // ✅ Check if this is a multiplayer game via gameHub
  const engine = gameHub.get(id);
  const tableEntry = Array.from(gameHub['tableGameMap'].values()).find(e => e.gameId === id);
  isMultiplayer = tableEntry?.tableConfig?.gameMode === 'MULTIPLAYER';
} catch (e) {
  // fall through
}

if (!userId) {
  return res.status(401).json({ success: false, message: 'User not authenticated' });
}

const { updateUserStats } = require('../services/gameService');

// ... calculate pointsEarned ...

// ✅ Pass isMultiplayer flag
await updateUserStats(userId, {
  gamesPlayed: 1,
  gamesWon: userWon ? 1 : 0,
  totalPoints: pointsEarned,
  totalRounds: totalRounds || 0
}, isMultiplayer);
```

---

## 🧪 Phase 5: Verification Steps

### 1. Run Migration

```bash
cd backend
npm run db:reset
```

Expected output:
```
✅ Migration applied
✅ Prisma Client generated
🌱 Seeding database...
✅ Created 4 test users
```

### 2. Check Schema

```bash
npx prisma studio
```

Verify:
- `users` table has `isBot` column (boolean)
- `game_sessions` table has `isMultiplayer` column (boolean)
- Bot users (`bot_1`, `bot_2`) have `isBot = true`

### 3. Test Offline Game

```bash
# Start backend
npm run dev

# In another terminal, test offline game
curl -X POST http://localhost:3001/api/games/create \
  -H "Content-Type: application/json" \
  -d '{"playerNames":["alice"], "gameType":"schieber"}'

# Complete game (should NOT update stats)
curl -X POST http://localhost:3001/api/games/GAME_ID/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userWon":true, "userTeamScore":1000, "opponentTeamScore":500}'

# Check user stats (should be 0 games)
curl http://localhost:3001/api/admin/leaderboard
```

### 4. Test Multiplayer Game

```bash
# Report multiplayer match
curl -X POST http://localhost:3001/api/games/report \
  -H "Content-Type: application/json" \
  -d '{
    "teamA":["USER_ID_1","USER_ID_2"],
    "teamB":["USER_ID_3","USER_ID_4"],
    "scoreA":1000,
    "scoreB":800,
    "isMultiplayer":true
  }'

# Check leaderboard (should show updated stats)
curl http://localhost:3001/api/admin/leaderboard
```

---

## ✅ Acceptance Criteria

- [ ] `npm run db:reset` works without errors
- [ ] Bot users have `isBot = true` in database
- [ ] Offline games do NOT update `totalGames`, `totalWins`, or `trueSkillMu`
- [ ] Multiplayer games with bots exclude bot players from stats
- [ ] Leaderboard shows only human player stats
- [ ] GameSession records have correct `isMultiplayer` value

---

## 📝 Testing Commands

```bash
# Backend tests
cd backend
npm run smoke
npm run multi

# Manual verification
curl http://localhost:3001/api/admin/leaderboard | jq
```

---

## 🚀 Next Steps (After Phase 1)

1. **Phase 2:** Server-side multiplayer validation (turn order, legal cards)
2. **Phase 3:** Rules compliance (schieben, multipliers, match bonus)
3. **Phase 4:** Swiss card assets (public domain SVGs)
4. **Phase 5:** Comprehensive tests (unit, integration, E2E)

---

**Current Status:** Ready to implement Phase 1. All diffs provided above are PR-ready.

**Estimated Completion:** 1-2 hours (migration + testing)
