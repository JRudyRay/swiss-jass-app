import * as Schieber from '../src/engine/schieber';
import { CONTRACTS } from '../src/engine/schieber';
import { Sim, cardInt, contractInt, team } from '../src/engine/fastsim';
import {
  chooseStrong,
  mulberry32,
  replayView,
  sampleDeal,
  viewOf,
  type PublicView,
} from '../src/engine/strongBot';

// Tests of the strong bot: its simulator against the engine, its card dealing, and that it only
// uses what a player at its seat can know.

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const rand = mulberry32(12345);
const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)];

function dealt(contract: Schieber.TrumpContract): Schieber.State {
  const st = Schieber.startGameLocal(undefined, undefined, undefined, rand);
  return Schieber.setTrumpAndDetectWeis(st, contract);
}

const key = (c: { suit: string; rank: string }) => c.suit + c.rank;

// Plays `n` random legal cards (resolving complete tricks).
function playRandom(st: Schieber.State, n: number): Schieber.State {
  for (let i = 0; i < n && st.phase === 'playing'; i++) {
    const p = st.currentPlayer;
    st = Schieber.playCardLocal(st, p, pick(Schieber.getLegalCardsForPlayer(st, p)).id);
    if (st.pendingResolve) st = Schieber.resolveTrick(st);
  }
  return st;
}

// 1. The simulator agrees with the engine on every legal-card set, every trick winner and the card
// points of every hand, over random playouts of all six contracts. The first FULL playouts go
// through the engine's own play and resolve; the rest only move the cards (the engine's play
// clones the whole state each card, too slow for 10,000 hands in the check) and still ask the
// engine for the legal cards, the trick winner and the card points.
const PLAYOUTS = 10000,
  FULL = 1000;
function moveCard(st: Schieber.State, p: number, c: Schieber.Card) {
  const pl = st.players[p];
  pl.hand = pl.hand.filter((x) => x.id !== c.id);
  if (st.currentTrick.length === 0) st.trickLead = c.suit;
  st.currentTrick.push({ ...c, playerId: p });
  st.currentPlayer = (p + 3) % 4;
  if (st.currentTrick.length === 4) st.pendingResolve = true;
}
function collectTrick(st: Schieber.State) {
  const w = Schieber.peekTrickWinner(st)!;
  st.players[w].tricks.push(...st.currentTrick);
  st.currentTrick = [];
  st.trickLead = null;
  st.pendingResolve = false;
  st.currentPlayer = w;
  if (st.players.every((q) => q.hand.length === 0)) st.phase = 'scoring';
}
function testSimMatchesEngine() {
  const totals = [0, 0];
  for (let g = 0; g < PLAYOUTS; g++) {
    const contract = CONTRACTS[g % 6];
    let st = dealt(contract);
    const fast = g >= FULL;
    assert(
      st.players.every((p, i) => p.id === i),
      'players by seat',
    );
    const sim = new Sim(contractInt(contract));
    for (const p of st.players)
      for (const c of p.hand) sim.h[p.id * 4 + ((cardInt(c) / 9) | 0)] |= 1 << (cardInt(c) % 9);
    sim.turn = st.currentPlayer;
    while (st.phase === 'playing') {
      const p = st.currentPlayer;
      assert(sim.turn === p, `game ${g}: sim turn ${sim.turn}, engine ${p}`);
      const legal = Schieber.getLegalCardsForPlayer(st, p);
      const L = sim.computeLegal();
      const fromSim: string[] = [];
      for (let c = 0; c < 36; c++) if (L[(c / 9) | 0] & (1 << (c % 9))) fromSim.push(String(c));
      const fromEngine = legal.map((c) => String(cardInt(c))).sort((a, b) => +a - +b);
      assert(
        fromSim.join() === fromEngine.join(),
        `game ${g} ${contract}: legal ${fromSim} vs engine ${fromEngine}`,
      );
      const c = pick(legal);
      if (fast) moveCard(st, p, c);
      else st = Schieber.playCardLocal(st, p, c.id);
      sim.play(cardInt(c));
      if (st.pendingResolve) {
        const w = Schieber.peekTrickWinner(st);
        assert(w === sim.lastWinner, `game ${g}: trick winner ${sim.lastWinner} vs engine ${w}`);
        if (fast) collectTrick(st);
        else st = Schieber.resolveTrick(st);
      }
    }
    const pts = [0, 0];
    for (const p of st.players)
      for (const c of p.tricks) pts[team(p.id)] += Schieber.cardPoints(c, st.trump);
    pts[team(sim.lastWinner)] += 5;
    assert(pts[0] + pts[1] === 157, `game ${g}: engine hand total ${pts[0] + pts[1]}`);
    for (const t of [0, 1]) if (sim.tricks[t] === 9) pts[t] += 100;
    assert(
      pts[0] === sim.pts[0] && pts[1] === sim.pts[1],
      `game ${g}: points ${pts} vs ${sim.pts}`,
    );
    totals[0] += pts[0];
    totals[1] += pts[1];
  }
  assert(totals[0] > 0 && totals[1] > 0, 'both teams scored');
}

