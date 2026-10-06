## Fix #6: Database Indexes and Migration

**Create migration:** `backend/prisma/migrations/20241004_add_indexes/migration.sql`
```sql
-- Add indexes for frequently queried fields

-- User table: email and username are queried on every login
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users"("username");

-- GameTablePlayer: queries by tableId and userId are common
-- Note: @@index([tableId]) and @@index([userId]) already exist in schema
-- No additional indexes needed here

-- Friendship: userBId lookups for friend lists
-- Note: @@index([userBId]) already exists in schema
-- No additional index needed

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS "idx_users_trueskill" ON "users"("trueSkillMu" DESC, "trueSkillSigma" ASC);
CREATE INDEX IF NOT EXISTS "idx_users_total_points" ON "users"("totalPoints" DESC);

-- GameSession: queries by userId and date
CREATE INDEX IF NOT EXISTS "idx_game_sessions_user_created" ON "game_sessions"("userId", "createdAt" DESC);

-- GameTable: queries by status and creation date
CREATE INDEX IF NOT EXISTS "idx_game_tables_status_created" ON "GameTable"("status", "createdAt" DESC);
```

**Update:** `backend/prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./swiss_jass.db"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String
  firstName String?
  lastName  String?
  avatarShape String @default("circle")
  avatarColor String @default("#3B82F6")
  country   String @default("CH")
  city      String?
  totalGames    Int @default(0)
  totalWins     Int @default(0)
  totalPoints   Int @default(0)
  trueSkillMu    Float @default(25.0)
  trueSkillSigma Float @default(8.333)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lastLogin DateTime?
  tablesCreated   GameTable[]       @relation("TableCreator")
  tablePlayers    GameTablePlayer[]
  friendshipsA    Friendship[]      @relation("FriendshipA")
  friendshipsB    Friendship[]      @relation("FriendshipB")
  friendRequestsSent    FriendRequest[] @relation("RequestSender")
  friendRequestsReceived FriendRequest[] @relation("RequestReceiver")
  
  // Add indexes for performance
  @@index([email])
  @@index([username])
  @@index([totalPoints(sort: Desc)])
  @@index([trueSkillMu(sort: Desc), trueSkillSigma])
  
  @@map("users")
}

model GameSession {
  id        String   @id @default(cuid())
  userId    String
  gameType  String
  result    String
  points    Int
  duration  Int
  createdAt DateTime @default(now())
  
  @@index([userId, createdAt(sort: Desc)])
  @@map("game_sessions")
}

model GameTable {
  id          String            @id @default(cuid())
  code        String            @unique
  name        String
  status      TableStatus       @default(OPEN)
  maxPlayers  Int               @default(4)
  gameType    String            @default("schieber")
  team1Name   String            @default("Team 1")
  team2Name   String            @default("Team 2")
  targetPoints Int              @default(1000)
  createdById String
  createdBy   User              @relation("TableCreator", fields: [createdById], references: [id])
  players     GameTablePlayer[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  startedAt   DateTime?
  endedAt     DateTime?
  isPrivate   Boolean           @default(false)
  password    String?
  
  @@index([status, createdAt(sort: Desc)])
}

model GameTablePlayer {
  id        String    @id @default(cuid())
  tableId   String
  userId    String
  seatIndex Int?
  joinedAt  DateTime  @default(now())
  leftAt    DateTime?
  isHost    Boolean   @default(false)
  isReady   Boolean   @default(false)
  table     GameTable @relation(fields: [tableId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([tableId, userId])
  @@index([userId])
  @@index([tableId])
}

model Friendship {
  id        String   @id @default(cuid())
  userAId   String
  userBId   String
  createdAt DateTime @default(now())
  userA     User     @relation("FriendshipA", fields: [userAId], references: [id], onDelete: Cascade)
  userB     User     @relation("FriendshipB", fields: [userBId], references: [id], onDelete: Cascade)
  @@unique([userAId, userBId])
  @@index([userBId])
}

model FriendRequest {
  id          String            @id @default(cuid())
  senderId    String
  receiverId  String
  status      FriendRequestStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  respondedAt DateTime?
  sender      User              @relation("RequestSender", fields: [senderId], references: [id], onDelete: Cascade)
  receiver    User              @relation("RequestReceiver", fields: [receiverId], references: [id], onDelete: Cascade)
  @@unique([senderId, receiverId])
  @@index([receiverId])
}

enum TableStatus {
  OPEN
  STARTING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum FriendRequestStatus {
  PENDING
  ACCEPTED
  DECLINED
  CANCELLED
}
```

