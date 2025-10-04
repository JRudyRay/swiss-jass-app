# Swiss Jass App - Code Fixes

## Fix #1: Clarify Weis Tie-Break Logic

**File:** `web/src/engine/schieber.ts`

**Current behavior:** Works correctly but logic is implicit
**Fix:** Add explicit tie detection and comments

```typescript
// In calculateTeamWeis function (line 560), replace the determination logic:

// OLD CODE (lines 585-605):
if (team1BestWeis && team2BestWeis) {
  if (isWeisBetter(team1BestWeis, team2BestWeis)) {
    // Team 1 wins, gets all their Weis points
    team1Points = team1Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
  } else if (isWeisBetter(team2BestWeis, team1BestWeis)) {
    // Team 2 wins, gets all their Weis points
    team2Points = team2Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
  }
  // If equal, nobody scores Weis points
}

// NEW CODE (explicit tie handling):
if (team1BestWeis && team2BestWeis) {
  const team1Wins = isWeisBetter(team1BestWeis, team2BestWeis);
  const team2Wins = isWeisBetter(team2BestWeis, team1BestWeis);
  
  // Authentic Swiss Jass rule: Only the team with the strictly better Weis scores
  // In case of a tie (both return false), neither team scores
  if (team1Wins && !team2Wins) {
    // Team 1 has strictly better Weis - award all their Weis points
    team1Points = team1Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
  } else if (team2Wins && !team1Wins) {
    // Team 2 has strictly better Weis - award all their Weis points
    team2Points = team2Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
  } else {
    // Tie: both teams have equal best Weis - nobody scores (authentic Swiss rule)
    // This includes the edge case where both isWeisBetter return true (shouldn't happen with correct implementation)
  }
}
```

**Verification Test:**
```typescript
// Add to web/scripts/unit_tests.ts:
test('Weis tie-break: equal Weis means nobody scores', () => {
  const players = [
    { id: 0, team: 1, weis: [{ type: 'sequence4', points: 50, cards: [], description: '4-seq' }] },
    { id: 1, team: 2, weis: [{ type: 'sequence4', points: 50, cards: [], description: '4-seq' }] },
    { id: 2, team: 1, weis: [] },
    { id: 3, team: 2, weis: [] }
  ];
  const result = calculateTeamWeis(players);
  assert(result.team1 === 0, 'Team 1 should score 0 on tie');
  assert(result.team2 === 0, 'Team 2 should score 0 on tie');
});
```

---

## Fix #2: Add Zod Input Validation

**Install dependency:**
```bash
cd backend
npm install zod
```

**New file:** `backend/src/validation/schemas.ts`
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarShape: z.enum(['circle', 'square', 'triangle', 'diamond', 'star', 'heart']).optional(),
  avatarColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
  country: z.string().length(2, 'Country code must be 2 letters').optional(),
  city: z.string().max(100).optional()
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username required'),
  password: z.string().min(1, 'Password required')
});

export const createGameSchema = z.object({
  playerNames: z.array(z.string()).optional(),
  gameType: z.enum(['schieber', 'coiffeur']).default('schieber')
});

export const playCardSchema = z.object({
  cardId: z.string(),
  playerId: z.number().int().min(0).max(3)
});

export const setTrumpSchema = z.object({
  trump: z.enum(['eicheln', 'schellen', 'rosen', 'schilten', 'oben-abe', 'unden-ufe', 'schieben'])
});

export const createTableSchema = z.object({
  name: z.string().min(1).max(50),
  gameType: z.string().default('schieber'),
  team1Name: z.string().max(30).default('Team 1'),
  team2Name: z.string().max(30).default('Team 2'),
  targetPoints: z.number().int().min(100).max(10000).default(1000),
  isPrivate: z.boolean().default(false),
  password: z.string().max(50).optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type PlayCardInput = z.infer<typeof playCardSchema>;
export type SetTrumpInput = z.infer<typeof setTrumpSchema>;
export type CreateTableInput = z.infer<typeof createTableSchema>;
```

**New file:** `backend/src/middleware/validate.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid request data'
      });
    }
  };
};
```

**Update:** `backend/src/routes/auth.ts`
```typescript
// Add at top:
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validation/schemas';

// Update routes:
router.post('/register', validate(registerSchema), async (req, res) => {
  // ... existing code
});

router.post('/login', validate(loginSchema), async (req, res) => {
  // ... existing code
});
```

**Update:** `backend/src/routes/games.ts`
```typescript
import { validate } from '../middleware/validate';
import { createGameSchema, playCardSchema, setTrumpSchema } from '../validation/schemas';

