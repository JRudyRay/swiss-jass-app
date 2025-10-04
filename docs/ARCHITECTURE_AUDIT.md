# Swiss Jass App - Architecture & Code Audit Summary

**Date:** October 4, 2025  
**Auditor:** Senior Full-Stack Engineer  
**Scope:** End-to-end review for rankings, multiplayer, rules compliance, and production readiness

---

## 📊 Executive Summary

### Current State
- **Frontend:** React 18 + TypeScript, Vite build, local game engine (`web/src/engine/schieber.ts`)
- **Backend:** Node.js + Express + Prisma (SQLite), Socket.IO for real-time, game engine (`backend/src/gameEngine/SwissJassEngine.ts`)
- **Deployment:** GitHub Pages (frontend), Railway (backend)
- **Database:** SQLite with Prisma ORM
- **Auth:** JWT tokens, bcrypt password hashing

### Critical Findings

#### 🔴 **CRITICAL** - Rankings Logic Issues
1. **No offline/multiplayer discrimination** - All games update rankings regardless of mode
2. **Bot players included in rankings** - Bot users (`bot_1`, `bot_2`, etc.) artificially inflate stats
3. **Missing game mode tracking** - No `isMultiplayer` or `gameMode` field in database
4. **Client can submit stats** - Routes accept stats from any source without validation

#### 🔴 **CRITICAL** - Multiplayer Stability Issues
1. **Minimal server-side validation** - Trust client state for card plays
2. **No reconnection handling** - Disconnected players cannot rejoin
3. **Missing turn order enforcement** - Server doesn't validate current player
4. **No room lifecycle guards** - Games can start with <4 players
5. **Race conditions** - No idempotency tokens for duplicate events

#### 🟡 **HIGH** - Rules Compliance Gaps
1. **Trump multipliers not applied** - Fixed 1x multiplier regardless of contract
2. **Schieben (pass) not implemented** - Cannot pass trump choice to partner
3. **Stöck timing unclear** - K+Q declaration logic incomplete
4. **Match bonus (157 total) not enforced** - Rounds can have incorrect point totals

---

## 🗂️ Architecture Map

### Rankings & Stats System

#### **Database Schema** (`backend/prisma/schema.prisma`)
```prisma
model User {
  totalGames    Int @default(0)
  totalWins     Int @default(0)
  totalPoints   Int @default(0)
  trueSkillMu   Float @default(25.0)
  trueSkillSigma Float @default(8.333)
}

model GameSession {
  userId    String
  gameType  String
  result    String  // 'win' | 'loss'
  points    Int
  duration  Int
}
```

**❌ MISSING FIELDS:**
- No `isMultiplayer` boolean on GameSession
- No `Player.isBot` field (bots are regular User records)
- No `GameTable.gameMode` discriminator

#### **Stats Update Functions**

| File | Function | Purpose | Issues |
|------|----------|---------|--------|
| `backend/src/services/gameService.ts` | `updateStatsForMatch(teamA, teamB, scoreA, scoreB)` | Updates TrueSkill for team match | ✅ Uses TrueSkill correctly<br/>❌ No multiplayer check<br/>❌ Accepts bot user IDs |
| `backend/src/services/gameService.ts` | `updateUserStats(userId, stats)` | Single-user stats update | ❌ No multiplayer check<br/>❌ No bot filter |
| `backend/src/gameHub.ts` | `engine.on('gameFinished')` | Auto-updates stats on game end | ❌ Updates for ALL games (offline + multiplayer) |

#### **Routes Accepting Stats**

| Route | Method | Body | Validation | Issue |
|-------|--------|------|------------|-------|
| `/api/games/report` | POST | `{teamA[], teamB[], scoreA, scoreB}` | None | ❌ No auth, accepts any team IDs including bots |
| `/api/games/user-result` | POST | `{won, points, rounds}` | JWT required | ❌ Updates even for offline games |
| `/api/games/:id/complete` | POST | `{userTeamScore, opponentTeamScore, userWon}` | JWT required | ❌ Updates for bot games |

