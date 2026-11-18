// The strong bot ('Stark'): Monte Carlo card play. For each decision it deals the unseen cards
// to the other three seats many times, consistent with what a player at its seat knows, plays
// every legal card in each of those deals and finishes the hand with a quick rollout policy, then
// picks the card with the best average point margin for its team.
//
// Honest by construction: the search only ever sees a PublicView, built by viewOf() from the
// engine state with the information a human at that seat has: their own hand, the cards played
// (and by whom), trump, who leads and who declared, and the Weis cards shown after the first
// trick. Hand sizes and missing suits follow from the plays. Trump choice stays with the normal
// bot (engine/bot.ts).
import * as Schieber from './schieber';
import {
  Sim,
  cardInt,
  cardOf,
  contractInt,
  legalInto,
  rulesFor,
  team,
  trickWinnerIdx,
  U,
  type Rules,
} from './fastsim';

export type PublicView = {
  seat: number;
  contract: number; // fastsim contract int
  hand: number[]; // own cards
  forehand: number; // leads the first trick
  played: number[]; // every card of the hand in order, as [seat, card, seat, card, ...]
  pins: number[][]; // per seat: cards seen in a shown Weis and not yet played
};

// Rollout budget: deals sampled per decision (each one plays out every legal card). About 4 ms
// per decision on a Raspberry Pi 5, so it runs inline within the bots' play delay.
export const STRONG = { worlds: 200 };

// The public information at `seat`, or null when the state can't support it (e.g. an old save).
export function viewOf(state: Schieber.State, seat: number): PublicView | null {
  if (state.phase !== 'playing' || !state.trump || typeof state.forehand !== 'number') return null;
  const me = state.players.find((p) => p.id === seat);
  if (!me) return null;
  const played: number[] = [];
  for (const e of state.played || []) played.push(e.playerId, cardInt(e));
  const out = played.length / 2;
  const held = state.players.reduce((s, p) => s + p.hand.length, 0);
  if (out + held !== 36 || out % 4 !== state.currentTrick.length) return null;
  // After the first trick the team with the best Weis shows its cards.
  const pins: number[][] = [[], [], [], []];
  if (out >= 4) {
    const weisOf = (id: number) => state.weis?.[id] || state.players.find((p) => p.id === id)?.weis;
    const players = state.players.map((p) => ({ id: p.id, team: p.team, weis: weisOf(p.id) }));
    const best = Schieber.bestWeis(players, state.trump as Schieber.TrumpContract, state.forehand);
    const gone = new Set(played.filter((_, i) => i % 2 === 1));
    if (best)
      for (const p of players) {
        if (p.team !== best.teamId || p.id === seat) continue;
        const shown = new Set<number>();
        for (const w of p.weis || []) for (const c of w.cards) shown.add(cardInt(c));
        pins[p.id] = [...shown].filter((c) => !gone.has(c));
      }
  }
  return {
    seat,
    contract: contractInt(state.trump as Schieber.TrumpContract),
    hand: me.hand.map(cardInt),
    forehand: state.forehand,
    played,
    pins,
  };
}

// What the plays so far tell: the position to move from and which cards each seat may still hold.
export type Known = {
  sim: Sim; // h holds only the own hand
  allowed: Int32Array; // seat*4+suit: ranks the seat may still hold
  size: number[]; // cards left per seat
};

export function replayView(v: PublicView): Known | null {
  const R = rulesFor(v.contract);
  const T = R.trump;
  const sim = new Sim(v.contract);
  const size = [9, 9, 9, 9];
  const allowed = new Int32Array(16).fill(0x1ff);
  // Replay with full hands of "ghost" cards so the sim's trick bookkeeping runs; the masks are
  // reset afterwards.
  sim.h.fill(0x1ff);
  sim.turn = v.forehand;
  for (let i = 0; i < v.played.length; i += 2) {
    const seat = v.played[i],
      c = v.played[i + 1];
    if (seat !== sim.turn || c < 0 || c > 35) return null;
    const s = (c / 9) | 0;
    if (sim.n > 0) {
      const lead = (sim.trick[0] / 9) | 0;
      const b = seat * 4;
      if (s !== lead) {
        if (T < 0) allowed[b + lead] = 0;
        else if (lead === T)
          allowed[b + T] &= 1 << U; // the bare Puur may stay back
        else if (s !== T) allowed[b + lead] = 0;
        else {
          // Undertrumping is only allowed with nothing but trumps in hand.
          let best = -1;
          for (let k = 0; k < sim.n; k++)
            if (((sim.trick[k] / 9) | 0) === T) best = Math.max(best, R.power[sim.trick[k]]);
          if (R.power[c] < best) for (let x = 0; x < 4; x++) if (x !== T) allowed[b + x] = 0;
        }
      }
    }
    size[seat]--;
    sim.play(c);
  }
  sim.h.fill(0);
  for (const c of v.hand) sim.h[v.seat * 4 + ((c / 9) | 0)] |= 1 << (c % 9);
  if (sim.turn !== v.seat || size[v.seat] !== v.hand.length) return null;
  return { sim, allowed, size };
}

