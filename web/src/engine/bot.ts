// Stronger single-player bots: card memory, partner play and a model-based
// contract choice. Pure functions over the engine State; nothing here touches
// React or the backend (multiplayer uses its own engine).
//
// Conventions: play runs counter-clockwise, so the seats after `seat` in a
// trick are seat-1, seat-2, ...; partner = (seat+2)%4; team = seat%2===0 ? 1 : 2.
// Cards are remembered by `${suit}${rank}` because card ids are random.
import {
  Card, Rank, State, Suit, TrumpContract,
  cardPoints, detectWeis, getCurrentTrickWinner, getLegalCardsForPlayer,
  isCardBetter, rankOrderIndex, ranks, suits, chooseBotCard,
} from './schieber';

export type Memory = {
  out: Set<string>;                 // cards already played (incl. the current trick)
  voids: Record<number, Set<Suit>>; // suits a seat is known to be out of
  trumpsLeft: number;               // trumps neither played nor in my hand
  unseen: Card[];                   // cards held by the other three players
};

const key = (c: { suit: Suit; rank: Rank }) => `${c.suit}${c.rank}`;
const teamOf = (seat: number) => (seat % 2 === 0 ? 1 : 2);
const trumpSuitOf = (contract: TrumpContract | null | undefined): Suit | null =>
  contract && (suits as string[]).includes(contract) ? (contract as Suit) : null;

export function buildMemory(state: State, seat: number): Memory {
  const contract = state.trump as TrumpContract | null;
  const trump = trumpSuitOf(contract);
  const me = state.players.find(p => p.id === seat);
  const mine = me ? me.hand : [];
  const out = new Set<string>();
  for (const p of state.players) for (const c of p.tricks || []) out.add(key(c));
  for (const c of state.currentTrick || []) out.add(key(c));
  const played = state.played || [];
  for (const e of played) out.add(key(e));
  const puurGone = !!trump && (out.has(`${trump}U`) || mine.some(c => c.suit === trump && c.rank === 'U'));
  const voids: Record<number, Set<Suit>> = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };
  for (const e of played) {
    if (!e.lead || e.suit === e.lead) continue;
    if (trump && e.lead === trump) {
      // A seat may hold the bare Puur and still play off-suit on a trump lead.
      if (puurGone) voids[e.playerId].add(trump);
    } else if (!trump || e.suit !== trump) {
      // Following suit or trumping is allowed, anything else means out of the suit.
      voids[e.playerId].add(e.lead);
    }
  }
  const unseen: Card[] = [];
  for (const s of suits) for (const r of ranks) {
    if (out.has(`${s}${r}`) || mine.some(c => c.suit === s && c.rank === r)) continue;
    unseen.push({ id: `${s}${r}`, suit: s, rank: r });
  }
  return { out, voids, trumpsLeft: trump ? unseen.filter(c => c.suit === trump).length : 0, unseen };
}

// ---------------------------------------------------------------------------
// Contract evaluation
// ---------------------------------------------------------------------------

const multiplierOf = (c: TrumpContract) => (c === 'schellen' || c === 'schilten' ? 2 : c === 'oben-abe' || c === 'unden-ufe' ? 3 : 1);