router.post('/create', validate(createGameSchema), (req, res) => {
  // ... existing code
});

router.post('/:id/play', validate(playCardSchema), (req, res) => {
  // ... existing code
});

router.post('/:id/trump', validate(setTrumpSchema), (req, res) => {
  // ... existing code
});
```

---

## Fix #3: Security Middleware (Helmet, CORS, Rate Limiting)

**Install dependencies:**
```bash
cd backend
npm install helmet express-rate-limit cors@latest
npm install --save-dev @types/cors
```

**Update:** `backend/src/index.ts`
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import prisma from './prismaClient';
import { onlineUsers, setUserOnline, setUserOffline, getOnlineCount } from './presence';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import gameRoutes from './routes/games';
import adminRoutes from './routes/admin';
import tableRoutes from './routes/tables';
import friendRoutes from './routes/friends';

dotenv.config();

const app = express();
const server = createServer(app);

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet: Secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://swiss-jass-app-production.up.railway.app", "wss://swiss-jass-app-production.up.railway.app"],
      frameSrc: ["https://www.youtube.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS: Restrict origins in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://jrudyray.github.io', 'https://swiss-jass-app-production.up.railway.app']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Strict limit for auth endpoints
  message: { success: false, message: 'Too many authentication attempts, please try again later' },
  skipSuccessfulRequests: true
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================================================
// STANDARD MIDDLEWARE
// ============================================================================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.static('public'));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error handling middleware (add at the end, before app.listen)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ... rest of existing code
```

**Update:** `backend/.env.example`
```bash
# Copy this file to .env and fill in your values

# Database
DATABASE_URL="file:./prisma/swiss_jass.db"

# JWT Secret (REQUIRED - generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Environment
NODE_ENV="development"

# Server
PORT=3000

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"
```

**IMPORTANT:** Update `backend/src/services/authService.ts`:
```typescript
// REPLACE line 7:
const JWT_SECRET = process.env.JWT_SECRET || 'swiss-jass-development-secret';

// WITH:
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Generate one with: openssl rand -base64 32');
}
```

---

## Fix #4: Optimize JassGame.tsx Re-renders

**Strategy:**
1. Split mega-component into smaller components
2. Add React.memo to prevent unnecessary re-renders
3. Use useCallback for event handlers
4. Use useMemo for expensive computations
5. Move static styles outside component

**New file:** `web/src/components/PlayerHand.tsx`
```typescript
import React, { useMemo, useCallback } from 'react';
import { SwissCard } from '../SwissCard';

interface PlayerHandProps {
  hand: any[];
  legalCards: any[];
  selectedCard: string | null;
  trump: string | null;
  onCardClick: (cardId: string) => void;
  onCardSelect: (cardId: string) => void;
  disabled?: boolean;
}

// Rank order for sorting (normal order)
const normalRankOrder = ['6','7','8','9','10','U','O','K','A'];
const trumpRankOrder = ['6','7','8','O','K','10','A','9','U'];

function sortHandForDisplay(hand: any[], trump: string | null): any[] {
  if (!hand || !hand.length) return hand;
  
  const trumpSuit = trump || null;
  const normalCards = hand.filter(c => c.suit !== trumpSuit);
  const trumpCards = hand.filter(c => c.suit === trumpSuit);
  
  normalCards.sort((a, b) => {
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return normalRankOrder.indexOf(a.rank) - normalRankOrder.indexOf(b.rank);
  });
  
  trumpCards.sort((a, b) => {
    return trumpRankOrder.indexOf(b.rank) - trumpRankOrder.indexOf(a.rank);
  });
  
  return [...normalCards, ...trumpCards];
}

export const PlayerHand = React.memo<PlayerHandProps>(({
  hand,
  legalCards,
  selectedCard,
  trump,
  onCardClick,
  onCardSelect,
  disabled = false
}) => {
  const sortedHand = useMemo(
    () => sortHandForDisplay(hand, trump),
    [hand, trump]
  );

  const handleCardClick = useCallback((cardId: string) => {
    if (!disabled) {
      const isLegal = legalCards.some(c => c.id === cardId);
      if (isLegal) {
        onCardClick(cardId);
      } else {
        onCardSelect(cardId);
      }
    }
  }, [disabled, legalCards, onCardClick, onCardSelect]);

  return (
    <div style={handContainerStyle}>
      {sortedHand.map((card) => {
        const isLegal = legalCards.some(c => c.id === card.id);
        const isSelected = card.id === selectedCard;
        
        return (
          <SwissCard
            key={card.id}
            card={card}
            onClick={() => handleCardClick(card.id)}
            playable={isLegal}
            selected={isSelected}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
});

PlayerHand.displayName = 'PlayerHand';

const handContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'center',
  padding: '12px 8px'
};
```