export function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed from the public information, so the same position always gets the same answer
// (reproducible, and stable when a move is taken back and replayed).
export function viewSeed(v: PublicView): number {
  let x = 0x811c9dc5;
  const mix = (n: number) => {
    x ^= n + 1;
    x = Math.imul(x, 0x01000193);
  };
  mix(v.seat);
  mix(v.contract);
  mix(v.forehand);
  for (const c of v.hand) mix(c);
  for (const c of v.played) mix(c);
  return x >>> 0;
}

// Deal the unseen cards to the other seats: shown Weis cards first, then the cards with the
// fewest possible holders, each to a random seat that may hold it, weighted by free places.
// Writes into `h` (the own hand must already be there). After 50 dead ends the known missing
// suits are ignored. Returns false only when even that fails (inconsistent input).
export function sampleDeal(
  v: PublicView,
  k: Known,
  rand: () => number,
  h: Int32Array,
  order?: number[],
): boolean {
  const others = [0, 1, 2, 3].filter((x) => x !== v.seat);
  const seen = new Uint8Array(36);
  for (const c of v.hand) seen[c] = 1;
  for (let i = 1; i < v.played.length; i += 2) seen[v.played[i]] = 1;
  const need = [0, 0, 0, 0];
  const pinned: number[][] = [[], [], [], []];
  for (const x of others) {
    for (const c of v.pins[x] || []) if (!seen[c]) pinned[x].push(c);
    if (pinned[x].length > k.size[x]) pinned[x] = [];
    for (const c of pinned[x]) seen[c] = 1;
    need[x] = k.size[x] - pinned[x].length;
  }
  const cards = order ?? unseenOrder(k, seen, others);
  const base = h.slice();
  for (let attempt = 0; attempt < 60; attempt++) {
    const relax = attempt >= 50;
    h.set(base);
    for (const x of others) {
      for (let s = 0; s < 4; s++) h[x * 4 + s] = 0;
      for (const c of pinned[x]) h[x * 4 + ((c / 9) | 0)] |= 1 << (c % 9);
    }
    const cap = need.slice();
    let ok = true;
    for (const c of cards) {
      const s = (c / 9) | 0,
        bit = 1 << (c % 9);
      let total = 0;
      for (const x of others)
        if (cap[x] > 0 && (relax || k.allowed[x * 4 + s] & bit)) total += cap[x];
      if (total === 0) {
        ok = false;
        break;
      }
      let r = rand() * total;
      let pick = -1;
      for (const x of others) {
        if (cap[x] > 0 && (relax || k.allowed[x * 4 + s] & bit)) {
          pick = x;
          r -= cap[x];
          if (r < 0) break;
        }
      }
      h[pick * 4 + s] |= bit;
      cap[pick]--;
    }
    if (ok) return true;
  }
  return false;
}

// Unseen, unpinned cards, the ones with the fewest possible holders first.
function unseenOrder(k: Known, seen: Uint8Array, others: number[]): number[] {
  const list: { c: number; n: number }[] = [];
  for (let c = 0; c < 36; c++) {
    if (seen[c]) continue;
    const s = (c / 9) | 0,
      bit = 1 << (c % 9);
    let n = 0;
    for (const x of others) if (k.size[x] > 0 && k.allowed[x * 4 + s] & bit) n++;
    list.push({ c, n });
  }
  list.sort((a, b) => a.n - b.n || a.c - b.c);
  return list.map((e) => e.c);
}