// Features of a hand for a contract. The model below (fitted offline on
// self-play hands, see scripts/calibrate-bot.ts) maps them to the expected raw
// card-point margin (our team minus theirs, before the multiplier and Weis).
export function contractFeatures(hand: Card[], contract: TrumpContract): number[] {
  const has = (s: Suit, r: Rank) => hand.some(c => c.suit === s && c.rank === r);
  const count = (s: Suit) => hand.filter(c => c.suit === s).length;
  const trump = trumpSuitOf(contract);
  if (trump) {
    const tl = count(trump);
    const side = suits.filter(s => s !== trump);
    let aces = 0, protK = 0, bareK = 0, tens = 0, voids = 0, singles = 0, sideLen = 0;
    for (const s of side) {
      const n = count(s);
      sideLen = Math.max(sideLen, n);
      if (n === 0) voids++;
      if (n === 1) singles++;
      if (has(s, 'A')) aces++;
      if (has(s, 'K') && (has(s, 'A') || n >= 3)) protK++;
      if (has(s, 'K') && n === 1) bareK++;
      if (has(s, '10') && (has(s, 'A') || has(s, 'K') || n >= 3)) tens++;
    }
    const u = has(trump, 'U'), nine = has(trump, '9');
    return [
      1, u ? 1 : 0, nine ? 1 : 0, nine && !u ? 1 : 0, has(trump, 'A') ? 1 : 0, has(trump, 'K') ? 1 : 0,
      has(trump, 'O') ? 1 : 0, has(trump, '10') ? 1 : 0, tl, Math.max(0, tl - 4), tl <= 1 ? 1 : 0,
      aces, protK, bareK, tens, tl >= 2 ? voids : 0, tl >= 2 ? singles : 0,
      has(trump, 'K') && has(trump, 'O') ? 1 : 0,
    ];
  }
  const order: Rank[] = contract === 'oben-abe' ? ['A', 'K', 'O', 'U', '10', '9', '8', '7', '6'] : ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
  let runTotal = 0, runSuits = 0, long = 0, topTwo = 0, dead = 0, pts = 0, run3 = 0;
  for (const s of suits) {
    let run = 0;
    for (const r of order) { if (!has(s, r)) break; run++; }
    runTotal += run;
    if (run > 0) runSuits++;
    if (run >= 3) run3++;
    long = Math.max(long, count(s));
    topTwo += (has(s, order[0]) ? 1 : 0) + (has(s, order[1]) ? 1 : 0);
  }
  for (const c of hand) {
    pts += cardPoints(c, contract);
    if (order.indexOf(c.rank) >= 6) dead++;
  }
  return [1, runTotal, runSuits, run3, long, topTwo, dead, pts / 10];
}

// [suit, oben-abe, unden-ufe] coefficient vectors (filled by calibration).
export const MODEL: { suit: number[]; oben: number[]; unden: number[]; partnerPush: number } = {
  suit: [-71.88, 37.58, 32.59, -5.86, 18.18, 10.28, 7.05, 3.67, 15.53, 2.27, 8.56, 5.94, 4.94, 1.95, 1.06, 1.71, -0.51, 17.9],
  oben: [-29.54, 7.01, 12.51, 1.41, 5.92, 8.7, -4.63, -4.6],
  unden: [-47.09, 3.2, 14.45, 6.57, 4.93, 8.6, -4.05, 1.51],
  partnerPush: -0.17,
};

function predictRaw(hand: Card[], contract: TrumpContract): number {
  const f = contractFeatures(hand, contract);
  const w = trumpSuitOf(contract) ? MODEL.suit : contract === 'oben-abe' ? MODEL.oben : MODEL.unden;
  let s = 0;
  for (let i = 0; i < f.length; i++) s += f[i] * (w[i] || 0);
  return s;
}

// Expected margin (ours - theirs) in match points: card margin plus 80% of the
// Weis in this hand, times the contract multiplier.
export function evaluateContract(hand: Card[], contract: TrumpContract, isForehand: boolean): number {
  const trump = trumpSuitOf(contract);
  const weis = detectWeis(hand, trump).reduce((s, w) => s + w.points, 0);
  const raw = predictRaw(hand, contract) + (isForehand ? 0 : MODEL.partnerPush) + weis * 0.8;
  return raw * multiplierOf(contract);
}

// Winners the hand can count on in a contract.
export function sureTricks(hand: Card[], contract: TrumpContract): number {
  const has = (s: Suit, r: Rank) => hand.some(c => c.suit === s && c.rank === r);
  const count = (s: Suit) => hand.filter(c => c.suit === s).length;
  const trump = trumpSuitOf(contract);
  if (!trump) {
    const order: Rank[] = contract === 'oben-abe' ? ['A', 'K', 'O', 'U', '10', '9', '8', '7', '6'] : ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
    let n = 0;
    for (const s of suits) for (const r of order) { if (!has(s, r)) break; n++; }
    return n;
  }
  const tl = count(trump);
  let n = 0;
  const u = has(trump, 'U');
  if (u) n++;
  if (has(trump, '9') && (u || tl >= 3)) n++;
  if (has(trump, 'A') && u && has(trump, '9')) n++;
  for (const s of suits) if (s !== trump && has(s, 'A')) n++;
  return n;
}

export const SCHIEBEN_BELOW = { margin: 60, sure: 2 };

const ALL_CONTRACTS: TrumpContract[] = ['eicheln', 'schellen', 'rosen', 'schilten', 'oben-abe', 'unden-ufe'];

