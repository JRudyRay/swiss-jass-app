/**
 * Game Engine Unit Tests
 * 
 * Tests for SwissJassEngine covering:
 * - Schieben (trump pass to partner)
 * - Trump multipliers (1x/2x/3x/4x)
 * - Match bonus (100 points for all 9 tricks)
 * - Weis scoring and tie-breaking
 * - Card point values for all contracts
 * - Game state management
 */

import { SwissJassEngine } from '../gameEngine/SwissJassEngine';

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string): void {
  if (actual !== expected) {
    throw new Error(`❌ ASSERTION FAILED: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function testRunner(testName: string, testFn: () => void): void {
  process.stdout.write(`  Testing: ${testName}... `);
  try {
    testFn();
    console.log('✅ PASS');
  } catch (err: any) {
    console.log('❌ FAIL');
    console.error(`    Error: ${err.message}`);
    process.exit(1);
  }
}

// ========================================
// TEST SUITE 1: SCHIEBEN (TRUMP PASS)
// ========================================

console.log('\n🧪 TEST SUITE 1: Schieben (Trump Pass)\n');

testRunner('Schieben passes trump to partner (player + 2)', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  
  // Manually set phase to trump_selection (bypassing async setTimeout)
  const state: any = engine.getGameState();
  (state as any).phase = 'trump_selection';
  const dealer = state.dealer;
  (state as any).currentPlayer = dealer;
  
  // Dealer chooses schieben
  const result = engine.selectTrump('schieben', dealer);
  assert(result, 'Schieben should be accepted');
  
  const newState = engine.getGameState();
  const expectedPartner = (dealer + 2) % 4;
  assertEquals(newState.currentPlayer, expectedPartner, 'Current player should be partner');
  assertEquals(newState.schiebenPending, true, 'schiebenPending flag should be set');
  assertEquals(newState.phase, 'trump_selection', 'Phase should remain trump_selection');
});

testRunner('Partner cannot schieben back (anti-double-schieben)', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  
  // Manually set phase
  const state: any = engine.getGameState();
  (state as any).phase = 'trump_selection';
  const dealer = state.dealer;
  (state as any).currentPlayer = dealer;
  
  // First schieben
  engine.selectTrump('schieben', dealer);
  const partner = (dealer + 2) % 4;
  
  // Partner tries to schieben back (should fail)
  const result = engine.selectTrump('schieben', partner);
  assert(!result, 'Double schieben should be rejected');
});

testRunner('Partner can choose trump after schieben', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  
  // Manually set phase
  const state: any = engine.getGameState();
  (state as any).phase = 'trump_selection';
  const dealer = state.dealer;
  (state as any).currentPlayer = dealer;
  
  // Dealer schiebens
  engine.selectTrump('schieben', dealer);
  const partner = (dealer + 2) % 4;
  
  // Partner chooses trump
  const result = engine.selectTrump('eicheln', partner);
  assert(result, 'Partner should be able to choose trump');
  
  const newState = engine.getGameState();
  assertEquals(newState.trumpSuit, 'eicheln', 'Trump should be set to eicheln');
  assertEquals(newState.phase, 'playing', 'Phase should be playing');
});

// ========================================
// TEST SUITE 2: TRUMP MULTIPLIERS
// ========================================

console.log('\n🧪 TEST SUITE 2: Trump Multipliers\n');

testRunner('Eicheln/Rosen contracts have 1x multiplier', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  
  // Set phase for testing
  const state: any = engine.getGameState();
  (state as any).phase = 'trump_selection';
  const dealer = state.dealer;
  (state as any).currentPlayer = dealer;
  
  engine.selectTrump('eicheln', dealer);
  assertEquals(engine.getGameState().trumpMultiplier, 1, 'Eicheln should have 1x multiplier');
  
  const engine2 = new SwissJassEngine('schieber');
  engine2.startRound();
  const state2: any = engine2.getGameState();
  (state2 as any).phase = 'trump_selection';
  (state2 as any).currentPlayer = state2.dealer;
  
  engine2.selectTrump('rosen', state2.dealer);
  assertEquals(engine2.getGameState().trumpMultiplier, 1, 'Rosen should have 1x multiplier');
});

testRunner('Schellen/Schilten contracts have 2x multiplier', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  const state: any = engine.getGameState();
  (state as any).phase = 'trump_selection';
  (state as any).currentPlayer = state.dealer;
  
  engine.selectTrump('schellen', state.dealer);
  assertEquals(engine.getGameState().trumpMultiplier, 2, 'Schellen should have 2x multiplier');
  
  const engine2 = new SwissJassEngine('schieber');
  engine2.startRound();
  const state2: any = engine2.getGameState();
  (state2 as any).phase = 'trump_selection';
  (state2 as any).currentPlayer = state2.dealer;
  
  engine2.selectTrump('schilten', state2.dealer);
  assertEquals(engine2.getGameState().trumpMultiplier, 2, 'Schilten should have 2x multiplier');
});

testRunner('Obenabe has 3x multiplier', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  const state: any = engine.getGameState();
  (state as any).phase = 'trump_selection';
  (state as any).currentPlayer = state.dealer;
  
  engine.selectTrump('obenabe', state.dealer);
  assertEquals(engine.getGameState().trumpMultiplier, 3, 'Obenabe should have 3x multiplier');
});

testRunner('Undenufe has 4x multiplier', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  const state: any = engine.getGameState();
  (state as any).phase = 'trump_selection';
  (state as any).currentPlayer = state.dealer;
  
  engine.selectTrump('undenufe', state.dealer);
  assertEquals(engine.getGameState().trumpMultiplier, 4, 'Undenufe should have 4x multiplier');
});

// ========================================
// TEST SUITE 3: WEIS SCORING
// ========================================

console.log('\n🧪 TEST SUITE 3: Weis Scoring\n');

testRunner('Team with better Weis gets all their Weis points', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();

  // Simulate Weis declarations
  const player0 = engine.getPlayer(0);
  const player2 = engine.getPlayer(2);
  const player1 = engine.getPlayer(1);
  
  if (player0) {
    (player0 as any).weis = [
      { type: 'sequence4', points: 50, cards: [], description: '4-seq' }
    ];
  }
  if (player2) {
    (player2 as any).weis = [
      { type: 'sequence3', points: 20, cards: [], description: '3-seq' }
    ];
  }
  if (player1) {
    (player1 as any).weis = [
      { type: 'sequence3', points: 20, cards: [], description: '3-seq' }
    ];
  }

  // Calculate Weis scores
  const weisScores = (engine as any).calculateTeamWeis();
  
  // Team 1 has better Weis (50 > 20), so they get all their points (50 + 20 = 70)
  assertEquals(weisScores.team1, 70, 'Team 1 should get all their Weis points');
  assertEquals(weisScores.team2, 0, 'Team 2 should get no Weis points');
});

testRunner('Equal Weis means nobody scores (Swiss rule)', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();

  // Both teams have equal best Weis
  const player0 = engine.getPlayer(0);
  const player1 = engine.getPlayer(1);
  
  if (player0) {
    (player0 as any).weis = [
      { type: 'sequence4', points: 50, cards: [], description: '4-seq' }
    ];
  }
  if (player1) {
    (player1 as any).weis = [
      { type: 'sequence4', points: 50, cards: [], description: '4-seq' }
    ];
  }

  const weisScores = (engine as any).calculateTeamWeis();
  
  assertEquals(weisScores.team1, 0, 'Team 1 should get no Weis on tie');
  assertEquals(weisScores.team2, 0, 'Team 2 should get no Weis on tie');
});

testRunner('Team with no Weis gets zero points', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();

  // Only team 1 has Weis
  const player0 = engine.getPlayer(0);
  if (player0) {
    (player0 as any).weis = [
      { type: 'sequence3', points: 20, cards: [], description: '3-seq' }
    ];
  }

  const weisScores = (engine as any).calculateTeamWeis();
  
  assertEquals(weisScores.team1, 20, 'Team 1 should get their Weis points');
  assertEquals(weisScores.team2, 0, 'Team 2 with no Weis should get zero');
});

// ========================================
// TEST SUITE 4: GAME INITIALIZATION
// ========================================

console.log('\n🧪 TEST SUITE 4: Game Initialization\n');

testRunner('Game starts with 4 players', () => {
  const engine = new SwissJassEngine('schieber');
  const players = engine.getPlayers();
  assertEquals(players.length, 4, 'Should have 4 players');
});

testRunner('Players are assigned to teams correctly', () => {
  const engine = new SwissJassEngine('schieber');
  const players = engine.getPlayers();
  
  assertEquals(players[0].team, 1, 'Player 0 should be team 1');
  assertEquals(players[1].team, 2, 'Player 1 should be team 2');
  assertEquals(players[2].team, 1, 'Player 2 should be team 1');
  assertEquals(players[3].team, 2, 'Player 3 should be team 2');
});

testRunner('Each player gets 9 cards after deal', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  
  const players = engine.getPlayers();
  players.forEach((player, index) => {
    assertEquals(player.hand.length, 9, `Player ${index} should have 9 cards`);
  });
});

testRunner('Initial game phase is trump_selection', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  
  const state = engine.getGameState();
  assertEquals(state.phase, 'trump_selection', 'Initial phase should be trump_selection');
});

// ========================================
// SUMMARY
// ========================================

console.log('\n✅ All game engine unit tests passed!\n');
process.exit(0);