**New file:** `web/src/components/GameTable.tsx`
```typescript
import React from 'react';

interface GameTableProps {
  currentTrick: any[];
  showLastTrick: any[] | null;
  children?: React.ReactNode;
}

export const GameTable = React.memo<GameTableProps>(({
  currentTrick,
  showLastTrick,
  children
}) => {
  const displayTrick = showLastTrick || currentTrick;

  return (
    <div style={tableStyle}>
      <div style={trickDisplayStyle}>
        {displayTrick && displayTrick.length > 0 ? (
          displayTrick.map((card: any, idx: number) => (
            <div key={idx} style={cardSlotStyle}>
              {/* Render card */}
              <div style={miniCardStyle}>
                {card.suit} {card.rank}
              </div>
            </div>
          ))
        ) : (
          <div style={emptyTrickStyle}>No cards played</div>
        )}
      </div>
      {children}
    </div>
  );
});

GameTable.displayName = 'GameTable';

const tableStyle: React.CSSProperties = {
  padding: 14,
  background: 'rgba(25, 122, 76, 0.1)',
  borderRadius: 10,
  minHeight: 140,
  marginBottom: 12
};

const trickDisplayStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 100
};

const cardSlotStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const miniCardStyle: React.CSSProperties = {
  background: 'white',
  padding: '8px 12px',
  borderRadius: 6,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  fontSize: 14,
  fontWeight: 600
};

const emptyTrickStyle: React.CSSProperties = {
  color: '#6b7280',
  fontStyle: 'italic',
  fontSize: 14
};
```

**New file:** `web/src/hooks/useGameState.ts`
```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import * as Schieber from '../engine/schieber';

export function useGameState() {
  const [localState, setLocalState] = useState<Schieber.State | null>(null);
  const [message, setMessage] = useState<string>('');

  const saveToLocalStorage = useCallback((state: Schieber.State) => {
    try {
      localStorage.setItem('jassLocalState', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save game state:', e);
    }
  }, []);

  const loadFromLocalStorage = useCallback((): Schieber.State | null => {
    try {
      const saved = localStorage.getItem('jassLocalState');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to load game state:', e);
      return null;
    }
  }, []);

  const updateState = useCallback((newState: Schieber.State) => {
    setLocalState(newState);
    saveToLocalStorage(newState);
  }, [saveToLocalStorage]);

  return {
    localState,
    setLocalState: updateState,
    message,
    setMessage,
    loadFromLocalStorage
  };
}
```

**Partial refactor of JassGame.tsx** (show pattern, full refactor would be extensive):
```typescript
// At the top of JassGame.tsx, extract static styles:

const STATIC_STYLES = {
  container: { 
    fontFamily: '"Helvetica Neue", "Arial", sans-serif', 
    minHeight: '100vh', 
    background: '#f5f2e8', 
    paddingBottom: 40 
  },
  header: { 
    background: '#D42E2C', 
    color: 'white', 
    padding: '1rem 1rem', 
    textAlign: 'center' as const, 
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
  },
  // ... move all static styles here
} as const;

// Replace useState with useReducer for complex state:
import { useReducer, useCallback, useMemo } from 'react';

type GameAction = 
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'SET_HAND'; payload: any[] }
  | { type: 'SET_LEGAL_CARDS'; payload: any[] }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'PLAY_CARD'; cardId: string };

function gameReducer(state: any, action: GameAction) {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload };
    case 'SET_HAND':
      return { ...state, hand: action.payload };
    // ... other cases
    default:
      return state;
  }
}

// In component:
const [state, dispatch] = useReducer(gameReducer, initialState);

// Wrap callbacks:
const handlePlayCard = useCallback((cardId: string) => {
  dispatch({ type: 'PLAY_CARD', cardId });
}, []);

// Memoize expensive computations:
const sortedHand = useMemo(
  () => sortHandForDisplay(hand, gameState?.trumpSuit),
  [hand, gameState?.trumpSuit]
);
```

---

## Fix #5: Refactor schieber.ts into Pure Functions