export function chooseTrump(state: State, seat: number): TrumpContract | 'schieben' {
  const player = state.players.find(p => p.id === seat);
  if (!player) return 'eicheln';
  const forehand = typeof state.forehand === 'number' ? state.forehand === seat : true;
  let best: TrumpContract = 'eicheln';
  let bestVal = -Infinity;
  for (const c of ALL_CONTRACTS) {
    const v = evaluateContract(player.hand, c, forehand);
    if (v > bestVal) { bestVal = v; best = c; }
  }
  // After schieben the partner must choose; it can't be pushed back.
  if (!forehand) return best;
  if (bestVal >= SCHIEBEN_BELOW.margin && sureTricks(player.hand, best) >= SCHIEBEN_BELOW.sure) return best;
  return 'schieben';
}

// ---------------------------------------------------------------------------
// Card play
// ---------------------------------------------------------------------------

export const TUNE = { safeRisk: 0.12, winRisk: 0.25, partnerThreat: 0.35, leadValue: 2, spend: 0.4, ruffCost: 5, precious: 4, oldLead: 1, oldP: 0, oldO: 0, oldFollow: 0 };

type Ctx = {
  state: State; seat: number; contract: TrumpContract; trump: Suit | null;
  hand: Card[]; legal: Card[]; mem: Memory; team: number; partner: number;
  handSizes: Record<number, number>;
};

export function chooseCard(state: State, seat: number): string | null {
  const legal = getLegalCardsForPlayer(state, seat);
  const me = state.players.find(p => p.id === seat);
  if (legal.length === 0) return me?.hand?.[0]?.id ?? null;
  if (legal.length === 1) return legal[0].id;
  let id: string | undefined;
  try { id = decide(state, seat, legal, me!); } catch { id = undefined; }
  return id && legal.some(c => c.id === id) ? id : legal[0].id;
}

function decide(state: State, seat: number, legal: Card[], me: { hand: Card[] }): string | undefined {
  const contract = state.trump as TrumpContract;
  const handSizes: Record<number, number> = {};
  for (const p of state.players) handSizes[p.id] = p.hand.length;
  const cx: Ctx = {
    state, seat, contract, trump: trumpSuitOf(contract), hand: me.hand, legal,
    mem: buildMemory(state, seat), team: teamOf(seat), partner: (seat + 2) % 4, handSizes,
  };
  if (state.currentTrick.length === 0) return TUNE.oldLead ? chooseBotCard(state, seat) ?? undefined : lead(cx);
  return TUNE.oldFollow ? chooseBotCard(state, seat) ?? undefined : follow(cx);
}

const isT = (cx: Ctx, c: { suit: Suit }) => cx.trump === c.suit;
const strOf = (cx: Ctx, c: Card) => rankOrderIndex(c.rank, cx.contract, isT(cx, c)); // lower = stronger
const ptsOf = (cx: Ctx, c: Card) => cardPoints(c, cx.contract);

// No unseen card of the suit beats it (within the suit; says nothing about ruffing).
function isBoss(cx: Ctx, c: Card): boolean {
  const s = strOf(cx, c);
  return !cx.mem.unseen.some(u => u.suit === c.suit && strOf(cx, u) < s);
}

// Chance that `x` holds at least one of `k` specific unseen cards of suit `s`.
function holdsAny(cx: Ctx, x: number, s: Suit, k: number): number {
  if (k <= 0 || cx.mem.voids[x].has(s)) return 0;
  let total = 0;
  for (let o = 0; o < 4; o++) if (o !== cx.seat && !cx.mem.voids[o].has(s)) total += cx.handSizes[o];
  if (total <= 0) return 0;
  const share = Math.min(1, cx.handSizes[x] / total);
  return 1 - Math.pow(1 - share, k);
}

// Chance that `x` has no card of suit `s` at all.
function voidProb(cx: Ctx, x: number, s: Suit): number {
  if (cx.mem.voids[x].has(s)) return 1;
  const u = cx.mem.unseen.filter(c => c.suit === s).length;
  if (u === 0) return 1;
  let total = 0;
  for (let o = 0; o < 4; o++) if (o !== cx.seat && !cx.mem.voids[o].has(s)) total += cx.handSizes[o];
  const share = total > 0 ? Math.min(1, cx.handSizes[x] / total) : 0;
  return Math.pow(1 - share, u);
}

