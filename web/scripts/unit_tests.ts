import * as Schieber from '../src/engine/schieber';


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

function testWeisTieGoesToForehandOrder() {
  // Fully equal Weis: the player earlier in play order from the forehand wins.
  const st = Schieber.startGameLocal();
  for (const p of st.players) p.weis = [];
  const seq = (suit: string) => ({ type: 'sequence3', points: 20, description: 'seq3',
    cards: ['6','7','8'].map(r => ({ id: suit+r, suit, rank: r })) } as any);
  st.players[1].weis = [seq('rosen')];
  st.players[2].weis = [seq('schellen')];
  const res = (Schieber as any).calculateTeamWeis(st.players, 'eicheln', 2);
  assert(res.team1 === 20 && res.team2 === 0, 'Forehand (player 2, team 1) should win the tie');
  const res2 = (Schieber as any).calculateTeamWeis(st.players, 'eicheln', 1);
  assert(res2.team2 === 20 && res2.team1 === 0, 'Forehand (player 1, team 2) should win the tie');
  // Trump sequence beats an equal non-trump sequence regardless of seat.
  const res3 = (Schieber as any).calculateTeamWeis(st.players, 'rosen', 2);
  assert(res3.team2 === 20 && res3.team1 === 0, 'Trump sequence should win an equal tie');
}

function testWeisWinnerScoresAll() {
  // The team with the best Weis scores all its Weis, including the partner's.
  const st = Schieber.startGameLocal();
  for (const p of st.players) p.weis = [];
  st.players[0].weis = [{ type: 'sequence4', points: 50, description: '', cards: [] } as any];
  st.players[2].weis = [{ type: 'sequence3', points: 20, description: '', cards: [] } as any];
  st.players[1].weis = [{ type: 'sequence3', points: 20, description: '', cards: [] } as any];
  const res = (Schieber as any).calculateTeamWeis(st.players, 'eicheln', 0);
  assert(res.team1 === 70 && res.team2 === 0, `Expected 70/0, got ${res.team1}/${res.team2}`);
}

function testWeisSequenceTieBreaks() {
  const mk = (ranks: string[], suit = 'rosen') => ({ type: 'sequence'+ranks.length, points: 20, description: '',
    cards: ranks.map(r => ({ id: suit+r, suit, rank: r })) } as any);
  const low = mk(['6','7','8']);
  const high = mk(['9','10','U']);
  assert(Schieber.isWeisBetter(high, low, 'eicheln'), 'Higher sequence should win');
  assert(Schieber.isWeisBetter(low, high, 'unden-ufe'), 'Lower sequence should win in Undenufe');
}

function testNoFourSixesSevensEights() {
  const hand = (['eicheln','schellen','rosen','schilten'] as const).map(s => ({ id: s+'7', suit: s, rank: '7' } as any));
  const w = Schieber.detectWeis(hand, 'eicheln');
  assert(w.length === 0, 'Four 7s should not be a Weis');
  const unders = (['eicheln','schellen','rosen','schilten'] as const).map(s => ({ id: s+'U', suit: s, rank: 'U' } as any));
  const wu = Schieber.detectWeis(unders, 'eicheln');
  assert(wu.length === 1 && wu[0].points === 200, 'Four Unders should be 200');
}

function legalState(hand: [string, string][], trick: [string, string][], trump: string) {
  const st = Schieber.startGameLocal();
  st.trump = trump as any;
  st.players[0].hand = hand.map(([suit, rank]) => ({ id: suit+rank, suit, rank } as any));
  st.currentTrick = trick.map(([suit, rank], i) => ({ id: 't'+suit+rank, suit, rank, playerId: i + 1 } as any));
  st.trickLead = (trick[0]?.[0] as any) || null;
  return st;
}
const ids = (cards: any[]) => cards.map(c => c.id).sort().join(',');

function testTrumpAllowedWhenFollowing() {
  // Holding the lead suit, you may still play a trump instead.
  const st = legalState([['rosen','K'],['eicheln','6'],['schellen','A']], [['rosen','9']], 'eicheln');
  assert(ids(Schieber.getLegalCardsForPlayer(st, 0)) === 'eicheln6,rosenK', 'Should allow following suit or trumping');
}

function testNoForcedTrump() {
  // Void in the lead suit: any card, trumping is optional.
  const st = legalState([['eicheln','6'],['schellen','A']], [['rosen','9']], 'eicheln');
  assert(Schieber.getLegalCardsForPlayer(st, 0).length === 2, 'Void in lead suit: any card is legal');
}