**New file:** `web/src/engine/scoring.ts`
```typescript
import { Rank, Card, Player, TrumpContract, WeisDeclaration } from './schieber';

// Point values for non-trump
const BASE_POINTS: Record<Rank, number> = {
  '6': 0, '7': 0, '8': 0, '9': 0, '10': 10, 'U': 2, 'O': 3, 'K': 4, 'A': 11
};

// In trump, U (Unter) = 20, 9 = 14
const TRUMP_POINTS: Record<Rank, number> = {
  'U': 20, '9': 14, 'A': 11, '10': 10, 'K': 4, 'O': 3, '8': 0, '7': 0, '6': 0
};

/**
 * Pure function: Calculate points for a single card
 */
export function scoreCard(card: Card, isTrump: boolean): number {
  return isTrump ? TRUMP_POINTS[card.rank] : BASE_POINTS[card.rank];
}

/**
 * Pure function: Calculate points for a trick (4 cards)
 * @param trick - Array of 4 cards
 * @param trumpSuit - Current trump suit (null for no-trump contracts)
 * @param isLastTrick - Whether this is the last trick (9th)
 * @returns Total points for the trick
 */
export function scoreTrick(
  trick: Card[],
  trumpSuit: string | null,
  isLastTrick: boolean = false
): number {
  if (trick.length !== 4) {
    throw new Error(`scoreTrick expects exactly 4 cards, got ${trick.length}`);
  }

  let points = 0;
  for (const card of trick) {
    const isTrump = trumpSuit !== null && card.suit === trumpSuit;
    points += scoreCard(card, isTrump);
  }

  // Swiss Jass rule: +5 bonus for winning the last trick
  if (isLastTrick) {
    points += 5;
  }

  return points;
}

/**
 * Pure function: Calculate Weis points for a team
 * Returns 0 if the team doesn't have the best Weis
 * 
 * @param teamWeis - Array of all Weis declarations for players in the team
 * @param opponentBestWeis - The best Weis from the opposing team (or null)
 * @returns Total Weis points for the team (0 if opponent has better Weis)
 */
export function scoreWeis(
  teamWeis: WeisDeclaration[],
  opponentBestWeis: WeisDeclaration | null
): number {
  if (teamWeis.length === 0) return 0;

  // Find this team's best Weis
  let bestWeis = teamWeis[0];
  for (const weis of teamWeis) {
    if (isWeisBetter(weis, bestWeis)) {
      bestWeis = weis;
    }
  }

  // Compare with opponent's best
  if (opponentBestWeis !== null) {
    if (isWeisBetter(opponentBestWeis, bestWeis)) {
      // Opponent has better Weis - this team scores 0
      return 0;
    } else if (!isWeisBetter(bestWeis, opponentBestWeis)) {
      // Tie - neither team scores (Swiss rule)
      return 0;
    }
  }

  // This team has the best Weis (or no opponent Weis) - sum all their Weis
  return teamWeis.reduce((sum, weis) => sum + weis.points, 0);
}

/**
 * Pure function: Compare two Weis declarations
 * @returns true if 'a' is strictly better than 'b'
 */
export function isWeisBetter(a: WeisDeclaration, b: WeisDeclaration): boolean {
  // Higher points wins
  if (a.points !== b.points) return a.points > b.points;
  
  // Same points - check by type priority and length
  if (a.type.startsWith('sequence') && b.type.startsWith('sequence')) {
    // Longer sequence wins
    if (a.cards.length !== b.cards.length) return a.cards.length > b.cards.length;
    
    // Same length - higher top card wins
    const rankOrder = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
    const aTop = Math.max(...a.cards.map(c => rankOrder.indexOf(c.rank)));
    const bTop = Math.max(...b.cards.map(c => rankOrder.indexOf(c.rank)));
    return aTop > bTop;
  }
  
  // Equal Weis
  return false;
}

/**
 * Pure function: Apply contract multiplier to score
 * Swiss Jass authentic multipliers:
 * - Eicheln/Rosen: 1x
 * - Schellen/Schilten: 2x
 * - Oben-abe: 3x
 * - Unden-ufe: 4x
 */
export function applyMultipliers(
  score: number,
  contract: TrumpContract
): number {
  const multiplier = getContractMultiplier(contract);
  return score * multiplier;
}

export function getContractMultiplier(contract: TrumpContract): number {
  switch (contract) {
    case 'schellen':
    case 'schilten':
      return 2;
    case 'oben-abe':
      return 3;
    case 'unden-ufe':
      return 4;
    case 'eicheln':
    case 'rosen':
    default:
      return 1;
  }
}

/**
 * Pure function: Tally the final round scores
 * Combines trick points, Weis points, match bonus, and multipliers
 * 
 * @param team1TrickPoints - Raw points from tricks won by team 1
 * @param team2TrickPoints - Raw points from tricks won by team 2
 * @param team1Weis - All Weis declarations from team 1 players
 * @param team2Weis - All Weis declarations from team 2 players
 * @param contract - Trump contract for the round
 * @param matchBonusWinner - Team that won all tricks (1, 2, or null)
 * @returns Final scores for both teams
 */
export function tallyRound(params: {
  team1TrickPoints: number;
  team2TrickPoints: number;
  team1Weis: WeisDeclaration[];
  team2Weis: WeisDeclaration[];
  contract: TrumpContract;
  matchBonusWinner: 1 | 2 | null;
}): { team1: number; team2: number } {
  const {
    team1TrickPoints,
    team2TrickPoints,
    team1Weis,
    team2Weis,
    contract,
    matchBonusWinner
  } = params;

  // Find best Weis for each team
  const team1BestWeis = team1Weis.length > 0
    ? team1Weis.reduce((best, w) => isWeisBetter(w, best) ? w : best)
    : null;
  const team2BestWeis = team2Weis.length > 0
    ? team2Weis.reduce((best, w) => isWeisBetter(w, best) ? w : best)
    : null;

  // Calculate Weis scores (only winning team scores)
  const team1WeisPoints = scoreWeis(team1Weis, team2BestWeis);
  const team2WeisPoints = scoreWeis(team2Weis, team1BestWeis);

  // Add trick points and Weis points
  let team1Total = team1TrickPoints + team1WeisPoints;
  let team2Total = team2TrickPoints + team2WeisPoints;

  // Apply contract multiplier to BOTH teams (Swiss rule: all points are multiplied)
  const multiplier = getContractMultiplier(contract);
  team1Total *= multiplier;
  team2Total *= multiplier;

  // Add match bonus (100 points, also multiplied)
  const MATCH_BONUS = 100;
  if (matchBonusWinner === 1) {
    team1Total += MATCH_BONUS * multiplier;
  } else if (matchBonusWinner === 2) {
    team2Total += MATCH_BONUS * multiplier;
  }

  return { team1: team1Total, team2: team2Total };
}

/**
 * Pure function: Validate that trick points sum correctly
 * All tricks should total exactly 157 points (152 card points + 5 last trick bonus)
 */
export function validateTrickPoints(team1Points: number, team2Points: number): boolean {
  const EXPECTED_TOTAL = 157;
  const actual = team1Points + team2Points;
  
  if (actual !== EXPECTED_TOTAL) {
    console.warn(`Trick points validation failed: expected ${EXPECTED_TOTAL}, got ${actual}`);
    return false;
  }
  
  return true;
}
```

