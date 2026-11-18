// Fast, mutable simulator of the card-play phase, for the strong bot's rollouts. It mirrors the
// shared engine (shared/engine/schieber.ts) exactly: follow suit, trump may always be played, the
// bare Puur never has to follow a trump lead, no undertrumping unless only trumps are left, card
// points per contract, +5 for the last trick and +100 for a Match. Weis, Stöck and the contract
// multiplier don't depend on the card play, so they are left out. scripts/unit_tests.ts checks it
// against the engine on random playouts.
//
// Cards are ints: suit * 9 + rank, with suits and ranks in the engine's order
// (eicheln, schellen, rosen, schilten; 6 7 8 9 10 U O K A). A hand is four 9-bit rank masks, one
// per suit. Contracts are ints too: 0..3 the trump suit, 4 Obenabe, 5 Undenufe.
import { CONTRACTS, ranks, suits, type Rank, type Suit, type TrumpContract } from './schieber';

export const OBEN = 4,
  UNDEN = 5;
export const U = 5; // rank index of the Under (Puur in trump)

export const cardInt = (c: { suit: Suit; rank: Rank }) =>
  suits.indexOf(c.suit) * 9 + ranks.indexOf(c.rank);
export const cardOf = (n: number): { suit: Suit; rank: Rank } => ({
  suit: suits[(n / 9) | 0],
  rank: ranks[n % 9],
});
export const contractInt = (c: TrumpContract) => CONTRACTS.indexOf(c);
export const team = (seat: number) => seat & 1; // 0: seats 0 and 2 (team 1), 1: seats 1 and 3

export type Rules = {
  trump: number; // trump suit, -1 in Obenabe/Undenufe
  power: Int8Array; // higher beats lower within a suit; trumps are above every side card
  points: Int8Array;
  above: Int32Array; // per card: rank mask of the cards of its suit that beat it
};

const BASE = [0, 0, 0, 0, 10, 2, 3, 4, 11];
const TRUMP_PTS = [0, 0, 0, 14, 10, 20, 3, 4, 11];
const TRUMP_ORDER = [0, 1, 2, 7, 3, 8, 4, 5, 6]; // 6 7 8 10 O K A 9 U from weakest
const RULES: Rules[] = [];

export function rulesFor(contract: number): Rules {
  if (RULES[contract]) return RULES[contract];
  const trump = contract < 4 ? contract : -1;
  const power = new Int8Array(36),
    points = new Int8Array(36);
  for (let c = 0; c < 36; c++) {
    const s = (c / 9) | 0,
      r = c % 9;
    if (s === trump) {
      power[c] = 20 + TRUMP_ORDER[r];
      points[c] = TRUMP_PTS[r];
    } else if (contract === UNDEN) {
      power[c] = 8 - r;
      points[c] = r === 0 ? 11 : r === 8 ? 0 : r === 2 ? 8 : BASE[r];
    } else {
      power[c] = r;
      points[c] = contract === OBEN && r === 2 ? 8 : BASE[r];
    }
  }
  const above = new Int32Array(36);
  for (let c = 0; c < 36; c++)
    for (let r = 0; r < 9; r++) {
      const d = c - (c % 9) + r;
      if (power[d] > power[c]) above[c] |= 1 << r;
    }
  return (RULES[contract] = { trump, power, points, above });
}

export const bitCount = (m: number) => {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
};

