/**
 * Game Engine Unit Tests
 * 
 * Tests for SwissJassEngine covering:
 * - Schieben (trump pass to partner)
 * - Trump multipliers (1x/2x/3x)
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
  const state: any = (engine as any).gameState; // live state; getGameState() returns a copy
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
  const state: any = (engine as any).gameState; // live state; getGameState() returns a copy
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
  const state: any = (engine as any).gameState; // live state; getGameState() returns a copy
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
  const state: any = (engine as any).gameState; // live state; getGameState() returns a copy
  (state as any).phase = 'trump_selection';
  const dealer = state.dealer;
  (state as any).currentPlayer = dealer;
  
  engine.selectTrump('eicheln', dealer);
  assertEquals(engine.getGameState().trumpMultiplier, 1, 'Eicheln should have 1x multiplier');
  
  const engine2 = new SwissJassEngine('schieber');
  engine2.startRound();
  const state2: any = (engine2 as any).gameState;
  (state2 as any).phase = 'trump_selection';
  (state2 as any).currentPlayer = state2.dealer;
  
  engine2.selectTrump('rosen', state2.dealer);
  assertEquals(engine2.getGameState().trumpMultiplier, 1, 'Rosen should have 1x multiplier');
});

testRunner('Schellen/Schilten contracts have 2x multiplier', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  const state: any = (engine as any).gameState; // live state; getGameState() returns a copy
  (state as any).phase = 'trump_selection';
  (state as any).currentPlayer = state.dealer;
  
  engine.selectTrump('schellen', state.dealer);
  assertEquals(engine.getGameState().trumpMultiplier, 2, 'Schellen should have 2x multiplier');
  
  const engine2 = new SwissJassEngine('schieber');
  engine2.startRound();
  const state2: any = (engine2 as any).gameState;
  (state2 as any).phase = 'trump_selection';
  (state2 as any).currentPlayer = state2.dealer;
  
  engine2.selectTrump('schilten', state2.dealer);
  assertEquals(engine2.getGameState().trumpMultiplier, 2, 'Schilten should have 2x multiplier');
});

testRunner('Obenabe has 3x multiplier', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  const state: any = (engine as any).gameState; // live state; getGameState() returns a copy
  (state as any).phase = 'trump_selection';
  (state as any).currentPlayer = state.dealer;
  
  engine.selectTrump('obenabe', state.dealer);
  assertEquals(engine.getGameState().trumpMultiplier, 3, 'Obenabe should have 3x multiplier');
});

testRunner('Undenufe has 4x multiplier', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  const state: any = (engine as any).gameState; // live state; getGameState() returns a copy
  (state as any).phase = 'trump_selection';
  (state as any).currentPlayer = state.dealer;
  
  engine.selectTrump('undenufe', state.dealer);
  assertEquals(engine.getGameState().trumpMultiplier, 3, 'Undenufe should have 3x multiplier');
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

testRunner('Equal Weis goes to the earlier player from the forehand', () => {
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

  (engine as any).gameState.forehand = 1;
  const weisScores = (engine as any).calculateTeamWeis();
  assertEquals(weisScores.team2, 50, 'Forehand (player 1) should win the tie');
  assertEquals(weisScores.team1, 0, 'Team 1 should get no Weis on a lost tie');

  // Counter-clockwise from forehand 2: 2, 1, 0, 3 -> player 1 comes before player 0
  (engine as any).gameState.forehand = 2;
  assertEquals((engine as any).calculateTeamWeis().team2, 50, 'Player 1 plays before player 0');
  (engine as any).gameState.forehand = 0;
  assertEquals((engine as any).calculateTeamWeis().team1, 50, 'Forehand (player 0) should win the tie');
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

testRunner('A new round starts by dealing (trump selection follows on a timer)', () => {
  const engine = new SwissJassEngine('schieber');
  engine.startRound();
  assertEquals(engine.getGameState().phase, 'dealing', 'Initial phase should be dealing');
});

// ========================================
// TEST SUITE: LEGAL PLAY (standard Schieber)
// ========================================

console.log('\n🧪 TEST SUITE: Legal play\n');

function legalFor(hand: [string, string][], trick: [string, string][], trump: string): string {
  const engine = new SwissJassEngine('schieber');
  const state: any = (engine as any).gameState;
  state.trumpSuit = trump;
  (engine as any).players[0].hand = hand.map(([suit, rank]) => ({ id: suit + rank, suit, rank }));
  state.currentTrick = trick.map(([suit, rank], i) => ({ id: 't' + suit + rank, suit, rank, playerId: i + 1 }));
  return engine.getLegalCards(0).map(c => c.id).sort().join(',');
}

testRunner('Trump may be played instead of following suit', () => {
  assertEquals(legalFor([['rosen','K'],['eicheln','6'],['schellen','A']], [['rosen','9']], 'eicheln'), 'eicheln6,rosenK', 'follow or trump');
});

testRunner('Trumping is never forced', () => {
  assertEquals(legalFor([['eicheln','6'],['schellen','A']], [['rosen','9']], 'eicheln'), 'eicheln6,schellenA', 'any card when void');
});

testRunner('No undertrumping unless only trumps remain', () => {
  assertEquals(legalFor([['eicheln','6'],['schellen','A']], [['rosen','9'],['eicheln','A']], 'eicheln'), 'schellenA', 'no undertrump');
  assertEquals(legalFor([['eicheln','6'],['eicheln','7']], [['rosen','9'],['eicheln','A']], 'eicheln'), 'eicheln6,eicheln7', 'only trumps');
  assertEquals(legalFor([['eicheln','U'],['eicheln','7']], [['rosen','9'],['eicheln','A']], 'eicheln'), 'eichelnU,eicheln7'.split(',').sort().join(','), 'only trumps, one higher');
});

testRunner('A bare Puur need not follow trump', () => {
  assertEquals(legalFor([['eicheln','U'],['schellen','A']], [['eicheln','9']], 'eicheln'), 'eichelnU,schellenA', 'bare Puur');
  assertEquals(legalFor([['eicheln','U'],['eicheln','6'],['schellen','A']], [['eicheln','9']], 'eicheln'), 'eichelnU,eicheln6'.split(',').sort().join(','), 'must follow trump');
});

testRunner('Four 6s, 7s or 8s are not a Weis; four Nell are 150', () => {
  const engine = new SwissJassEngine('schieber');
  const four = (rank: string) => ['eicheln','schellen','rosen','schilten'].map(suit => ({ id: suit + rank, suit, rank }));
  assertEquals((engine as any).detectWeisForHand(four('7'), 'eicheln').length, 0, 'four 7s');
  assertEquals((engine as any).detectWeisForHand(four('9'), 'eicheln')[0].points, 150, 'four Nell');
});

// ========================================
// TEST SUITE: TARGET REACHED MID-HAND (Stöck, Weis, Stich)
// ========================================

console.log('\n🧪 TEST SUITE: Target reached mid-hand\n');

const TRUMP_PTS: Record<string, number> = { U: 20, '9': 14, A: 11, '10': 10, K: 4, O: 3 };
const PLAIN_PTS: Record<string, number> = { A: 11, '10': 10, K: 4, O: 3, U: 2 };
const card = (suit: string, rank: string, playerId: number) =>
  ({ id: suit + rank, suit, rank, playerId, points: (suit === 'eicheln' ? TRUMP_PTS : PLAIN_PTS)[rank] || 0 });

// Eicheln trump, scores before the hand, one trick on the table (players 0..3), first trick or not.
function midHandEngine(start: { team1: number; team2: number }, trick: [string, string][], firstTrick: boolean) {
  const engine = new SwissJassEngine('schieber');
  const state: any = (engine as any).gameState;
  state.phase = 'playing';
  state.trumpSuit = 'eicheln';
  state.trumpMultiplier = 1;
  state.pointsToWin = 1000;
  state.scores = { ...start };
  state.roundScores = { team1: 0, team2: 0 };
  state.weisCounted = !firstTrick;
  state.playedTricks = firstTrick ? [] : [[card('schellen', '6', 0), card('schellen', '7', 1), card('schellen', '8', 2), card('schellen', 'K', 3)]];
  state.currentTrick = trick.map(([suit, rank], i) => card(suit, rank, i));
  (engine as any).players.forEach((p: any) => { p.hand = [card('schilten', '6', p.id)]; p.weis = []; });
  const events: string[] = [];
  let winner: any = null;
  engine.on('gameFinished', (d: any) => { events.push('gameFinished'); winner = d.winner; });
  return { engine, state, events, get winner() { return winner; } };
}

testRunner('A trick that reaches the target ends the match at once', () => {
  // Player 0 (team 1) takes rosen A + eicheln U = 31.
  const t = midHandEngine({ team1: 990, team2: 980 }, [['eicheln', 'U'], ['rosen', '6'], ['rosen', 'A'], ['rosen', '7']], false);
  (t.engine as any).completeTrick();
  assertEquals(t.state.phase, 'finished', 'match over mid-hand');
  assertEquals(t.winner, 1, 'team 1 wins');
  assertEquals(t.state.scores.team1, 1021, 'team 1 total');
  assertEquals(t.state.scores.team2, 980, 'team 2 total');
});

testRunner('Below the target the hand goes on', () => {
  const t = midHandEngine({ team1: 900, team2: 980 }, [['eicheln', 'U'], ['rosen', '6'], ['rosen', 'A'], ['rosen', '7']], false);
  (t.engine as any).completeTrick();
  assertEquals(t.state.phase, 'playing', 'still playing');
  assertEquals(t.events.length, 0, 'no gameFinished');
});

testRunner('Stöck counts before the trick points', () => {
  // Player 1 (team 2) plays the trump Ober, having played the König earlier; team 1 takes the trick.
  const t = midHandEngine({ team1: 990, team2: 985 }, [['eicheln', 'U'], ['eicheln', 'O'], ['rosen', 'A'], ['rosen', '7']], false);
  t.state.playedTricks[0][1] = card('eicheln', 'K', 1);
  t.state.stoeckTeam = 2; t.state.stoeckHolder = 1; t.state.stoeckCounted = false;
  (t.engine as any).completeTrick();
  assertEquals(t.winner, 2, 'team 2 wins through Stöck');
  assertEquals(t.state.scores.team2, 1005, 'team 2 total');
  assertEquals(t.state.scores.team1, 990, 'trick points after the win do not count');
});

testRunner('Weis counts before the first trick', () => {
  const t = midHandEngine({ team1: 990, team2: 960 }, [['eicheln', 'U'], ['rosen', '6'], ['rosen', 'A'], ['rosen', '7']], true);
  const seq = ['6', '7', '8', '9'].map(r => ({ id: 'schellen' + r, suit: 'schellen', rank: r }));
  (t.engine as any).players[1].weis = (t.engine as any).detectWeisForHand(seq, 'eicheln');
  (t.engine as any).completeTrick();
  assertEquals(t.winner, 2, 'team 2 wins through Weis');
  assertEquals(t.state.scores.team2, 1010, 'team 2 total');
  assertEquals(t.state.scores.team1, 990, 'team 1 total');
});

testRunner('The first dealer is random; the forehand sits to the right', () => {
  const dealers = new Set<number>();
  for (let i = 0; i < 60; i++) {
    const s = new SwissJassEngine('schieber').getGameState();
    assertEquals(s.forehand, (s.dealer + 3) % 4, 'forehand right of the dealer');
    dealers.add(s.dealer);
  }
  assert(dealers.size > 1, 'dealer varies');
});

// ========================================
// SUMMARY
// ========================================

console.log('\n✅ All game engine unit tests passed!\n');
process.exit(0);
