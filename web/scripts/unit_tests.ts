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

function runAll() {
  const tests = [testRankOrder, testCompareCardsTrump, testWeisCompare, testLegalPlayEnforcement];
  // add new tests
  tests.push(testObenUndenOrdering, testWeisTieNoScore);
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