// Legal cards for `seat` (hand masks h[seat*4 .. seat*4+3]) as four suit masks in `out`.
export function legalInto(
  R: Rules,
  h: Int32Array,
  seat: number,
  trick: Int8Array,
  n: number,
  out: Int32Array,
): void {
  const b = seat * 4;
  out[0] = h[b];
  out[1] = h[b + 1];
  out[2] = h[b + 2];
  out[3] = h[b + 3];
  if (n === 0) return;
  const lead = (trick[0] / 9) | 0;
  const T = R.trump;
  const same = h[b + lead];
  if (T < 0) {
    if (same) for (let s = 0; s < 4; s++) out[s] = s === lead ? same : 0;
    return;
  }
  if (lead === T) {
    // The Puur never has to be played: with no other trump anything goes.
    if (same & ~(1 << U)) for (let s = 0; s < 4; s++) out[s] = s === lead ? same : 0;
    return;
  }
  // Nothing but trumps: anything (undertrumping included).
  let side = 0;
  for (let s = 0; s < 4; s++) if (s !== T) side |= h[b + s];
  if (!side) return;
  let best = -1;
  for (let i = 0; i < n; i++) {
    const c = trick[i];
    if (((c / 9) | 0) === T && R.power[c] > best) best = R.power[c];
  }
  let trumps = h[b + T];
  if (best >= 0) {
    let ok = 0;
    for (let m = trumps; m; m &= m - 1) {
      const r = 31 - Math.clz32(m & -m);
      if (R.power[T * 9 + r] > best) ok |= 1 << r;
    }
    trumps = ok;
  }
  if (same) {
    for (let s = 0; s < 4; s++) out[s] = s === lead ? same : s === T ? trumps : 0;
  } else {
    for (let s = 0; s < 4; s++) out[s] = s === T ? trumps : h[b + s];
  }
  if (!(out[0] | out[1] | out[2] | out[3])) for (let s = 0; s < 4; s++) out[s] = h[b + s];
}

// Index (0..n-1) of the card that currently wins the trick.
export function trickWinnerIdx(R: Rules, trick: Int8Array, n: number): number {
  let bi = 0,
    best = trick[0];
  const T = R.trump;
  for (let i = 1; i < n; i++) {
    const c = trick[i];
    const cs = (c / 9) | 0,
      bs = (best / 9) | 0;
    if ((cs === T && bs !== T) || (cs === bs && R.power[c] > R.power[best])) {
      best = c;
      bi = i;
    }
  }
  return bi;
}

// One hand in play. Seats move counter-clockwise: the next seat is (seat + 3) % 4.
export class Sim {
  R: Rules;
  h = new Int32Array(16);
  trick = new Int8Array(4);
  n = 0;
  leader = 0;
  turn = 0;
  done = 0; // completed tricks
  pts = [0, 0]; // card points per team (with the last trick's 5 and the Match bonus)
  tricks = [0, 0]; // tricks per team
  lastWinner = -1;
  legal = new Int32Array(4);

  constructor(contract: number) {
    this.R = rulesFor(contract);
  }

  copyFrom(o: Sim): this {
    this.R = o.R;
    this.h.set(o.h);
    this.trick.set(o.trick);
    this.n = o.n;
    this.leader = o.leader;
    this.turn = o.turn;
    this.done = o.done;
    this.pts[0] = o.pts[0];
    this.pts[1] = o.pts[1];
    this.tricks[0] = o.tricks[0];
    this.tricks[1] = o.tricks[1];
    this.lastWinner = o.lastWinner;
    return this;
  }

  computeLegal(): Int32Array {
    legalInto(this.R, this.h, this.turn, this.trick, this.n, this.legal);
    return this.legal;
  }

  // Play a card for the seat to move (assumed legal); resolves the trick when it is complete.
  play(card: number): void {
    const s = (card / 9) | 0;
    this.h[this.turn * 4 + s] &= ~(1 << (card % 9));
    if (this.n === 0) this.leader = this.turn;
    this.trick[this.n++] = card;
    if (this.n < 4) {
      this.turn = (this.turn + 3) % 4;
      return;
    }
    const wi = trickWinnerIdx(this.R, this.trick, 4);
    const winner = (this.leader + 4 - wi) % 4;
    let p = 0;
    for (let i = 0; i < 4; i++) p += this.R.points[this.trick[i]];
    this.done++;
    if (this.done === 9) p += 5;
    const t = team(winner);
    this.pts[t] += p;
    this.tricks[t]++;
    if (this.done === 9 && this.tricks[t] === 9) this.pts[t] += 100;
    this.n = 0;
    this.turn = winner;
    this.lastWinner = winner;
  }
}