// 2. Sampled deals give every other seat its true number of cards, keep shown Weis cards with
// their owner and never give a seat a suit it showed out of. The true hands always fit what the
// plays revealed.
function testSampledDeals() {
  let pinsSeen = 0,
    voidsSeen = 0;
  for (let g = 0; g < 600; g++) {
    const st = playRandom(dealt(CONTRACTS[g % 6]), 1 + Math.floor(rand() * 34));
    if (st.phase !== 'playing') continue;
    const seat = st.currentPlayer;
    const v = viewOf(st, seat)!;
    assert(!!v, `game ${g}: no view`);
    const k = replayView(v)!;
    assert(!!k, `game ${g}: replay failed`);
    for (const p of st.players) {
      if (p.id === seat) continue;
      for (const c of p.hand) {
        const n = cardInt(c);
        assert(
          !!(k.allowed[p.id * 4 + ((n / 9) | 0)] & (1 << (n % 9))),
          `game ${g}: true card ruled out`,
        );
      }
      for (const c of v.pins[p.id]) {
        assert(
          p.hand.some((h) => cardInt(h) === c),
          `game ${g}: pinned card not in hand`,
        );
        pinsSeen++;
      }
      for (let s = 0; s < 4; s++) if (k.allowed[p.id * 4 + s] !== 0x1ff) voidsSeen++;
    }
    const h = new Int32Array(16);
    const r = mulberry32(g);
    for (let i = 0; i < 20; i++) {
      h.fill(0);
      for (const c of v.hand) h[seat * 4 + ((c / 9) | 0)] |= 1 << (c % 9);
      assert(sampleDeal(v, k, r, h), `game ${g}: no deal`);
      const owner = new Int8Array(36).fill(-1);
      for (let x = 0; x < 4; x++)
        for (let s = 0; s < 4; s++)
          for (let b = 0; b < 9; b++)
            if (h[x * 4 + s] & (1 << b)) {
              assert(owner[s * 9 + b] < 0, `game ${g}: card dealt twice`);
              owner[s * 9 + b] = x;
              assert(!!(k.allowed[x * 4 + s] & (1 << b)) || x === seat, `game ${g}: void broken`);
            }
      for (const p of st.players) {
        let n = 0;
        for (let s = 0; s < 4; s++) for (let m = h[p.id * 4 + s]; m; m &= m - 1) n++;
        assert(n === p.hand.length, `game ${g}: seat ${p.id} got ${n}, holds ${p.hand.length}`);
        for (const c of v.pins[p.id]) assert(owner[c] === p.id, `game ${g}: pin moved`);
      }
      for (let c = 0; c < 36; c++) {
        const gone = v.played.some((x, j) => j % 2 === 1 && x === c);
        assert(gone === owner[c] < 0, `game ${g}: card ${c} dealt ${owner[c]}, played ${gone}`);
      }
    }
  }
  assert(pinsSeen > 0 && voidsSeen > 0, `pins ${pinsSeen} and voids ${voidsSeen} exercised`);
}

// 3. Honesty: the view holds the own hand, the plays and the shown Weis cards only. Dealing the
// unseen cards differently among the other seats changes neither the view nor the card chosen.
function testHonestView() {
  for (let g = 0; g < 200; g++) {
    const st = playRandom(dealt(CONTRACTS[g % 6]), Math.floor(rand() * 30));
    if (st.phase !== 'playing') continue;
    const seat = st.currentPlayer;
    const v = viewOf(st, seat)!;
    const mine = new Set(st.players[seat].hand.map(key));
    assert(v.hand.length === mine.size, 'own hand only');
    // Swap the unpinned hidden cards around among the other seats, keeping hand sizes.
    const other = st.players.filter((p) => p.id !== seat);
    const pinned = new Set(v.pins.flat());
    const pool = other.flatMap((p) => p.hand.filter((c) => !pinned.has(cardInt(c))));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const alt = JSON.parse(JSON.stringify(st)) as Schieber.State;
    let at = 0;
    for (const p of alt.players) {
      if (p.id === seat) continue;
      p.hand = p.hand.map((c) => (pinned.has(cardInt(c)) ? c : pool[at++]));
    }
    const w = viewOf(alt, seat)!;
    assert(JSON.stringify(v) === JSON.stringify(w), `game ${g}: view depends on hidden cards`);
    const a = chooseStrong(v, 20),
      b = chooseStrong(w, 20);
    assert(!!a && a.card === b?.card, `game ${g}: choice depends on hidden cards`);
  }
}

// 4. The choice is legal, and the same position always gets the same answer.
function testLegalAndStable() {
  for (let g = 0; g < 200; g++) {
    const st = playRandom(dealt(CONTRACTS[g % 6]), Math.floor(rand() * 35));
    if (st.phase !== 'playing') continue;
    const seat = st.currentPlayer;
    const v: PublicView = viewOf(st, seat)!;
    const r = chooseStrong(v, 30)!;
    const legal = Schieber.getLegalCardsForPlayer(st, seat).map(cardInt);
    assert(legal.includes(r.card), `game ${g}: illegal choice ${r.card}`);
    assert(chooseStrong(v, 30)!.card === r.card, `game ${g}: not reproducible`);
  }
}

function runAll() {
  const tests = [testSimMatchesEngine, testSampledDeals, testHonestView, testLegalAndStable];
  let passed = 0;
  for (const t of tests) {
    const t0 = Date.now();
    try {
      t();
      console.log('PASS:', t.name, `(${Date.now() - t0} ms)`);
      passed++;
    } catch (e: any) {
      console.error('FAIL:', t.name, e.message || e);
    }
  }
  console.log(`${passed}/${tests.length} strong bot tests passed`);
  if (passed !== tests.length) process.exitCode = 1;
}

runAll();