// Chance that seat x (yet to play) can beat card c in a trick led in `leadSuit`.
function beatProb(cx: Ctx, x: number, c: Card, leadSuit: Suit): number {
  const stronger = cx.mem.unseen.filter(u => u.suit === c.suit && strOf(cx, u) < strOf(cx, c)).length;
  if (isT(cx, c)) return holdsAny(cx, x, c.suit, stronger);
  const p1 = c.suit === leadSuit ? holdsAny(cx, x, c.suit, stronger) : 0;
  let p2 = 0;
  if (cx.trump && leadSuit !== cx.trump && cx.mem.trumpsLeft > 0) {
    p2 = voidProb(cx, x, leadSuit) * holdsAny(cx, x, cx.trump, cx.mem.trumpsLeft);
  }
  return 1 - (1 - p1) * (1 - p2);
}

// Seats still to play after me in the current trick (before the card I play).
function seatsAfter(cx: Ctx): number[] {
  const n = cx.state.currentTrick.length;
  const out: number[] = [];
  for (let i = 1; i <= 3 - n; i++) out.push((cx.seat - i + 4) % 4);
  return out;
}

// Chance that the card I play now (assumed best so far) gets beaten later.
function risk(cx: Ctx, c: Card, leadSuit: Suit, seats: number[], only?: (x: number) => boolean): number {
  let keep = 1;
  for (const x of seats) if (!only || only(x)) keep *= 1 - beatProb(cx, x, c, leadSuit);
  return 1 - keep;
}

const countSuit = (cards: Card[], s: Suit) => cards.filter(c => c.suit === s).length;

// Cost of giving a card away: keep trumps, points and winners; make short suits void.
function giveAwayCost(cx: Ctx, c: Card): number {
  let cost = (isT(cx, c) ? 60 : 0) + ptsOf(cx, c) * 3 + (8 - strOf(cx, c)) * 0.6;
  if (isBoss(cx, c)) cost += 6;
  const n = countSuit(cx.hand, c.suit);
  if (!isT(cx, c)) {
    if (n === 1 && cx.trump && countSuit(cx.hand, cx.trump) > 0) cost -= 4;
    else if (n === 2) cost -= 1;
  }
  return cost;
}
const cheapest = (cx: Ctx, cards: Card[]) => cards.slice().sort((a, b) => giveAwayCost(cx, a) - giveAwayCost(cx, b))[0];

// Is a side suit dangerous to lead because an opponent is out of it and can ruff?
function ruffDanger(cx: Ctx, s: Suit): boolean {
  if (!cx.trump || s === cx.trump) return false;
  for (const o of [(cx.seat + 1) % 4, (cx.seat + 3) % 4]) {
    if (voidProb(cx, o, s) > 0.5 && !cx.mem.voids[o].has(cx.trump) && cx.mem.trumpsLeft > 0) return true;
  }
  return false;
}

function lead(cx: Ctx): string | undefined {
  const { legal, trump, mem } = cx;
  const opp = [(cx.seat + 1) % 4, (cx.seat + 3) % 4];
  const decl = cx.state.declarer;
  const ours = typeof decl === 'number' && teamOf(decl) === cx.team;

  if (trump) {
    const myTrumps = legal.filter(c => isT(cx, c));
    if (ours && mem.trumpsLeft > 0 && myTrumps.length >= 2) {
      // Pull trumps while opponents can still hold some.
      const oppCanHold = opp.some(o => !mem.voids[o].has(trump));
      if (oppCanHold) {
        const boss = myTrumps.filter(c => isBoss(cx, c)).sort((a, b) => strOf(cx, a) - strOf(cx, b))[0];
        if (boss) return boss.id;
      }
    }
    // Side bosses (not into a ruff).
    const sideBoss = legal.filter(c => !isT(cx, c) && isBoss(cx, c) && !ruffDanger(cx, c.suit))
      .sort((a, b) => ptsOf(cx, b) - ptsOf(cx, a));
    if (sideBoss.length) return sideBoss[0].id;
    // Their contract (or trumps already gone): feed a suit partner can ruff.
    const partnerTrump = mem.trumpsLeft > 0 && !mem.voids[cx.partner].has(trump);
    if (partnerTrump) {
      const feed = legal.filter(c => !isT(cx, c) && mem.voids[cx.partner].has(c.suit) && !ruffDanger(cx, c.suit));
      if (feed.length) return cheapest(cx, feed).id;
    }
    const side = legal.filter(c => !isT(cx, c));
    const safeSide = side.filter(c => !ruffDanger(cx, c.suit));
    const pool = safeSide.length ? safeSide : side;
    if (pool.length) return leadLow(cx, pool).id;
    return cheapest(cx, legal).id;
  }

  // Obenabe / Undenufe: cash the boss run of the longest suit.
  const bosses = legal.filter(c => isBoss(cx, c));
  if (bosses.length) {
    const best = bosses.slice().sort((a, b) =>
      (countSuit(cx.hand, b.suit) - countSuit(cx.hand, a.suit)) || (ptsOf(cx, b) - ptsOf(cx, a)))[0];
    return best.id;
  }
  return leadLow(cx, legal).id;
}