**Run migration:**
```bash
cd backend
npx prisma migrate dev --name add_performance_indexes
npx prisma generate
```

**Seed script:** `backend/prisma/seed.ts`
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const testUsers = [
    {
      email: 'anna@jass.ch',
      username: 'anna_jass',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Anna',
      lastName: 'Müller',
      avatarShape: 'circle',
      avatarColor: '#3B82F6',
      country: 'CH',
      city: 'Zürich',
      totalGames: 42,
      totalWins: 25,
      totalPoints: 15420,
      trueSkillMu: 27.5,
      trueSkillSigma: 6.2
    },
    {
      email: 'reto@jass.ch',
      username: 'reto_pro',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Reto',
      lastName: 'Huber',
      avatarShape: 'square',
      avatarColor: '#10B981',
      country: 'CH',
      city: 'Bern',
      totalGames: 38,
      totalWins: 20,
      totalPoints: 12800,
      trueSkillMu: 26.2,
      trueSkillSigma: 7.1
    },
    {
      email: 'fritz@jass.ch',
      username: 'fritz_meister',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Fritz',
      lastName: 'Schneider',
      avatarShape: 'triangle',
      avatarColor: '#EF4444',
      country: 'CH',
      city: 'Basel',
      totalGames: 55,
      totalWins: 32,
      totalPoints: 18900,
      trueSkillMu: 28.8,
      trueSkillSigma: 5.5
    }
  ];

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData
    });
    console.log(`✅ Created user: ${user.username}`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Update backend/package.json:**
```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "rimraf dist node_modules/.prisma && npx prisma generate && tsc",
    "start": "npm run build && node dist/index.js",
    "start:prod": "node dist/index.js",
    "migrate": "npx prisma migrate dev",
    "migrate:deploy": "npx prisma migrate deploy",
    "db:seed": "ts-node prisma/seed.ts",
    "db:reset": "npx prisma migrate reset --force && npm run db:seed",
    "postinstall": "npx prisma generate"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## Fix #7: Comprehensive Test Suite

### Unit Tests for Game Engine

**Install test dependencies:**
```bash
cd web
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

**New file:** `web/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts'
      ]
    }
  }
});
```

**New file:** `web/src/tests/setup.ts`
```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

**New file:** `web/src/tests/engine/schieber.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import * as Schieber from '../../engine/schieber';
import { scoreTrick, scoreWeis, tallyRound, isWeisBetter } from '../../engine/scoring';

describe('Swiss Jass Game Engine', () => {
  
  describe('Deck and Dealing', () => {
    it('should create a deck of 36 cards', () => {
      const deck = Schieber.createDeck();
      expect(deck).toHaveLength(36);
      
      // Check all suits and ranks are present
      const suits = ['eicheln', 'schellen', 'rosen', 'schilten'];
      const ranks = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
      
      suits.forEach(suit => {
        ranks.forEach(rank => {
          const card = deck.find(c => c.suit === suit && c.rank === rank);
          expect(card).toBeDefined();
        });
      });
    });

    it('should deal 9 cards to each of 4 players', () => {
      const players = Schieber.deal();
      expect(players).toHaveLength(4);
      players.forEach(player => {
        expect(player.hand).toHaveLength(9);
      });
    });
  });

  describe('Trump Rules and Card Legality', () => {
    it('should allow any card on first trick', () => {
      const state = Schieber.startGameLocal();
      state.trump = 'eicheln';
      state.phase = 'playing';
      
      const legal = Schieber.getLegalCardsForPlayer(state, 0);
      expect(legal).toHaveLength(9); // All cards are legal
    });

    it('should require following suit when possible', () => {
      const state = Schieber.startGameLocal();
      state.trump = 'eicheln';
      state.phase = 'playing';
      state.currentTrick = [
        { id: '1', suit: 'rosen', rank: 'A', playerId: 1 }
      ];
      state.trickLead = 'rosen';
      
      // Add some rosen cards to player's hand
      const player = state.players[0];
      player.hand = [
        { id: '2', suit: 'rosen', rank: 'K' },
        { id: '3', suit: 'schilten', rank: 'A' },
        { id: '4', suit: 'eicheln', rank: 'U' } // trump
      ];
      
      const legal = Schieber.getLegalCardsForPlayer(state, 0);
      
      // Should only return rosen cards (must follow suit)
      expect(legal).toHaveLength(1);
      expect(legal[0].suit).toBe('rosen');
    });

    it('should require trump when void in led suit', () => {
      const state = Schieber.startGameLocal();
      state.trump = 'eicheln';
      state.phase = 'playing';
      state.currentTrick = [
        { id: '1', suit: 'rosen', rank: 'A', playerId: 1 }
      ];
      state.trickLead = 'rosen';
      
      // Player has no rosen but has trump
      const player = state.players[0];
      player.hand = [
        { id: '2', suit: 'schilten', rank: 'K' },
        { id: '3', suit: 'eicheln', rank: 'U' }, // trump
        { id: '4', suit: 'eicheln', rank: '9' }  // trump
      ];
      
      const legal = Schieber.getLegalCardsForPlayer(state, 0);
      
      // Should only return trump cards
      expect(legal).toHaveLength(2);
      expect(legal.every(c => c.suit === 'eicheln')).toBe(true);
    });

    it('should allow any card when void in led suit and no trump', () => {
      const state = Schieber.startGameLocal();
      state.trump = 'eicheln';
      state.phase = 'playing';
      state.currentTrick = [
        { id: '1', suit: 'rosen', rank: 'A', playerId: 1 }
      ];
      state.trickLead = 'rosen';
      
      // Player has no rosen and no trump
      const player = state.players[0];
      player.hand = [
        { id: '2', suit: 'schilten', rank: 'K' },
        { id: '3', suit: 'schellen', rank: 'A' },
        { id: '4', suit: 'schellen', rank: '9' }
      ];
      
      const legal = Schieber.getLegalCardsForPlayer(state, 0);
      
      // All cards are legal
      expect(legal).toHaveLength(3);
    });
  });

  describe('Weis Detection and Scoring', () => {
    it('should detect sequence of 3', () => {
      const hand = [
        { id: '1', suit: 'rosen', rank: '6' },
        { id: '2', suit: 'rosen', rank: '7' },
        { id: '3', suit: 'rosen', rank: '8' },
        { id: '4', suit: 'schilten', rank: 'A' }
      ];
      
      const weis = Schieber.detectWeis(hand, null);
      
      const seq3 = weis.find(w => w.type === 'sequence3');
      expect(seq3).toBeDefined();
      expect(seq3?.points).toBe(20);
    });

    it('should detect sequence of 4 (50 points)', () => {
      const hand = [
        { id: '1', suit: 'rosen', rank: '6' },
        { id: '2', suit: 'rosen', rank: '7' },
        { id: '3', suit: 'rosen', rank: '8' },
        { id: '4', suit: 'rosen', rank: '9' }
      ];
      
      const weis = Schieber.detectWeis(hand, null);
      
      const seq4 = weis.find(w => w.type === 'sequence4');
      expect(seq4).toBeDefined();
      expect(seq4?.points).toBe(50);
    });

    it('should detect four of a kind (Jacks = 200)', () => {
      const hand = [
        { id: '1', suit: 'rosen', rank: 'U' },
        { id: '2', suit: 'schilten', rank: 'U' },
        { id: '3', suit: 'eicheln', rank: 'U' },
        { id: '4', suit: 'schellen', rank: 'U' }
      ];
      
      const weis = Schieber.detectWeis(hand, null);
      
      const fourJacks = weis.find(w => w.type === 'four_jacks');
      expect(fourJacks).toBeDefined();
      expect(fourJacks?.points).toBe(200);
    });

    it('should only award Weis to team with better Weis', () => {
      const team1Weis = [{ type: 'sequence4', points: 50, cards: [], description: '4-seq' }];
      const team2BestWeis = { type: 'sequence3', points: 20, cards: [], description: '3-seq' };
      
      const team1Score = scoreWeis(team1Weis as any, team2BestWeis as any);
      const team2Score = scoreWeis([team2BestWeis] as any, team1Weis[0] as any);
      
      expect(team1Score).toBe(50); // Team 1 wins
      expect(team2Score).toBe(0);  // Team 2 scores 0
    });

    it('should award no Weis on tie (Swiss rule)', () => {
      const team1Weis = [{ type: 'sequence4', points: 50, cards: [], description: '4-seq' }];
      const team2BestWeis = { type: 'sequence4', points: 50, cards: [], description: '4-seq' };
      
      const team1Score = scoreWeis(team1Weis as any, team2BestWeis as any);
      const team2Score = scoreWeis([team2BestWeis] as any, team1Weis[0] as any);
      
      expect(team1Score).toBe(0); // Tie = nobody scores
      expect(team2Score).toBe(0);
    });
  });

  describe('Scoring and Multipliers', () => {
    it('should calculate trick points correctly', () => {
      const trick = [
        { id: '1', suit: 'rosen', rank: 'A' },   // 11
        { id: '2', suit: 'rosen', rank: 'K' },   // 4
        { id: '3', suit: 'rosen', rank: '10' },  // 10
        { id: '4', suit: 'rosen', rank: '6' }    // 0
      ];
      
      const points = scoreTrick(trick, null, false);
      expect(points).toBe(25); // 11 + 4 + 10 + 0
    });

    it('should add 5 points for last trick', () => {
      const trick = [
        { id: '1', suit: 'rosen', rank: 'A' },   // 11
        { id: '2', suit: 'rosen', rank: 'K' },   // 4
        { id: '3', suit: 'rosen', rank: '10' },  // 10
        { id: '4', suit: 'rosen', rank: '6' }    // 0
      ];
      
      const points = scoreTrick(trick, null, true);
      expect(points).toBe(30); // 25 + 5 bonus
    });

    it('should use trump point values correctly', () => {
      const trick = [
        { id: '1', suit: 'eicheln', rank: 'U' },  // 20 (trump Jack)
        { id: '2', suit: 'eicheln', rank: '9' },  // 14 (trump 9)
        { id: '3', suit: 'eicheln', rank: 'A' },  // 11
        { id: '4', suit: 'rosen', rank: 'A' }     // 11 (non-trump)
      ];
      
      const points = scoreTrick(trick, 'eicheln', false);
      expect(points).toBe(56); // 20 + 14 + 11 + 11
    });

    it('should apply multipliers correctly', () => {
      const result = tallyRound({
        team1TrickPoints: 100,
        team2TrickPoints: 57,
        team1Weis: [],
        team2Weis: [],
        contract: 'schellen', // 2x multiplier
        matchBonusWinner: null
      });
      
      expect(result.team1).toBe(200); // 100 * 2
      expect(result.team2).toBe(114); // 57 * 2
    });

    it('should apply match bonus correctly', () => {
      const result = tallyRound({
        team1TrickPoints: 157, // All tricks
        team2TrickPoints: 0,
        team1Weis: [],
        team2Weis: [],
        contract: 'oben-abe', // 3x multiplier
        matchBonusWinner: 1
      });
      
      expect(result.team1).toBe((157 + 100) * 3); // 771
      expect(result.team2).toBe(0);
    });
  });

  describe('Contract Multipliers', () => {
    const cases = [
      { contract: 'eicheln', multiplier: 1 },
      { contract: 'rosen', multiplier: 1 },
      { contract: 'schellen', multiplier: 2 },
      { contract: 'schilten', multiplier: 2 },
      { contract: 'oben-abe', multiplier: 3 },
      { contract: 'unden-ufe', multiplier: 4 }
    ];

    cases.forEach(({ contract, multiplier }) => {
      it(`should use ${multiplier}x multiplier for ${contract}`, () => {
        const result = tallyRound({
          team1TrickPoints: 100,
          team2TrickPoints: 57,
          team1Weis: [],
          team2Weis: [],
          contract: contract as any,
          matchBonusWinner: null
        });
        
        expect(result.team1).toBe(100 * multiplier);
        expect(result.team2).toBe(57 * multiplier);
      });
    });
  });
});
```

**Update web/package.json:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "deploy": "npx gh-pages -d dist"
  }
}
```

### Backend Integration Tests

**New file:** `backend/src/tests/api/auth.integration.test.ts`
```typescript
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import authRoutes from '../../routes/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API Integration Tests', () => {
  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  };

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
  });

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe(testUser.email);
  });

  it('should reject duplicate email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('already exists');
  });

  it('should reject weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUser,
        email: 'another@example.com',
        password: '12345' // Too short
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should login with correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: testUser.password
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: 'wrongpassword'
      })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should get user profile with valid token', async () => {
    // First login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: testUser.password
      });

    const token = loginRes.body.token;

    // Get profile
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(testUser.email);
  });

  it('should reject profile request without token', async () => {
    const response = await request(app)
      .get('/api/auth/profile')
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});
```

---

Continue in next file...