### Multiplayer System

#### **Socket.IO Events** (`backend/src/index.ts`, lines 199-350)

| Event | Payload | Handler | Server Validation |
|-------|---------|---------|-------------------|
| `connection` | JWT in `socket.handshake.auth.token` | Verify token, set online | ✅ |
| `table:join` | `{tableId}` | Join Socket.IO room | ❌ No capacity check |
| `table:requestState` | `{tableId}` | Send current game state | ✅ |
| `game:playCard` | `{cardId, playerId}` | Validate & apply move | ❌ No turn order check |
| `game:selectTrump` | `{trump, playerId}` | Set trump contract | ❌ No phase validation |
| `disconnect` | - | Set offline | ❌ No rejoin mechanism |

#### **GameHub** (`backend/src/gameHub.ts`)

```typescript
class GameHub {
  private games = Map<GameId, GameInstance>
  private tableGameMap = Map<tableId, {gameId, engine, tableConfig}>
  
  create(playerNames?, gameType?): {id, engine}
  registerTableGame(tableId, gameId, engine, tableConfig)
  getByTableId(tableId): {gameId, engine} | null
  
  // Bot automation
  performBotAction(gameId)
  handleBotTrumpSelection(gameId)
}
```

**Issues:**
- No distinction between offline (local) and multiplayer games
- `engine.on('gameFinished')` updates stats for **all** games
- Bot players are treated as real users (creates User records with `username: bot_1`)

#### **Table Service** (`backend/src/services/tableService.ts`)

```typescript
createTable(userId, name, isPrivate, password, maxPlayers=4)
joinTable(userId, tableId)
startTable(tableId, userId)  // Line 123: filters bots, fills remaining seats
```

**Line 123-146:** Bot filling logic:
```typescript
const humanPlayers = players.filter(p => !p.userId.startsWith('BOT_'));
// Creates User records for bots: bot_1@bots.local, bot_2@bots.local
const botUser = await prisma.user.create({
  data: { username: botUsername, email: botEmail, password: '!' }
});
```

**❌ Problem:** Bot users have real DB records with `totalGames`, `totalWins`, `trueSkillMu` that get updated!

### Game Engines

#### **Frontend Engine** (`web/src/engine/schieber.ts` - 894 lines)

**Responsibilities:**
- Offline/local gameplay
- Bot AI for practice mode
- Card legality checking
- Weis detection
- Scoring calculation

**Key Functions:**
| Function | Lines | Purpose | Compliance |
|----------|-------|---------|------------|
| `createDeck()` | 130-145 | 36-card deck | ✅ Correct suits/ranks |
| `deal(state)` | 155-175 | 9 cards per player | ✅ |
| `setTrumpAndDetectWeis()` | 285-330 | Trump selection + Weis | ⚠️ Schieben not impl. |
| `getLegalCardsForPlayer()` | 335-360 | Follow suit rules | ✅ Mostly correct |
| `calculateTeamWeis()` | 560-605 | Weis tie-breaking | ⚠️ Unclear logic |
| `resolveTrick()` | 410-455 | Trick winner | ✅ |
| `settleHand()` | 750-810 | Apply multipliers, 157+5 | ❌ Multiplier always 1x |

**Trump Contracts:**
```typescript
type TrumpContract = 'eicheln' | 'schellen' | 'rosen' | 'schilten' | 
                     'oben-abe' | 'unden-ufe';
```

**❌ Missing:** `'schieben'` (pass to partner)

**Card Ordering:**
- **Trump:** `['U','9','A','K','O','10','8','7','6']` - ✅ Correct
- **Normal:** `['A','K','O','U','10','9','8','7','6']` - ✅ Correct
- **Oben-abe:** Same as normal - ✅ Correct (high wins)
- **Unden-ufe:** `['6','7','8','9','U','O','K','10','A']` - ✅ Correct (low wins)