// ---------------------------------------------------------------------------
// Rollout policy: cheap, full information within one sampled deal.
// ---------------------------------------------------------------------------

const lowBit = (m: number) => 31 - Math.clz32(m & -m);

// Can seat x (still to play) beat card w in a trick led in `lead`? (Approximate.)
function canBeat(R: Rules, h: Int32Array, x: number, w: number, lead: number): boolean {
  const T = R.trump,
    ws = (w / 9) | 0;
  if (ws === T) return (h[x * 4 + T] & R.above[w]) !== 0;
  if (h[x * 4 + lead]) return ws === lead && (h[x * 4 + lead] & R.above[w]) !== 0;
  return T >= 0 && h[x * 4 + T] !== 0;
}

// Cost of giving a card away: keep trumps, points and strong cards.
const giveCost = (R: Rules, c: number) =>
  (((c / 9) | 0) === R.trump ? 100 : 0) + R.points[c] * 4 + (R.power[c] % 20);

function cheapestIn(R: Rules, L: Int32Array): number {
  let best = -1,
    bc = 1e9;
  for (let s = 0; s < 4; s++)
    for (let m = L[s]; m; m &= m - 1) {
      const c = s * 9 + lowBit(m);
      const k = giveCost(R, c);
      if (k < bc) {
        bc = k;
        best = c;
      }
    }
  return best;
}

function topOf(R: Rules, s: number, m: number): number {
  let best = -1;
  for (; m; m &= m - 1) {
    const c = s * 9 + lowBit(m);
    if (best < 0 || R.power[c] > R.power[best]) best = c;
  }
  return best;
}
function lowOf(R: Rules, s: number, m: number): number {
  let best = -1;
  for (; m; m &= m - 1) {
    const c = s * 9 + lowBit(m);
    if (best < 0 || R.power[c] < R.power[best]) best = c;
  }
  return best;
}

export function rolloutMove(sim: Sim): number {
  const R = sim.R,
    h = sim.h,
    me = sim.turn,
    T = R.trump;
  const L = sim.computeLegal();
  if (sim.n === 0) return leadMove(sim, L);
  const o1 = (me + 1) % 4,
    o2 = (me + 3) % 4;
  const lead = (sim.trick[0] / 9) | 0;
  const wi = trickWinnerIdx(R, sim.trick, sim.n);
  const w = sim.trick[wi];
  const ws = (sim.leader + 4 - wi) % 4;
  const after = 3 - sim.n; // seats after me: me-1, me-2, ...
  const oppAfter = (c: number) => {
    for (let i = 1; i <= after; i++) {
      const x = (me + 4 - i) % 4;
      if ((x === o1 || x === o2) && canBeat(R, h, x, c, lead)) return true;
    }
    return false;
  };
  if (team(ws) === team(me)) {
    if (!oppAfter(w)) {
      // Partner holds the trick: add the most points (no trump unless only trumps).
      let best = -1;
      for (let s = 0; s < 4; s++) {
        if (s === T && T !== lead) continue;
        for (let m = L[s]; m; m &= m - 1) {
          const c = s * 9 + lowBit(m);
          if (
            best < 0 ||
            R.points[c] > R.points[best] ||
            (R.points[c] === R.points[best] && R.power[c] < R.power[best])
          )
            best = c;
        }
      }
      if (best >= 0) return best;
    }
    return cheapestIn(R, L);
  }
  // An opponent is winning: take it with the cheapest card that holds.
  const wsuit = (w / 9) | 0;
  let best = -1,
    bc = 1e9;
  for (let s = 0; s < 4; s++) {
    for (let m = L[s]; m; m &= m - 1) {
      const c = s * 9 + lowBit(m);
      const beats = (s === T && wsuit !== T) || (s === wsuit && R.power[c] > R.power[w]);
      if (!beats || oppAfter(c)) continue;
      const k = (s === T ? 50 : 0) + (R.power[c] % 20);
      if (k < bc) {
        bc = k;
        best = c;
      }
    }
  }
  if (best >= 0) return best;
  return cheapestIn(R, L);
}