// A low card from a suit worth leading: long suits, away from our weak spots.
function leadLow(cx: Ctx, pool: Card[]): Card {
  const score = (c: Card) => {
    let v = 0;
    v -= ptsOf(cx, c) * 2 + (8 - strOf(cx, c)) * 0.4; // lead cheap, keep strength
    v += countSuit(cx.hand, c.suit) * 0.8;            // long suits
    if (isT(cx, c)) v -= 20;
    return v;
  };
  return pool.slice().sort((a, b) => score(b) - score(a))[0];
}

function follow(cx: Ctx): string | undefined {
  const { state, legal, contract } = cx;
  const trick = state.currentTrick;
  const leadSuit = state.trickLead as Suit;
  const winning = getCurrentTrickWinner(trick, contract, leadSuit)!;
  const partnerWinning = teamOf(winning.playerId) === cx.team;
  const after = seatsAfter(cx);
  const last = after.length === 0;
  const trickPts = trick.reduce((s, c) => s + ptsOf(cx, c), 0) + (cx.hand.length === 1 ? 5 : 0);
  const beaters = legal.filter(c => isCardBetter(c, winning, contract, leadSuit));

  if (partnerWinning && TUNE.oldP) return chooseBotCard(state, cx.seat) ?? undefined;
  if (!partnerWinning && TUNE.oldO) return chooseBotCard(state, cx.seat) ?? undefined;
  if (partnerWinning) {
    const wRisk = last ? 0 : risk(cx, winning, leadSuit, after, x => teamOf(x) !== cx.team);
    if (wRisk <= TUNE.safeRisk) {
      // Smear: the most points we can safely add, never an overtrump.
      const pool = legal.filter(c => !isCardBetter(c, winning, contract, leadSuit) || (!isT(cx, c) && !last));
      const cand = (pool.length ? pool : legal).filter(c => !isT(cx, c) || isT(cx, winning) || !legal.some(l => !isT(cx, l)));
      const smear = (cand.length ? cand : legal).slice().sort((a, b) => (ptsOf(cx, b) - ptsOf(cx, a)) || (giveAwayCost(cx, a) - giveAwayCost(cx, b)))[0];
      if (ptsOf(cx, smear) > 0) return smear.id;
      return cheapest(cx, pool.length ? pool : legal).id;
    }
    // Partner's card is in danger: secure the trick with a card that holds.
    if (wRisk >= TUNE.partnerThreat) {
      const secure = beaters.filter(c => risk(cx, c, leadSuit, after, x => teamOf(x) !== cx.team) <= TUNE.winRisk)
        .sort((a, b) => (Number(isT(cx, a)) - Number(isT(cx, b))) || (strOf(cx, b) - strOf(cx, a)));
      if (secure.length && trickPts + ptsOf(cx, secure[0]) >= 8) return secure[0].id;
    }
    const nonBeat = legal.filter(c => !isCardBetter(c, winning, contract, leadSuit));
    return cheapest(cx, nonBeat.length ? nonBeat : legal).id;
  }

  // An opponent is winning: take the trick with the winner of best expected value.
  if (beaters.length) {
    let best: Card | undefined, bestScore = 0;
    for (const c of beaters) {
      const r = last ? 0 : risk(cx, c, leadSuit, after);
      const p = ptsOf(cx, c);
      let score = (1 - r) * (trickPts + TUNE.leadValue) - r * p - TUNE.spend * (8 - strOf(cx, c));
      if (isT(cx, c) && leadSuit !== cx.trump) score -= TUNE.ruffCost + (c.rank === 'U' || c.rank === '9' ? TUNE.precious : 0);
      if (score > bestScore) { best = c; bestScore = score; }
    }
    if (best) return best.id;
  }
  return cheapest(cx, legal.filter(c => !beaters.includes(c)).length ? legal.filter(c => !beaters.includes(c)) : legal).id;
}