**Update schieber.ts to use pure functions:**
```typescript
// In settleHand function (line 675), replace with:
import { tallyRound, validateTrickPoints } from './scoring';

export function settleHand(state: State): State {
  const st = JSON.parse(JSON.stringify(state)) as State;

  // Gather all Weis declarations by team
  const team1Players = st.players.filter(p => p.team === 1);
  const team2Players = st.players.filter(p => p.team === 2);
  
  const team1Weis = team1Players.flatMap(p => p.weis || []);
  const team2Weis = team2Players.flatMap(p => p.weis || []);

  // Calculate raw trick points (already stored in st.scores from resolveTrick)
  const team1TrickPoints = st.scores.team1 || 0;
  const team2TrickPoints = st.scores.team2 || 0;

  // Validate trick points (should sum to 157)
  validateTrickPoints(team1TrickPoints, team2TrickPoints);

  // Determine match bonus winner (team that captured all 36 cards)
  const team1CardsWon = team1Players.reduce((sum, p) => sum + (p.tricks?.length || 0), 0);
  const team2CardsWon = team2Players.reduce((sum, p) => sum + (p.tricks?.length || 0), 0);
  const matchBonusWinner = team1CardsWon === 36 ? 1 : team2CardsWon === 36 ? 2 : null;

  // Use pure function to tally final scores
  const finalScores = tallyRound({
    team1TrickPoints,
    team2TrickPoints,
    team1Weis,
    team2Weis,
    contract: st.trump as TrumpContract,
    matchBonusWinner
  });

  st.scores.team1 = finalScores.team1;
  st.scores.team2 = finalScores.team2;

  return st;
}
```

---

Continue to next message for remaining fixes...