**Point Values:**
```typescript
// Line 75-80
const basePoints: Record<Rank, number> = {
  '6':0,'7':0,'8':0,'9':0,'10':10,'U':2,'O':3,'K':4,'A':11
};
const trumpOverride: Record<Rank, number> = {
  'U':20,'9':14,'A':11,'10':10,'K':4,'O':3,'8':0,'7':0,'6':0
};
```
✅ Correct per official rules

**Weis Values (Lines 515-540):**
```typescript
sequence3: 20
sequence4: 50
sequence5+: 100 (add 50/100 for longer)
four_jacks: 200
four_nines: 150
four_aces/kings/queens: 100
```
✅ Correct

#### **Backend Engine** (`backend/src/gameEngine/SwissJassEngine.ts` - 625 lines)

**Responsibilities:**
- Authoritative multiplayer game state
- Server-side validation (but weak currently)
- Bot automation
- Event emission (`phaseChange`, `cardPlayed`, `trickCompleted`, `gameFinished`)

**Constants:**
```typescript
export const JASS_POINTS = {
  trump: { 'U': 20, '9': 14, 'A': 11, 'K': 4, 'O': 3, '10': 10, '8': 0, '7': 0, '6': 0 },
  normal: { 'A': 11, '10': 10, 'K': 4, 'O': 3, 'U': 2, '9': 0, '8': 0, '7': 0, '6': 0 },
  obenabe: { 'A': 11, 'K': 4, 'O': 3, 'U': 2, '10': 10, '9': 0, '8': 8, '7': 0, '6': 0 },
  undenufe: { '6': 11, '7': 0, '8': 8, '9': 0, '10': 10, 'U': 2, 'O': 3, 'K': 4, 'A': 0 }
};
```
✅ Correct (Oben-abe 8=8pts, Unden-ufe 6=11pts)

**Key Methods:**
- `dealCards()` - Distributes 9 cards/player
- `selectTrump(contract, playerId)` - Sets trump
- `playCard(cardId, playerId)` - Validates & applies move
- `getLegalCards(playerId)` - Returns legal options
- `scoreRound()` - Calculates team scores

**❌ Missing:**
- `validateTurnOrder()` - Not called before card plays
- `handleReconnection()` - No persistence or recovery
- `applyContractMultipliers()` - Multipliers not applied

---

## 🚨 Priority Issues & Fixes

### Issue #1: Rankings Include Offline Games & Bots

**Severity:** 🔴 CRITICAL  
**Impact:** Leaderboards are meaningless, bot users dominate rankings

**Root Causes:**
1. `gameHub.ts` line 118: `engine.on('gameFinished')` calls `updateStatsForMatch` for ALL games
2. No `isMultiplayer` discriminator in GameSession table
3. Bot users (`bot_1`, `bot_2`) have real User records that get stats updates

**Fix Required:**
1. Add `isMultiplayer` boolean to GameSession schema
2. Add `isBot` boolean to User schema (or use username pattern)
3. Guard all stats update functions:
   ```typescript
   if (!gameSession.isMultiplayer) return; // skip offline
   const realPlayers = teamA.filter(id => !isBotUser(id));
   if (realPlayers.length === 0) return; // all bots
   ```
4. Frontend must NOT call `/api/games/report` for offline games
5. Server must reject stats from offline games