function leadMove(sim: Sim, L: Int32Array): number {
  const R = sim.R,
    h = sim.h,
    me = sim.turn,
    T = R.trump;
  const part = (me + 2) % 4,
    o1 = (me + 1) % 4,
    o2 = (me + 3) % 4;
  const others = (s: number) => h[o1 * 4 + s] | h[o2 * 4 + s] | h[part * 4 + s];
  if (T >= 0 && L[T] && h[o1 * 4 + T] | h[o2 * 4 + T]) {
    const top = topOf(R, T, L[T]);
    if (!(others(T) & R.above[top])) return top;
  }
  // Cash a side card nobody can beat, unless an opponent can ruff it.
  let cash = -1;
  for (let s = 0; s < 4; s++) {
    if (s === T || !L[s]) continue;
    const top = topOf(R, s, L[s]);
    if (others(s) & R.above[top]) continue;
    if (T >= 0) {
      const ruff = (o: number) => !h[o * 4 + s] && h[o * 4 + T];
      if (ruff(o1) || ruff(o2)) continue;
    }
    if (cash < 0 || R.points[top] > R.points[cash]) cash = top;
  }
  if (cash >= 0) return cash;
  // Otherwise low from the longest side suit.
  let bs = -1,
    bl = 0;
  for (let s = 0; s < 4; s++) {
    if (s === T || !L[s]) continue;
    let n = 0;
    for (let m = L[s]; m; m &= m - 1) n++;
    if (n > bl) {
      bl = n;
      bs = s;
    }
  }
  if (bs >= 0) return lowOf(R, bs, L[bs]);
  return lowOf(R, T, L[T]);
}

export function rollout(sim: Sim): void {
  while (sim.done < 9) sim.play(rolloutMove(sim));
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

export type StrongResult = { card: number; values: number[]; candidates: number[] };

// The card (fastsim int) with the best average team margin over `worlds` sampled deals, or null
// when the view is inconsistent.
export function chooseStrong(v: PublicView, worlds?: number): StrongResult | null {
  const k = replayView(v);
  if (!k) return null;
  const base = k.sim;
  const legal = new Int32Array(4);
  legalInto(base.R, base.h, v.seat, base.trick, base.n, legal);
  const cands: number[] = [];
  for (let s = 0; s < 4; s++) for (let m = legal[s]; m; m &= m - 1) cands.push(s * 9 + lowBit(m));
  if (cands.length === 0) return null;
  // Cheaper cards first, so a tie keeps the cheaper one.
  cands.sort((a, b) => giveCost(base.R, a) - giveCost(base.R, b));
  const values = cands.map(() => 0);
  if (cands.length === 1) return { card: cands[0], values, candidates: cands };
  const n = worlds ?? STRONG.worlds;
  const rand = mulberry32(viewSeed(v));
  const world = new Sim(v.contract).copyFrom(base);
  const sim = new Sim(v.contract);
  const myTeam = team(v.seat);
  let used = 0;
  for (let i = 0; i < n; i++) {
    world.h.set(base.h);
    if (!sampleDeal(v, k, rand, world.h)) break;
    used++;
    for (let j = 0; j < cands.length; j++) {
      sim.copyFrom(world);
      sim.play(cands[j]);
      rollout(sim);
      values[j] += sim.pts[myTeam] - sim.pts[1 - myTeam];
    }
  }
  if (!used) return null;
  let bi = 0;
  for (let j = 1; j < cands.length; j++) if (values[j] > values[bi]) bi = j;
  return { card: cands[bi], values: values.map((x) => x / used), candidates: cands };
}

// Synchronous strong card choice on an engine state (used by the head-to-head script and as the
// Worker's body): the card id, or the normal bot's choice when the view can't be built.
export function strongCardId(
  state: Schieber.State,
  seat: number,
  fallback: (s: Schieber.State, seat: number) => string | null,
  worlds?: number,
): string | null {
  const v = viewOf(state, seat);
  const r = v ? chooseStrong(v, worlds) : null;
  return r ? cardIdIn(state, seat, r.card) : fallback(state, seat);
}

export function cardIdIn(state: Schieber.State, seat: number, card: number): string | null {
  const c = cardOf(card);
  const me = state.players.find((p) => p.id === seat);
  return me?.hand.find((h) => h.suit === c.suit && h.rank === c.rank)?.id ?? null;
}
