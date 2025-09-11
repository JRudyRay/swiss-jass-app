import * as Schieber from '../src/engine/schieber.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function testRankOrder() {
  // Oben-abe: normal ordering, A highest
  const r1 = (Schieber as any).rankOrderIndex('A', 'oben-abe', false);
  const r2 = (Schieber as any).rankOrderIndex('6', 'oben-abe', false);
  assert(r1 < r2, 'Oben-abe: A should rank higher than 6');

  // Unden-ufe: 6 highest
  const u1 = (Schieber as any).rankOrderIndex('6', 'unden-ufe', false);
  const u2 = (Schieber as any).rankOrderIndex('A', 'unden-ufe', false);
  assert(u1 < u2, 'Unden-ufe: 6 should rank higher than A');
}

function testCompareCardsTrump() {
  const a = { id: 'a', suit: 'eicheln', rank: 'U' } as any;
  const b = { id: 'b', suit: 'eicheln', rank: '9' } as any;
  // both trump same suit
  const cmp = (Schieber as any).compareCards(a,b,'eicheln','eicheln');
  assert(cmp < 0, 'U should be stronger than 9 in trump (lower index returned)');

  const c = { id: 'c', suit: 'rosen', rank: 'A' } as any;
  // trump beats non-trump
  const cmp2 = (Schieber as any).compareCards(a,c,'eicheln','rosen');
  assert(cmp2 > 0, 'trump should be ranked higher than non-trump (compareCards returns >0 for trump)');
}

function testWeisCompare() {
  // Create two Weis declarations
  const seq3 = { type: 'sequence3', cards: [{rank:'6'} as any, {rank:'7'} as any, {rank:'8'} as any], points: 20 } as any;
  const seq4 = { type: 'sequence4', cards: [{rank:'6' } as any, {rank:'7'} as any, {rank:'8'} as any, {rank:'9'} as any], points: 50 } as any;
  const better = (Schieber as any).isWeisBetter(seq4, seq3);
  assert(better === true, 'sequence4 should be better than sequence3');
}

function testObenUndenOrdering() {
  // Oben-abe: Ace should be highest
  const ai = (Schieber as any).rankOrderIndex('A', 'oben-abe', false);
  const sixi = (Schieber as any).rankOrderIndex('6', 'oben-abe', false);
  assert(ai < sixi, 'Oben-abe: Ace should be higher than 6');

  // Unden-ufe: 6 should be highest
  const u6 = (Schieber as any).rankOrderIndex('6', 'unden-ufe', false);
  const uA = (Schieber as any).rankOrderIndex('A', 'unden-ufe', false);
  assert(u6 < uA, 'Unden-ufe: 6 should be higher than A');
}

function testWeisTieNoScore() {
  // Two equal Weis points should result in nobody scoring
  const st = Schieber.startGameLocal();
  // Set simple weis for player 0 and player 1 both equal
  st.players[0].weis = [{ type: 'sequence3', cards: [], points: 20, description: 'seq3' } as any];
  st.players[1].weis = [{ type: 'sequence3', cards: [], points: 20, description: 'seq3' } as any];
  const res = (Schieber as any).calculateTeamWeis(st.players);
  // Both teams have equal best weis -> nobody scores
  assert(res.team1 === 0 && res.team2 === 0, 'Tie Weis should award nobody points');
}

function testLegalPlayEnforcement() {
  // build a simple state where lead suit is eicheln and player has that suit and must follow
  const st = Schieber.startGameLocal();
  // craft hands so player 0 has an eicheln and another suit
  st.players[0].hand = [ { id: 'x1', suit: 'eicheln', rank: 'A' } as any, { id: 'x2', suit: 'rosen', rank: 'K' } as any ];
  st.trickLead = 'eicheln';
  st.currentTrick = [ { id: 't1', suit: 'eicheln', rank: '9', playerId: 1 } as any ];
  const legal = Schieber.getLegalCardsForPlayer(st, 0);
  assert(legal.length === 1 && legal[0].suit === 'eicheln', 'Player must follow suit when lead suit present');
}