**Files to Change:**
- `backend/prisma/schema.prisma` (migration)
- `backend/src/services/gameService.ts` (add guards)
- `backend/src/gameHub.ts` (pass `isMultiplayer` flag)
- `backend/src/routes/games.ts` (validate mode)
- `web/src/JassGame.tsx` (don't report offline stats)

---

### Issue #2: No Backend Reset Script

**Severity:** 🟡 HIGH  
**Impact:** Cannot cleanly reinitialize DB during development

**Fix Required:**
1. Add `backend/scripts/seed.ts`:
   ```typescript
   // Seed only minimal system data, NO game results
   const testUsers = [
     { username: 'alice', email: 'alice@test.com', password: hashedPw },
     { username: 'bob', email: 'bob@test.com', password: hashedPw }
   ];
   // DO NOT create bot users here - they're created on-demand
   ```

2. Add `package.json` script:
   ```json
   "db:reset": "prisma migrate reset --force && prisma db push && tsx scripts/seed.ts"
   ```

3. Document in `backend/README.md`:
   ```md
   ## Database Reset
   ⚠️ **WARNING:** This deletes all data!
   npm run db:reset
   ```

---

### Issue #3: Multiplayer Lacks Server Validation

**Severity:** 🔴 CRITICAL  
**Impact:** Cheating possible, desyncs, crashes

**Missing Validations:**
1. Turn order: Server doesn't check if `playerId === gameState.currentPlayer`
2. Legal cards: Server trusts client's card choice
3. Room capacity: Can join full tables
4. Duplicate events: No idempotency tokens

**Fix Required:**

**backend/src/routes/games.ts** (add to `/api/games/:id/play`):
```typescript
router.post('/:id/play', (req, res) => {
  const { playerId, cardId } = req.body;
  const engine = gameHub.get(id);
  const state = engine.getGameState();
  
  // ✅ Validate turn order
  if (state.currentPlayer !== playerId) {
    return res.status(400).json({ 
      success: false, 
      message: `Not your turn (current: ${state.currentPlayer})` 
    });
  }
  
  // ✅ Validate card legality
  const legalCards = engine.getLegalCards(playerId);
  if (!legalCards.some(c => c.id === cardId)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Illegal card (must follow suit or play trump)' 
    });
  }
  
  const success = engine.playCard(cardId, playerId);
  // ... rest
});
```

**backend/src/index.ts** (Socket.IO events):
```typescript
socket.on('game:playCard', async (data: {tableId, cardId}) => {
  const token = socket.handshake.auth?.token;
  const decoded = verifyToken(token);
  const userId = decoded.userId;
  
  // ✅ Map socket user to player ID
  const game = gameHub.getByTableId(data.tableId);
  const players = game.engine.getPlayers();
  const player = players.find(p => p.userId === userId);
  if (!player) {
    return socket.emit('error', {message: 'Not in this game'});
  }
  
  // ✅ Validate turn
  const state = game.engine.getGameState();
  if (state.currentPlayer !== player.id) {
    return socket.emit('error', {message: 'Not your turn'});
  }
  
  // ✅ Play card with validation
  const success = game.engine.playCard(data.cardId, player.id);
  if (!success) {
    return socket.emit('error', {message: 'Illegal card play'});
  }
  
  // ✅ Broadcast to all in room
  io.to(`table:${data.tableId}`).emit('game:state', {
    state: game.engine.getGameState(),
    players: game.engine.getPlayers()
  });
});
```

---

### Issue #4: Schieben (Trump Pass) Not Implemented

**Severity:** 🟡 HIGH (Rules Compliance)  
**Impact:** Cannot play authentic Schieber variant

**Official Rule:**
> "The forehand (player after dealer) may either choose a trump suit/contract OR say 'Schiebe' (pass) to their partner (player opposite). The partner MUST then choose. Back-schieben (partner passing back) is NOT allowed."

**Current Code:**
- `web/src/engine/schieber.ts` has no `'schieben'` logic
- `setTrumpAndDetectWeis()` directly sets trump
- No partner interaction

**Fix Required:**

**1. Add Schieben Phase:**
```typescript
// web/src/engine/schieber.ts
export type TrumpContract = Suit | 'oben-abe' | 'unden-ufe' | 'schieben';

export function initiateTrumpSelection(state: State): State {
  const st = {...state};
  st.phase = 'trump_selection';
  st.currentPlayer = st.forehand || ((st.dealer + 1) % 4);
  st.schiebenPending = false; // track if we're waiting for partner
  return st;
}

export function selectTrumpOrSchieben(
  state: State, 
  choice: TrumpContract | 'schieben', 
  playerId: number
): State {
  const st = {...state};
  
  if (choice === 'schieben') {
    if (st.schiebenPending) {
      throw new Error('Partner cannot schiebe back!');
    }
    // Pass to partner (player opposite: +2 mod 4)
    st.currentPlayer = (playerId + 2) % 4;
    st.schiebenPending = true;
    return st;
  }
  
  // Real trump chosen
  return setTrumpAndDetectWeis(st, choice, playerId);
}
```

**2. Update UI (`web/src/JassGame.tsx`):**
```tsx
{gameState.phase === 'trump_selection' && (
  <div>
    <button onClick={() => selectTrump('eicheln')}>Eicheln</button>
    {/* ... other suits ... */}
    {!gameState.schiebenPending && (
      <button onClick={() => selectTrump('schieben')}>
        Schieben (Pass to Partner)
      </button>
    )}
  </div>
)}
```

---

### Issue #5: Trump Multipliers Not Applied

**Severity:** 🟡 HIGH (Rules Compliance)  
**Impact:** Scoring incorrect, game balance broken

**Official Multipliers:**
- Suit trumps (Eicheln, Rosen): **×1**
- Suit trumps (Schellen, Schilten): **×2** (some variants)
- Oben-abe: **×3**
- Unden-ufe: **×4**

**Current Code:**
`web/src/engine/schieber.ts` line 750-810 (`settleHand`):
```typescript
const baseRoundPoints = team1TrickPoints + team1WeisTotal;
const team1RoundScore = baseRoundPoints;
// ❌ multiplier never applied!
```

**Fix:**
```typescript
export function settleHand(state: State): State {
  const st = {...state};
  
  // Calculate base points
  const team1TrickPoints = ...; // sum trick points
  const team1WeisTotal = ...;   // weis points
  const team2TrickPoints = ...;
  const team2WeisTotal = ...;
  
  // Determine multiplier
  let multiplier = 1;
  if (st.trump === 'oben-abe') multiplier = 3;
  else if (st.trump === 'unden-ufe') multiplier = 4;
  // else if (st.trump === 'schellen' || st.trump === 'schilten') multiplier = 2; // optional variant
  
  // Apply multiplier to BOTH trick points AND weis
  const team1Total = (team1TrickPoints + team1WeisTotal) * multiplier;
  const team2Total = (team2TrickPoints + team2WeisTotal) * multiplier;
  
  // Add match bonus if team took all 9 tricks
  const team1Tricks = st.players.filter(p => p.team === 1 && p.tricks.length > 0)
    .reduce((sum, p) => sum + p.tricks.length, 0) / 4; // each trick has 4 cards
  if (team1Tricks === 9) team1Total += 100; // match bonus
  
  st.scores.team1 += team1Total;
  st.scores.team2 += team2Total;
  
  return st;
}
```

---

## 📋 Minimal Diff Plan

### Phase 1: Rankings Fix (3-4 hours)

**1. Database Migration:**
```sql
-- Add isMultiplayer to GameSession
ALTER TABLE game_sessions ADD COLUMN is_multiplayer BOOLEAN DEFAULT false;

-- Add isBot flag to User (or keep username pattern detection)
ALTER TABLE users ADD COLUMN is_bot BOOLEAN DEFAULT false;
UPDATE users SET is_bot = true WHERE username LIKE 'bot_%';
```

**2. Guard Stats Updates:**
```typescript
// backend/src/services/gameService.ts
export async function updateStatsForMatch(
  teamA: string[], 
  teamB: string[], 
  scoreA: number, 
  scoreB: number,
  isMultiplayer: boolean // NEW PARAM
) {
  if (!isMultiplayer) {
    console.log('Skipping stats update for offline game');
    return;
  }
  
  // Filter out bots
  const realTeamA = await filterRealPlayers(teamA);
  const realTeamB = await filterRealPlayers(teamB);
  
  if (realTeamA.length === 0 && realTeamB.length === 0) {
    console.log('Skipping stats update: all players are bots');
    return;
  }
  
  // ... existing TrueSkill logic
}

async function filterRealPlayers(userIds: string[]): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isBot: false }
  });
  return users.map(u => u.id);
}
```

**3. Update gameHub:**
```typescript
// backend/src/gameHub.ts line 118
engine.on('gameFinished', async (data: any) => {
  const { tableConfig } = this.tableGameMap.get(tableId) || {};
  const isMultiplayer = tableConfig?.isMultiplayer ?? false; // ✅ CHECK MODE
  
  if (!isMultiplayer) {
    console.log(`[${gameId}] Offline game - skipping stats update`);
    return;
  }
  
  const players = engine.getPlayers();
  const teamA = players.filter(p => p.team === 1 && p.userId && !p.isBot).map(p => p.userId!);
  const teamB = players.filter(p => p.team === 2 && p.userId && !p.isBot).map(p => p.userId!);
  
  await updateStatsForMatch(teamA, teamB, scoreA, scoreB, true);
});
```

**4. Frontend Changes:**
```typescript
// web/src/JassGame.tsx
// Remove any calls to /api/games/report for offline games
// Only call for multiplayer:
if (gameMode === 'multiplayer' && allPlayersHuman) {
  await fetch('/api/games/report', {
    method: 'POST',
    body: JSON.stringify({teamA, teamB, scoreA, scoreB}),
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}
  });
}
```

### Phase 2: DB Reset Script (1 hour)

**Files:**
- `backend/scripts/seed.ts` (new)
- `backend/package.json` (add script)
- `backend/README.md` (document usage)

### Phase 3: Multiplayer Validation (4-6 hours)

**1. Turn Order Validation** (backend/src/routes/games.ts, backend/src/index.ts)
**2. Legal Card Validation** (same files)
**3. Room Lifecycle Guards** (backend/src/services/tableService.ts)
**4. Reconnection Handler** (backend/src/index.ts, new persistence layer)

### Phase 4: Rules Compliance (6-8 hours)

**1. Schieben Implementation** (web/src/engine/schieber.ts, backend/src/gameEngine/SwissJassEngine.ts)
**2. Trump Multipliers** (both engines)
**3. Match Bonus** (both engines)
**4. Stöck Timing** (clarify logic, add comments)

### Phase 5: Swiss Card Images (3-4 hours)

**1. Source Public Domain Assets**
**2. Create Manifest** (web/src/assets/cards/swiss-manifest.ts)
**3. Update SwissCard.tsx**
**4. Add Credits Footer**

### Phase 6: Tests & Documentation (8-10 hours)

**1. Unit Tests** (rules engine, scoring, Weis)
**2. Integration Tests** (multiplayer flows)
**3. E2E Tests** (Playwright smoke tests)
**4. Documentation** (ADR, test plan, rules coverage)

---

## ✅ Acceptance Criteria Checklist

- [ ] Offline games never update rankings
- [ ] Bot players excluded from all stats/leaderboards
- [ ] `npm run db:reset` works reproducibly
- [ ] Multiplayer enforces turn order server-side
- [ ] Illegal card plays rejected with clear error
- [ ] Reconnection allows player to rejoin within timeout
- [ ] Schieben works (forehand can pass to partner)
- [ ] Trump multipliers applied correctly (1x/2x/3x/4x)
- [ ] Match bonus (100pts) awarded for taking all 9 tricks
- [ ] Round total is always 157 + 5 (last trick) = 162 base points
- [ ] Weis tie-breaking follows official rules
- [ ] Swiss card images render correctly (public domain assets)
- [ ] 80%+ test coverage for game engine
- [ ] CI pipeline runs all tests on push
- [ ] README documents rankings scope and DB reset

---

**Next Step:** Begin Phase 1 implementation with database migration and rankings guards.
