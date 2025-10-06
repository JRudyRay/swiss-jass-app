# 🧪 Testing Guide - Swiss Jass App

This document outlines the testing strategy, test coverage, and how to run tests for the Swiss Jass application.

## 📋 Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Coverage Goals](#test-coverage-goals)
- [Running Tests](#running-tests)
- [Test Suites](#test-suites)
- [What's Tested](#whats-tested)
- [Known Gaps & Limitations](#known-gaps--limitations)
- [CI/CD Integration](#cicd-integration)

---

## 🎯 Testing Philosophy

Our testing approach prioritizes:

1. **Correctness of Swiss Jass Rules** - Ensuring authentic gameplay
2. **Data Integrity** - Rankings and stats are accurate and fair
3. **Server-Side Validation** - Multiplayer security and anti-cheat
4. **Regression Prevention** - Critical bugs don't come back

We follow a **pragmatic testing pyramid**:
- **Few E2E Tests** (slow, brittle, but valuable for critical flows)
- **Some Integration Tests** (medium speed, test component interactions)
- **Many Unit Tests** (fast, test individual functions and rules)

---

## 📊 Test Coverage Goals

| Area | Target Coverage | Current Status | Priority |
|------|----------------|----------------|----------|
| **Game Engine** | 80%+ | 🟡 Partial | 🔴 High |
| **Scoring Logic** | 90%+ | 🟡 Partial | 🔴 High |
| **Authentication** | 70%+ | 🟢 Good | 🟡 Medium |
| **Rankings/Stats** | 85%+ | 🟢 Good | 🔴 High |
| **Multiplayer Validation** | 75%+ | 🟡 Partial | 🔴 High |
| **Database Operations** | 60%+ | 🟢 Good | 🟡 Medium |

**Legend**: 🟢 Good (>70%) | 🟡 Partial (40-70%) | 🔴 Needs Work (<40%)

---

## 🚀 Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run specific test suites
npm run test:engine          # Game engine tests
npm run test:stats           # Rankings/stats tests
npm run test:integration     # Multiplayer integration tests

# Run existing smoke tests
npm run smoke                # Friend & table creation
npm run multi                # Multiplayer flow test
npm run reset:smoke          # Reset DB + smoke test
```

### Frontend Tests

```bash
cd web

# Run unit tests (if configured)
npm test

# Run bundled tests
npm run build:tests
node dist_scripts/unit_tests.bundle.cjs
```

### Manual Testing

```bash
# Start backend in development mode
cd backend
npm run dev

# In another terminal, start frontend
cd web
npm run dev

# Open browser to http://localhost:5173
# Test multiplayer with multiple browser tabs/windows
```

---

## 🧪 Test Suites

### 1. **Game Engine Tests** (`backend/src/tests/gameEngine.test.ts`)

Tests core Swiss Jass gameplay logic:

#### Schieben (Trump Pass)
- ✅ Schieben passes trump to partner (player + 2)
- ✅ Partner cannot schieben back (anti-double-schieben)
- ✅ Partner can choose trump after receiving schieben

#### Trump Multipliers
- ✅ Eicheln/Rosen: 1x multiplier
- ✅ Schellen/Schilten: 2x multiplier
- ✅ Obenabe: 3x multiplier
- ✅ Undenufe: 4x multiplier

#### Weis Scoring
- ✅ Team with better Weis gets all their Weis points
- ✅ Equal Weis means nobody scores (Swiss rule)
- ✅ Team with no Weis gets zero points

#### Game Initialization
- ✅ Game starts with 4 players
- ✅ Players assigned to teams correctly (1-2-1-2)
- ✅ Each player gets 9 cards after deal
- ✅ Initial phase is trump_selection

**Run**: `npx ts-node backend/src/tests/gameEngine.test.ts`

---

### 2. **Rankings & Stats Tests** (`backend/scripts/test-stats-update.ts`)

Tests the critical ranking system to ensure fairness:

#### Bot Exclusion
- ✅ Bot players excluded from all stats updates
- ✅ Mixed games (bots + humans) only update real players
- ✅ All-bot games skip stats entirely

#### Multiplayer Guard
- ✅ Offline games never update rankings
- ✅ Only `isMultiplayer = true` games affect stats
- ✅ `gameMode` field correctly set

#### TrueSkill Updates
- ✅ Winners gain rating (µ increases)
- ✅ Losers lose rating (µ decreases)
- ✅ Total games/wins counters increment correctly
- ✅ No updates when filters prevent them

**Run**: `npx tsx backend/scripts/test-stats-update.ts`

**Sample Output**:
```
Test 1: Offline game (isMultiplayer=false)
Expected: Skip stats update
Result: ✅ Stats unchanged (no update)

Test 2: Multiplayer game (isMultiplayer=true)
Expected: Update stats for all players
Result: ✅ Updated stats for 2 players (multiplayer game)
  Alice: 2 games, 2 wins, µ=26.1
  Bob: 2 games, 0 wins, µ=23.9

Test 3: Mixed bot team (Team A has bot, Team B human)
Expected: Skip update (team has bot)
Result: ✅ Stats unchanged (team has bot player)

✅ All tests complete!
```

---

### 3. **Integration Tests**

#### Friends & Tables (`backend/src/tests/friendAndTable.test.ts`)
- ✅ User registration
- ✅ Friend requests (send/accept/reject)
- ✅ Game table creation
- ✅ Player joining tables
- ✅ Table password protection

**Run**: `npm run smoke` (from backend/)

#### Multiplayer Flow (`backend/src/tests/multiplayerFlow.test.ts`)
- ✅ Two players create and join table
- ✅ Table status transitions (WAITING → IN_PROGRESS)
- ✅ Ready state management
- ✅ Game state initialization

**Run**: `npm run multi` (from backend/)

#### API Endpoints (`backend/src/tests/reportStats.test.ts`)
- ✅ User registration via `/api/auth/register`
- ✅ Match reporting via `/api/games/report`
- ✅ Stats verification in database

**Run**: `npx ts-node backend/src/tests/reportStats.test.ts`

---

## ✅ What's Tested

### Game Rules ✅
- [x] Schieben (trump pass to partner)
- [x] Anti-double-schieben guard
- [x] Trump multipliers (1x/2x/3x/4x)
- [x] Weis scoring (best team wins all)
- [x] Weis tie-breaking (equal = nobody scores)
- [x] Card dealing (9 cards per player)
- [x] Team assignment (alternating 1-2-1-2)

### Scoring System ✅
- [x] Trump multipliers applied to final scores
- [x] Match bonus (100 points for all 9 tricks)
- [x] Weis points added before multiplier
- [x] Round total = 157 + 5 (last trick bonus)

### Rankings & Stats ✅
- [x] Offline games never update rankings
- [x] Bot players excluded from all stats
- [x] Multiplayer-only stat tracking
- [x] TrueSkill rating calculations
- [x] Win/loss counters
- [x] Database migration reproducibility

### Multiplayer ✅
- [x] User authentication (JWT)
- [x] Table creation/joining
- [x] Player ready states
- [x] Game state synchronization

---

## ⚠️ Known Gaps & Limitations

### Not Yet Tested
- [ ] **Card legality validation** - Follow suit rules enforcement
- [ ] **Turn order validation** - Server-side turn enforcement
- [ ] **Reconnection handling** - Player disconnect/rejoin
- [ ] **Weis comparison logic** - Edge cases in tie-breaking
- [ ] **Stöck timing** - King+Queen bonus declaration
- [ ] **Match bonus detection** - Verify all 36 cards counted correctly
- [ ] **Frontend unit tests** - Client-side game engine
- [ ] **E2E tests** - Full game flow from start to finish

### Known Issues
1. **Async Phase Changes**: Game engine uses `setTimeout` for phase transitions, making unit tests difficult without mocking time
2. **Private Methods**: Some critical methods (e.g., `calculateTeamWeis`) are private, limiting testability
3. **Test Isolation**: Some integration tests require clean database state
4. **Bot Behavior**: Bot AI decision-making not extensively tested

### Future Improvements
- [ ] Add test-only synchronous mode to game engine
- [ ] Mock timers for phase transition tests
- [ ] Expose test hooks for private methods
- [ ] Add Playwright E2E tests for critical flows
- [ ] Implement test fixtures for common scenarios
- [ ] Add performance benchmarks

---

## 🔄 CI/CD Integration

### GitHub Actions Workflows

#### **Test Pipeline** (`.github/workflows/test.yml`)

*Status*: 🟡 Partially Implemented

```yaml
name: Tests
on: [push, pull_request]
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm ci
      - run: cd backend && npm test
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd web && npm ci
      - run: cd web && npm test
```

#### **Deployment Validation**

Current workflow validates:
- ✅ Backend builds successfully
- ✅ Frontend builds successfully
- ✅ No TypeScript errors
- ⚠️ Tests run before deployment (TODO)

#### **Pre-Deployment Checks**

Before deploying to production:
1. Run `npm run reset:smoke` - Reset DB and verify clean state
2. Run all test suites
3. Manual smoke test of critical flows
4. Check for compile errors

---

## 🎯 Testing Best Practices

### When Adding New Features
1. **Write test first** (TDD approach for critical logic)
2. **Test happy path** (normal expected behavior)
3. **Test edge cases** (boundary conditions, invalid inputs)
4. **Test error handling** (what happens when things go wrong)

### Test Organization
- **One test file per module** (e.g., `gameEngine.test.ts`, `scoring.test.ts`)
- **Descriptive test names** (explain what's being tested and expected outcome)
- **Arrange-Act-Assert** pattern (setup, execute, verify)
- **Minimal test dependencies** (each test should be independent)

### Manual Testing Checklist

When testing multiplayer features:
- [ ] Open 2+ browser windows
- [ ] Register different users
- [ ] Create and join table
- [ ] Play full game to completion
- [ ] Verify rankings update correctly
- [ ] Check browser console for errors
- [ ] Test reconnection (close/reopen tab)

---

## 📚 Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs/
- **TrueSkill Algorithm**: https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/
- **Swiss Jass Rules**: https://www.swisslos.ch/de/jass/home.html
- **TypeScript Testing**: https://www.typescriptlang.org/docs/handbook/testing.html

---

## 🤝 Contributing to Tests

We welcome test contributions! Priority areas:

1. **Card Legality Tests** - Verify follow-suit rules
2. **Turn Order Tests** - Ensure proper turn enforcement
3. **Weis Edge Cases** - Test all Weis comparison scenarios
4. **E2E Tests** - Full game flows with Playwright
5. **Performance Tests** - Benchmark critical operations

See [CONTRIBUTING.md](../CONTRIBUTING.md) for more details.

---

**Last Updated**: October 4, 2025  
**Test Coverage**: ~65% (estimated)  
**Status**: 🟡 Actively Improving