function testDeclarerMultiplierEffect() {
  // Ensure multiplier applies only to declarer's team
  const st = Schieber.startGameLocal();
  // Clear any Weis to avoid side-effects
  for (const p of st.players) p.weis = [];
  st.scores.team1 = 50;
  st.scores.team2 = 30;
  st.trumpMultiplier = 2; // double
  // make player 0 (team1) the declarer
  st.declarer = 0;
  const settled = (Schieber as any).settleHand(st);
  // declarer team (team1) should be doubled, team2 unchanged
  assert(settled.scores.team1 === 100, 'Declarer multiplier should double declarer team score');
  assert(settled.scores.team2 === 30, 'Non-declarer team score should remain unchanged by multiplier');
}

function testMatchAllAward() {
  // Ensure match bonus is awarded and multiplied appropriately when a team takes all tricks
  const st = Schieber.startGameLocal();
  // Clear Weis and base scores
  for (const p of st.players) { p.weis = []; p.tricks = []; }
  st.scores.team1 = 0;
  st.scores.team2 = 0;
  st.trumpMultiplier = 2; // double
  // Simulate team1 captured all 36 cards
  const allCards = new Array(36).fill(0).map((_,i) => ({ id: 'c'+i, suit: 'eicheln', rank: 'A' } as any));
  // assign all to team1 players (player 0)
  st.players[0].tricks = allCards;
  st.players[2].tricks = [];
  // declarer is on team1
  st.declarer = 0;
  const settled = (Schieber as any).settleHand(st);
  // default match bonus is 100; since declarer is on capturing team and multiplier=2 => +200
  assert(settled.scores.team1 === 200, 'Match-all bonus should be applied and multiplied for declarer team');
}

function testTrumpChooserSchieben() {
  // Dealer should be initial trump chooser
  const st = Schieber.startGameLocal();
  assert(st.currentPlayer === st.dealer, 'Initial currentPlayer should be dealer who chooses trump');

  // If dealer schiebt (passes), the decision moves to partner (opposite player)
  const passed = (Schieber as any).setTrumpAndDetectWeis(st, 'schieben');
  const expectedPartner = (st.dealer + 2) % 4;
  assert(passed.currentPlayer === expectedPartner, 'After schieben currentPlayer should be partner');
  assert(passed.phase === 'trump_selection', 'After schieben we should remain in trump_selection phase');

  // Partner now chooses a real trump; declarer should be the partner, but play should start with dealer
  const final = (Schieber as any).setTrumpAndDetectWeis(passed, 'eicheln');
  assert(final.declarer === passed.currentPlayer, 'Declarer should be the player who selected trump (the partner)');
  assert(final.phase === 'playing', 'After setting trump phase should be playing');
  assert(final.currentPlayer === final.dealer, 'Play should start with the dealer even if partner declared via schieben');
}
function testTenDoesNotOutrankHighCards() {
  // Setup two cards for same suit trump scenario
  const ten = { id: 'ten', suit: 'eicheln', rank: '10' } as any;
  const ace = { id: 'ace', suit: 'eicheln', rank: 'A' } as any;
  const king = { id: 'king', suit: 'eicheln', rank: 'K' } as any;
  const ober = { id: 'ober', suit: 'eicheln', rank: 'O' } as any;
  const under = { id: 'under', suit: 'eicheln', rank: 'U' } as any;

  // In trump suit, 10 must NOT outrank A,K,O,U
  const cmpA = (Schieber as any).compareCards(ten, ace, 'eicheln', 'eicheln');
  const cmpK = (Schieber as any).compareCards(ten, king, 'eicheln', 'eicheln');
  const cmpO = (Schieber as any).compareCards(ten, ober, 'eicheln', 'eicheln');
  const cmpU = (Schieber as any).compareCards(ten, under, 'eicheln', 'eicheln');

  // compareCards returns negative when first argument is stronger; ensure TEN is weaker or equal (>=0)
  assert(cmpA >= 0, '10 should not beat Ace in trump');
  assert(cmpK >= 0, '10 should not beat King in trump');
  assert(cmpO >= 0, '10 should not beat Ober in trump');
  assert(cmpU >= 0, '10 should not beat Under in trump');

  // Non-trump same-suit comparisons: 10 should not beat A,K,O,U either
  const cmpA_nt = (Schieber as any).compareCards(ten, ace, 'rosen', 'eicheln');
  const cmpK_nt = (Schieber as any).compareCards(ten, king, 'rosen', 'eicheln');
  const cmpO_nt = (Schieber as any).compareCards(ten, ober, 'rosen', 'eicheln');
  const cmpU_nt = (Schieber as any).compareCards(ten, under, 'rosen', 'eicheln');
  assert(cmpA_nt >= 0, '10 should not beat Ace in non-trump same suit');
  assert(cmpK_nt >= 0, '10 should not beat King in non-trump same suit');
  assert(cmpO_nt >= 0, '10 should not beat Ober in non-trump same suit');
  assert(cmpU_nt >= 0, '10 should not beat Under in non-trump same suit');

}