function testNoUndertrumping() {
  // A trump lower than one already in the trick may not be played...
  const st = legalState([['eicheln','6'],['schellen','A']], [['rosen','9'],['eicheln','A']], 'eicheln');
  assert(ids(Schieber.getLegalCardsForPlayer(st, 0)) === 'schellenA', 'Undertrumping should not be allowed');
  // ...unless you hold nothing else.
  const st2 = legalState([['eicheln','6'],['eicheln','7']], [['rosen','9'],['eicheln','A']], 'eicheln');
  assert(Schieber.getLegalCardsForPlayer(st2, 0).length === 2, 'Only trumps left: undertrumping is allowed');
  const st2b = legalState([['eicheln','U'],['eicheln','7']], [['rosen','9'],['eicheln','A']], 'eicheln');
  assert(Schieber.getLegalCardsForPlayer(st2b, 0).length === 2, 'Only trumps left, one higher: the lower trump is allowed too');
  // Overtrumping is fine.
  const st3 = legalState([['eicheln','9'],['schellen','A']], [['rosen','9'],['eicheln','A']], 'eicheln');
  assert(Schieber.getLegalCardsForPlayer(st3, 0).length === 2, 'Overtrumping should be allowed');
}

function testPuurException() {
  // Trump led and your only trump is the Puur: you need not play it.
  const st = legalState([['eicheln','U'],['schellen','A']], [['eicheln','9']], 'eicheln');
  assert(Schieber.getLegalCardsForPlayer(st, 0).length === 2, 'Bare Puur need not follow trump');
  const st2 = legalState([['eicheln','U'],['eicheln','6'],['schellen','A']], [['eicheln','9']], 'eicheln');
  assert(ids(Schieber.getLegalCardsForPlayer(st2, 0)) === 'eicheln6,eichelnU', 'With other trumps you must follow trump');
}

function testContractTotals157() {
  const deck = Schieber.createDeck();
  for (const c of ['eicheln','oben-abe','unden-ufe'] as const) {
    const sum = deck.reduce((s, card) => s + Schieber.cardPoints(card, c), 0);
    assert(sum === 152, `${c}: card points should sum to 152 (157 with last trick), got ${sum}`);
  }
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
  // The contract multiplier applies to both teams (standard Schieber)
  const st = Schieber.startGameLocal();
  for (const p of st.players) p.weis = [];
  st.scores.team1 = 50;
  st.scores.team2 = 30;
  st.trumpMultiplier = 2;
  st.declarer = 0;
  const settled = (Schieber as any).settleHand(st);
  assert(settled.scores.team1 === 100, 'Multiplier should double team 1');
  assert(settled.scores.team2 === 60, 'Multiplier should double team 2 as well');
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
  // The forehand (right of the dealer) chooses trump
  const st = Schieber.startGameLocal();
  assert(st.currentPlayer === st.forehand, 'Initial currentPlayer should be the forehand');
  assert(st.forehand === (st.dealer - 1 + 4) % 4, 'Forehand sits right of the dealer');

  // Schieben passes the choice to the forehand's partner
  const passed = (Schieber as any).setTrumpAndDetectWeis(st, 'schieben');
  assert(passed.currentPlayer === (st.forehand! + 2) % 4, 'After schieben currentPlayer should be the partner');
  assert(passed.phase === 'trump_selection', 'After schieben we should remain in trump_selection phase');

  // The partner chooses; the forehand still leads
  const final = (Schieber as any).setTrumpAndDetectWeis(passed, 'eicheln');
  assert(final.declarer === passed.currentPlayer, 'Declarer should be the partner who chose');
  assert(final.phase === 'playing', 'After setting trump phase should be playing');
  assert(final.currentPlayer === st.forehand, 'The forehand leads even after schieben');
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

function testBotNamesKeptAcrossHands() {
  for (let k = 0; k < 50; k++) {
    const bots = Schieber.pickBotNames();
    assert(bots.length === 3 && new Set(bots).size === 3, 'Three distinct bot names');
    assert(bots.every(n => n.endsWith(' (bot)')), 'Bot names are marked as bots');
  }
  const st = Schieber.startGameLocal(undefined, ['Urs (bot)', 'Vreni (bot)', 'Gian (bot)']);
  const names = st.players.map(p => p.name);
  assert(names.join() === 'You,Urs (bot),Vreni (bot),Gian (bot)', 'Chosen bot names are used');
  const next = Schieber.startNewHand(st);
  assert(next.players.map(p => p.name).join() === names.join(), 'Names stay the same for the next hand');
}

function runAll() {
  const tests = [testRankOrder, testCompareCardsTrump, testWeisCompare, testLegalPlayEnforcement];
  tests.push(testBotNamesKeptAcrossHands);
  // existing extra tests
  tests.push(testObenUndenOrdering, testWeisTieGoesToForehandOrder, testWeisWinnerScoresAll, testWeisSequenceTieBreaks, testNoFourSixesSevensEights);
  // standard Schieber legal-play rules and contract points
  tests.push(testTrumpAllowedWhenFollowing, testNoForcedTrump, testNoUndertrumping, testPuurException, testContractTotals157);
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
  if (passed !== tests.length) process.exitCode = 1;
}

runAll();