// --- Totals persistence tests ---
function testTotalsUpdateSimple() {
  // Mock localStorage (node environment)
  const storage: Record<string,string> = {};
  (global as any).localStorage = {
    getItem: (k:string) => storage[k] ?? null,
    setItem: (k:string, v:string) => { storage[k] = v; },
    removeItem: (k:string) => { delete storage[k]; }
  } as any;

  // Minimal players and state
  const players = [ { id:0, name: 'You', team: 1 } as any, { id:1, name: 'Bot', team: 2 } as any ];
  const state = { phase: 'finished', scores: { team1: 100, team2: 50 } } as any;

  // Use the lightweight totals helper for tests
  const mod = require('../src/utils/totals') as any;
  mod.updateTotalsFromGameStateForTests(state, players, 'test-game-1');
  const totals = JSON.parse(localStorage.getItem('jassTotals') || '{}');
  if (totals['You'] !== 100) throw new Error('Expected You to have 100 pts');
  if (totals['Bot'] !== 50) throw new Error('Expected Bot to have 50 pts');
}

function testTotalsDuplicateGuard() {
  const storage: Record<string,string> = {};
  (global as any).localStorage = {
    getItem: (k:string) => storage[k] ?? null,
    setItem: (k:string, v:string) => { storage[k] = v; },
    removeItem: (k:string) => { delete storage[k]; }
  } as any;

  const players = [ { id:0, name: 'A', team: 1 } as any, { id:1, name: 'B', team: 2 } as any ];
  const state = { phase: 'finished', scores: { team1: 10, team2: 20 } } as any;
  const mod = require('../src/utils/totals') as any;
  // First update
  mod.updateTotalsFromGameStateForTests(state, players, 'dup-game-1');
  // Attempt duplicate update
  mod.updateTotalsFromGameStateForTests(state, players, 'dup-game-1');
  const totals = JSON.parse(localStorage.getItem('jassTotals') || '{}');
  if (totals['A'] !== 10) throw new Error('Duplicate guard failed: A has wrong pts');
  if (totals['B'] !== 20) throw new Error('Duplicate guard failed: B has wrong pts');
}

function runAll() {
  const tests = [testRankOrder, testCompareCardsTrump, testWeisCompare, testLegalPlayEnforcement];
  // existing extra tests
  tests.push(testObenUndenOrdering, testWeisTieNoScore);
  // newly added settlement edge-case tests
  tests.push(testDeclarerMultiplierEffect, testMatchAllAward);
  // dealer/trump chooser and schieben behavior test
  tests.push(testTrumpChooserSchieben);
  // Totals persistence tests (localStorage-mocked)
  tests.push(testTotalsUpdateSimple, testTotalsDuplicateGuard);
  let passed = 0;
  for (const t of tests) {
    try {
      t();
      console.log('PASS:', t.name);
      passed++;
    } catch (e:any) {
      console.error('FAIL:', t.name, e.message || e);
    }
  }
  console.log(`${passed}/${tests.length} tests passed`);
}

runAll();
