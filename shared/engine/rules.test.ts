// The rules in docs/RULES.md, one test per rule, plus random full hands and
// matches checked against an independently written scorer and legality oracle.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bestWeis,
  calculateTeamWeis,
  cardPoints,
  CONTRACTS,
  detectWeis,
  getLegalCardsForPlayer,
  isLegalPlay,
  peekTrickWinner,
  playCardLocal,
  ranks,
  resolveTrick,
  setTrumpAndDetectWeis,
  startGameLocal,
  startNewHand,
  suits,
} from './schieber';
import type { Card, Rank, State, Suit, TrumpContract } from './schieber';

const C = (suit: Suit, rank: Rank): Card => ({ id: `${suit}_${rank}`, suit, rank });
const E = (r: Rank) => C('eicheln', r);
const S = (r: Rank) => C('schellen', r);
const R = (r: Rank) => C('rosen', r);
const Si = (r: Rank) => C('schilten', r);
const all = (suit: Suit) => ranks.map((r) => C(suit, r));
const ids = (cards: Card[]) => cards.map((c) => c.id).sort();
const BOTS = ['A (bot)', 'B (bot)', 'C (bot)'];

// A hand in progress. Seats: 0 and 2 are team 1, 1 and 3 team 2; play runs 3, 2, 1, 0.
function table(o: {
  trump: TrumpContract;
  hands: Card[][];
  trick?: [number, Card][];
  current: number;
  forehand?: number;
}): State {
  const trick = (o.trick || []).map(([playerId, c]) => ({ ...c, playerId }));
  return {
    phase: 'playing',
    trump: o.trump,
    currentPlayer: o.current,
    dealer: 0,
    forehand: o.forehand ?? 3,
    currentTrick: trick,
    trickLead: trick[0]?.suit ?? null,
    players: [0, 1, 2, 3].map((id) => ({
      id,
      name: `P${id}`,
      team: id % 2 === 0 ? 1 : 2,
      hand: o.hands[id] || [],
      tricks: [],
      points: 0,
      weis: [],
    })),
    scores: { team1: 0, team2: 0 },
    trumpMultiplier: 1,
    played: [],
  };
}

// A freshly dealt hand with fixed cards; seat 3 is the forehand.
function dealt(hands: Card[][], target?: number): State {
  const st = startGameLocal(undefined, BOTS, target, () => 0);
  st.players.forEach((p, i) => (p.hand = hands[i]));
  return st;
}

// What may `me` play on this trick?
function legalOn(trump: TrumpContract, hand: Card[], trick: Card[]): string[] {
  const seats = [3, 2, 1, 0];
  const me = seats[trick.length];
  const hands: Card[][] = [[], [], [], []];
  hands[me] = hand;
  const st = table({
    trump,
    hands,
    trick: trick.map((c, i) => [seats[i], c] as [number, Card]),
    current: me,
  });
  return ids(getLegalCardsForPlayer(st, me));
}

function winnerOf(trump: TrumpContract, trick: Card[]): number {
  const st = table({
    trump,
    hands: [[], [], [], []],
    trick: trick.map((c, i) => [i, c] as [number, Card]),
    current: 0,
  });
  return peekTrickWinner(st)!;
}

describe('trick winner', () => {
  it('trump order: Puur, Nell, Ass, König, Ober, 10, 8, 7, 6', () => {
    const order: Rank[] = ['U', '9', 'A', 'K', 'O', '10', '8', '7', '6'];
    for (let i = 0; i < order.length - 1; i++) {
      const trick = [R(order[i + 1]), R(order[i]), E('A'), S('A')];
      expect(winnerOf('rosen', trick)).toBe(1);
      expect(winnerOf('rosen', [trick[1], trick[0], trick[2], trick[3]])).toBe(0);
    }
  });

  it('side suit order: Ass, König, Ober, Under, 10, 9, 8, 7, 6', () => {
    const order: Rank[] = ['A', 'K', 'O', 'U', '10', '9', '8', '7', '6'];
    for (let i = 0; i < order.length - 1; i++) {
      expect(winnerOf('rosen', [E(order[i + 1]), E(order[i]), S('A'), Si('A')])).toBe(1);
    }
  });

  it('the lowest trump beats any side card; a card of another suit never wins', () => {
    expect(winnerOf('rosen', [E('A'), E('K'), R('6'), E('10')])).toBe(2);
    expect(winnerOf('rosen', [E('6'), S('A'), Si('A'), S('K')])).toBe(0);
    expect(winnerOf('rosen', [E('6'), R('6'), R('7'), S('A')])).toBe(2);
  });

  it('Obenabe: Ass high, no trump', () => {
    expect(winnerOf('oben-abe', [E('6'), E('A'), R('A'), E('K')])).toBe(1);
    expect(winnerOf('oben-abe', [E('10'), E('U'), S('A'), Si('A')])).toBe(1);
  });

  it('Undenufe: 6 high, Ass low', () => {
    expect(winnerOf('unden-ufe', [E('A'), E('K'), E('6'), E('7')])).toBe(2);
    expect(winnerOf('unden-ufe', [E('8'), E('7'), R('6'), S('6')])).toBe(1);
  });
});

describe('legal cards', () => {
  it('the leader may play anything', () => {
    const hand = [E('6'), R('U'), S('A')];
    expect(legalOn('rosen', hand, [])).toEqual(ids(hand));
  });

  it('follow suit; trump is always allowed as well', () => {
    expect(legalOn('rosen', [E('6'), E('K'), S('A')], [E('A')])).toEqual(ids([E('6'), E('K')]));
    expect(legalOn('rosen', [E('6'), R('7'), S('A')], [E('A')])).toEqual(ids([E('6'), R('7')]));
  });

  it('with no card of the suit anything goes; trumping is never forced', () => {
    const hand = [S('6'), R('7'), Si('A')];
    expect(legalOn('rosen', hand, [E('A')])).toEqual(ids(hand));
  });

  it('no undertrumping while holding another card', () => {
    // The trick was trumped with the 10: the 8 is lower, the Ass is higher.
    expect(legalOn('rosen', [E('6'), R('8'), R('A')], [E('A'), R('10')])).toEqual(
      ids([E('6'), R('A')]),
    );
    // Cannot follow and holds only lower trumps besides a side card.
    expect(legalOn('rosen', [S('6'), R('8'), R('6')], [E('A'), R('9')])).toEqual(ids([S('6')]));
    // The Puur beats everything, the Nell everything but the Puur.
    expect(legalOn('rosen', [S('6'), R('U')], [E('A'), R('9')])).toEqual(ids([S('6'), R('U')]));
    expect(legalOn('rosen', [S('6'), R('9')], [E('A'), R('A'), R('U')])).toEqual(ids([S('6')]));
  });

  it('undertrumping is allowed with nothing but trumps', () => {
    const hand = [R('6'), R('7')];
    expect(legalOn('rosen', hand, [E('A'), R('9')])).toEqual(ids(hand));
  });

  it('trump led: follow with any trump, lower ones included', () => {
    expect(legalOn('rosen', [R('6'), R('7'), E('A')], [R('A')])).toEqual(ids([R('6'), R('7')]));
    expect(legalOn('rosen', [R('6'), R('U'), E('A')], [R('A')])).toEqual(ids([R('6'), R('U')]));
  });

  it('trump led: the bare Puur never has to be played', () => {
    const hand = [R('U'), E('A'), S('6')];
    expect(legalOn('rosen', hand, [R('A')])).toEqual(ids(hand));
  });

  it('trump led without a trump: anything', () => {
    const hand = [E('A'), S('6')];
    expect(legalOn('rosen', hand, [R('A')])).toEqual(ids(hand));
  });

  it('Obenabe and Undenufe: follow suit, otherwise anything', () => {
    for (const contract of ['oben-abe', 'unden-ufe'] as TrumpContract[]) {
      expect(legalOn(contract, [E('6'), R('U'), S('A')], [E('A')])).toEqual(ids([E('6')]));
      const hand = [R('U'), S('A')];
      expect(legalOn(contract, hand, [E('A')])).toEqual(ids(hand));
    }
  });
});

describe('the engine refuses illegal actions', () => {
  const st = table({
    trump: 'rosen',
    hands: [[E('7')], [E('8')], [E('6'), S('A')], [E('A')]],
    trick: [[3, E('K')]],
    current: 2,
  });

  it('out of turn, not following suit, or a card not in hand', () => {
    expect(playCardLocal(st, 1, E('8').id)).toEqual(st);
    expect(playCardLocal(st, 2, S('A').id)).toEqual(st);
    expect(playCardLocal(st, 2, E('A').id)).toEqual(st);
    expect(isLegalPlay(st, 2, E('6').id)).toBe(true);
  });

  it('play runs counter-clockwise and a full trick waits to be resolved', () => {
    let s = playCardLocal(st, 2, E('6').id);
    expect(s.currentPlayer).toBe(1);
    s = playCardLocal(s, 1, E('8').id);
    expect(s.currentPlayer).toBe(0);
    s = playCardLocal(s, 0, E('7').id);
    expect(s.phase).toBe('resolving');
    expect(playCardLocal(s, 3, E('A').id)).toEqual(s);
    s = resolveTrick(s);
    expect(s.currentPlayer).toBe(3); // the König won; the winner leads
    expect(s.phase).toBe('playing');
  });

  it('no card before trump is chosen, no trump change afterwards', () => {
    const fresh = startGameLocal(undefined, BOTS, 1000, () => 0);
    const card = fresh.players[3].hand[0].id;
    expect(playCardLocal(fresh, 3, card)).toEqual(fresh);
    expect(setTrumpAndDetectWeis(fresh, 'slalom' as TrumpContract)).toEqual(fresh);
    const chosen = setTrumpAndDetectWeis(fresh, 'rosen');
    expect(setTrumpAndDetectWeis(chosen, 'eicheln')).toEqual(chosen);
  });
});

describe('trump choice and schieben', () => {
  it('the forehand is the dealer’s right and leads, also after schieben', () => {
    const st = startGameLocal(undefined, BOTS, 1000, () => 0);
    expect([st.dealer, st.forehand, st.currentPlayer]).toEqual([0, 3, 3]);
    const pushed = setTrumpAndDetectWeis(st, 'schieben');
    expect(pushed.phase).toBe('trump_selection');
    expect(pushed.currentPlayer).toBe(1); // the partner
    expect(setTrumpAndDetectWeis(pushed, 'schieben')).toEqual(pushed); // cannot push back
    const chosen = setTrumpAndDetectWeis(pushed, 'schellen');
    expect(chosen.declarer).toBe(1);
    expect(chosen.currentPlayer).toBe(3);
    expect(chosen.phase).toBe('playing');
  });

  it('the deal moves counter-clockwise', () => {
    const st = startGameLocal(undefined, BOTS, 1000, () => 0);
    const next = startNewHand(st);
    expect([next.dealer, next.forehand]).toEqual([3, 2]);
    expect([startNewHand(next).dealer, startNewHand(next).forehand]).toEqual([2, 1]);
  });

  it('multipliers: Eicheln/Rosen 1, Schellen/Schilten 2, Obenabe/Undenufe 3', () => {
    const want: Record<TrumpContract, number> = {
      eicheln: 1,
      rosen: 1,
      schellen: 2,
      schilten: 2,
      'oben-abe': 3,
      'unden-ufe': 3,
    };
    for (const c of CONTRACTS) {
      const st = setTrumpAndDetectWeis(
        startGameLocal(undefined, BOTS, 1000, () => 0),
        c,
      );
      expect(st.trumpMultiplier).toBe(want[c]);
    }
  });
});

describe('Weis', () => {
  const run = (suit: Suit, from: number, n: number) =>
    ranks.slice(from, from + n).map((r) => C(suit, r));
  const pts = (hand: Card[]) =>
    detectWeis(hand)
      .map((w) => w.points)
      .sort((a, b) => a - b);

  it('sequences: 3 cards 20, 4 50, 5 100, 6 150, 7 200, 8 250, 9 300', () => {
    const want = [20, 50, 100, 150, 200, 250, 300];
    for (let n = 3; n <= 9; n++) expect(pts(run('eicheln', 0, n))).toEqual([want[n - 3]]);
    expect(pts(run('eicheln', 0, 2))).toEqual([]);
    expect(pts([E('6'), E('7'), R('8')])).toEqual([]);
  });

  it('two sequences in one suit both count', () => {
    expect(pts([...run('eicheln', 0, 3), ...run('eicheln', 4, 4)])).toEqual([20, 50]);
  });

  it('four of a kind: Under 200, Nell 150, Ass/König/Ober/10 100, 6/7/8 nothing', () => {
    const four = (r: Rank) => suits.map((s) => C(s, r));
    expect(pts(four('U'))).toEqual([200]);
    expect(pts(four('9'))).toEqual([150]);
    for (const r of ['A', 'K', 'O', '10'] as Rank[]) expect(pts(four(r))).toEqual([100]);
    for (const r of ['6', '7', '8'] as Rank[]) expect(pts(four(r))).toEqual([]);
    // A card may count in a sequence and in four of a kind.
    expect(pts([...four('U'), E('O'), E('K')])).toEqual([20, 200]);
  });

  const seat = (id: number, hand: Card[]) => ({
    id,
    name: `P${id}`,
    team: id % 2 === 0 ? 1 : 2,
    hand,
    tricks: [],
    weis: detectWeis(hand),
  });
  const score = (hands: Card[][], trump: TrumpContract, forehand = 3) => {
    const r = calculateTeamWeis(
      hands.map((h, i) => seat(i, h)),
      trump,
      forehand,
    );
    return [r.team1, r.team2];
  };

  it('only the team with the best Weis scores, and then all of its Weis', () => {
    // Seat 0 has the best (50); the partner's 20 counts too, the opponents' 20s don't.
    const hands = [
      run('eicheln', 0, 4),
      run('schellen', 0, 3),
      run('rosen', 0, 3),
      run('schilten', 0, 3),
    ];
    expect(score(hands, 'schilten')).toEqual([70, 0]);
  });

  it('equal points: the higher sequence wins, in Undenufe the lower', () => {
    const hands = [run('eicheln', 0, 3), run('schellen', 6, 3), [], []];
    expect(score(hands, 'rosen')).toEqual([0, 20]);
    expect(score(hands, 'oben-abe')).toEqual([0, 20]);
    expect(score(hands, 'unden-ufe')).toEqual([20, 0]);
  });

  it('equal height: the one in trump wins', () => {
    const hands = [run('eicheln', 2, 3), run('schellen', 2, 3), [], []];
    expect(score(hands, 'eicheln')).toEqual([20, 0]);
    expect(score(hands, 'schellen')).toEqual([0, 20]);
  });

  it('still equal: the first in play order from the forehand', () => {
    const hands = [[], run('schellen', 2, 3), run('eicheln', 2, 3), []];
    // Order from seat 3 is 3, 2, 1, 0; from seat 1 it is 1, 0, 3, 2.
    expect(score(hands, 'rosen', 3)).toEqual([20, 0]);
    expect(score(hands, 'rosen', 1)).toEqual([0, 20]);
    expect(
      bestWeis(
        hands.map((h, i) => seat(i, h)),
        'rosen',
        1,
      )?.playerId,
    ).toBe(1);
  });

  it('four of a kind of equal points: the higher rank wins, in Undenufe the lower', () => {
    const four = (r: Rank) => suits.map((s) => C(s, r));
    for (const forehand of [0, 1, 2, 3]) {
      expect(score([four('K'), four('A'), [], []], 'rosen', forehand)).toEqual([0, 100]);
      expect(score([four('K'), four('A'), [], []], 'unden-ufe', forehand)).toEqual([100, 0]);
      expect(score([four('10'), four('O'), [], []], 'oben-abe', forehand)).toEqual([0, 100]);
    }
  });

  it('more points beat a longer or a trump sequence', () => {
    const four = (r: Rank) => suits.map((s) => C(s, r));
    expect(score([four('U'), run('rosen', 0, 6), [], []], 'rosen')).toEqual([200, 0]);
  });
});

// Each player holds one whole suit; seat 3 (the forehand, team 2) has Eicheln.
const suitDeal = () => [all('schilten'), all('rosen'), all('schellen'), all('eicheln')];

function playOut(start: State, pick: (st: State, legal: Card[]) => Card = (_s, l) => l[0]) {
  let st = start;
  let guard = 0;
  while (st.phase !== 'finished') {
    if (++guard > 100) throw new Error('hand does not finish');
    if (st.pendingResolve) st = resolveTrick(st);
    else {
      const legal = getLegalCardsForPlayer(st, st.currentPlayer);
      st = playCardLocal(st, st.currentPlayer, pick(st, legal).id);
    }
  }
  return st;
}

describe('scoring a hand', () => {
  it('Match: all nine tricks are worth 257, plus Weis and Stöck', () => {
    // Trump Eicheln: seat 3 wins everything. All four hold a nine-card sequence;
    // the trump one is best, so team 2 scores both of its 300s. Stöck 20.
    const st = playOut(setTrumpAndDetectWeis(dealt(suitDeal()), 'eicheln'));
    expect(st.scores).toEqual({ team1: 0, team2: 157 + 100 + 600 + 20 });
  });

  it('the multiplier applies to cards, last trick, Weis, Stöck and Match', () => {
    const st = playOut(
      setTrumpAndDetectWeis(
        dealt([all('rosen'), all('eicheln'), all('schilten'), all('schellen')]),
        'schellen',
      ),
    );
    expect(st.scores).toEqual({ team1: 0, team2: 2 * (157 + 100 + 600 + 20) });
  });

  it('Obenabe: no Stöck, eights count 8, everything times 3', () => {
    const st = playOut(setTrumpAndDetectWeis(dealt(suitDeal()), 'oben-abe'));
    expect(st.scores).toEqual({ team1: 0, team2: 3 * (157 + 100 + 600) });
  });

  it('Stöck needs König and Ober of trump in one hand', () => {
    const hands = suitDeal();
    // Swap the trump Ober for the Rosen Ober: no Stöck, and the sequences break.
    hands[3] = hands[3].map((c) => (c.rank === 'O' ? R('O') : c));
    hands[1] = hands[1].map((c) => (c.rank === 'O' ? E('O') : c));
    const st = setTrumpAndDetectWeis(dealt(hands), 'eicheln');
    expect(Object.keys(st.stoeckPending || {})).toEqual([]);
  });
});

describe('reaching the target: Stöck, Weis, Stich', () => {
  const late = (o: Parameters<typeof table>[0], start: { team1: number; team2: number }) => {
    const st = table(o);
    st.target = 1000;
    st.scores = { ...start };
    st.handStartScores = { ...start };
    return st;
  };

  it('Stöck counts before the points of the trick it is completed in', () => {
    const st = late(
      {
        trump: 'eicheln',
        hands: [
          [E('U'), S('6')],
          [S('7'), S('8')],
          [R('6'), R('7')],
          [E('K'), S('9')],
        ],
        current: 3,
      },
      { team1: 990, team2: 990 },
    );
    st.players[0].tricks = [Si('6'), Si('7'), Si('8'), Si('9')]; // not the first trick
    st.stoeckPending = { 3: { remaining: 1, awarded: false } };
    const end = playOut(st);
    // Team 1 takes the trick with the Puur (24 points), but team 2's Stöck came first.
    expect(end.matchWinner).toBe(2);
    expect(end.scores).toEqual({ team1: 990, team2: 1010 });
  });

  it('Weis counts with the first trick, before its points', () => {
    const st = late(
      {
        trump: 'eicheln',
        hands: [[S('6')], [S('7')], [S('8')], [S('A')]],
        current: 3,
      },
      { team1: 980, team2: 990 },
    );
    st.players[2].weis = detectWeis([R('6'), R('7'), R('8')]);
    const end = playOut(st);
    expect(end.matchWinner).toBe(1);
    expect(end.scores).toEqual({ team1: 1000, team2: 990 });
  });

  it('the trick points decide when neither Stöck nor Weis does, and the match stops mid-hand', () => {
    const st = late(
      {
        trump: 'eicheln',
        hands: [
          [S('6'), R('6')],
          [S('7'), R('7')],
          [S('8'), R('8')],
          [S('A'), R('9')],
        ],
        current: 3,
      },
      { team1: 995, team2: 990 },
    );
    st.players[0].tricks = [Si('6'), Si('7'), Si('8'), Si('9')];
    const end = playOut(st);
    expect(end.matchWinner).toBe(2);
    expect(end.scores).toEqual({ team1: 995, team2: 1001 });
    expect(end.players[0].hand).toHaveLength(1); // the second trick is never played
  });
});

// --- Random play against independent implementations of the spec ---

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TRUMP_RANKS = '6 7 8 10 O K A 9 U'.split(' '); // weakest to strongest
function oracleLegal(hand: Card[], trick: Card[], contract: TrumpContract): Card[] {
  if (trick.length === 0) return hand;
  const lead = trick[0].suit;
  const follow = hand.filter((c) => c.suit === lead);
  if (contract === 'oben-abe' || contract === 'unden-ufe') return follow.length ? follow : hand;
  const trumps = hand.filter((c) => c.suit === contract);
  if (lead === contract) return trumps.some((c) => c.rank !== 'U') ? trumps : hand;
  if (trumps.length === hand.length) return hand;
  const inTrick = trick.filter((c) => c.suit === contract).map((c) => TRUMP_RANKS.indexOf(c.rank));
  const over = trumps.filter((c) => inTrick.every((r) => TRUMP_RANKS.indexOf(c.rank) > r));
  const rest = follow.length ? follow : hand.filter((c) => c.suit !== contract);
  return [...rest, ...over];
}

const SIDE_RANKS = '6 7 8 9 10 U O K A'.split(' ');
function oracleWinner(trick: (Card & { playerId: number })[], contract: TrumpContract): number {
  const power = (c: Card) => {
    if (c.suit === contract) return 100 + TRUMP_RANKS.indexOf(c.rank);
    if (c.suit !== trick[0].suit) return -1;
    const i = SIDE_RANKS.indexOf(c.rank);
    return contract === 'unden-ufe' ? 8 - i : i;
  };
  return trick.reduce((best, c) => (power(c) > power(best) ? c : best)).playerId;
}

function oraclePoints(c: Card, contract: TrumpContract): number {
  const side: Record<string, number> = { A: 11, '10': 10, K: 4, O: 3, U: 2 };
  if (contract === 'oben-abe') return c.rank === '8' ? 8 : side[c.rank] || 0;
  if (contract === 'unden-ufe')
    return c.rank === '8' ? 8 : c.rank === '6' ? 11 : c.rank === 'A' ? 0 : side[c.rank] || 0;
  if (c.suit === contract) return c.rank === 'U' ? 20 : c.rank === '9' ? 14 : side[c.rank] || 0;
  return side[c.rank] || 0;
}

describe('random hands', () => {
  afterEach(() => vi.restoreAllMocks());

  it('400 hands: every legal set, trick winner and final score matches the spec', () => {
    const rand = mulberry32(20261113);
    vi.spyOn(Math, 'random').mockImplementation(rand);
    const seen = new Set<string>();
    for (let n = 0; n < 400; n++) {
      let st = startGameLocal(undefined, BOTS, undefined, rand);
      if (rand() < 0.3) st = setTrumpAndDetectWeis(st, 'schieben');
      const contract = CONTRACTS[Math.floor(rand() * 6)];
      st = setTrumpAndDetectWeis(st, contract);
      seen.add(contract);
      const mult = {
        eicheln: 1,
        rosen: 1,
        schellen: 2,
        schilten: 2,
        'oben-abe': 3,
        'unden-ufe': 3,
      }[contract];
      expect(st.currentPlayer).toBe(st.forehand);

      const weis = calculateTeamWeis(st.players, contract, st.forehand);
      const raw = [0, 0];
      const tricksWon = [0, 0];
      for (const p of st.players) {
        const stoeck = ['K', 'O'].every((r) =>
          p.hand.some((c) => c.suit === contract && c.rank === r),
        );
        if (stoeck) raw[p.team - 1] += 20;
      }
      for (let trickNo = 0; trickNo < 9; trickNo++) {
        const leader = st.currentPlayer;
        for (let k = 0; k < 4; k++) {
          const me = (leader - k + 4) % 4;
          expect(st.currentPlayer).toBe(me);
          const hand = st.players[me].hand;
          const legal = getLegalCardsForPlayer(st, me);
          expect(ids(legal)).toEqual(ids(oracleLegal(hand, st.currentTrick, contract)));
          st = playCardLocal(st, me, legal[Math.floor(rand() * legal.length)].id);
        }
        const trick = st.currentTrick;
        const winner = oracleWinner(trick, contract);
        const team = winner % 2 === 0 ? 0 : 1;
        raw[team] +=
          trick.reduce((s, c) => s + oraclePoints(c, contract), 0) + (trickNo === 8 ? 5 : 0);
        tricksWon[team]++;
        st = resolveTrick(st);
        if (trickNo < 8) expect(st.currentPlayer).toBe(winner);
      }
      expect(st.phase).toBe('finished');
      const total = (t: 0 | 1) =>
        mult * (raw[t] + (t === 0 ? weis.team1 : weis.team2) + (tricksWon[t] === 9 ? 100 : 0));
      expect(st.scores).toEqual({ team1: total(0), team2: total(1) });
    }
    expect(seen.size).toBe(6);
  });

  it('60 matches to 1000: exactly one winner, who is the only team at the target', () => {
    const rand = mulberry32(1291);
    vi.spyOn(Math, 'random').mockImplementation(rand);
    for (let n = 0; n < 60; n++) {
      let st = startGameLocal(undefined, BOTS, 1000, rand);
      let hands = 0;
      for (;;) {
        st = setTrumpAndDetectWeis(st, CONTRACTS[Math.floor(rand() * 6)]);
        st = playOut(st, (_s, legal) => legal[Math.floor(rand() * legal.length)]);
        if (st.matchWinner) break;
        expect(Math.max(st.scores.team1, st.scores.team2)).toBeLessThan(1000);
        expect(++hands).toBeLessThan(40);
        st = startNewHand(st);
      }
      const [win, lose] =
        st.matchWinner === 1
          ? [st.scores.team1, st.scores.team2]
          : [st.scores.team2, st.scores.team1];
      expect(win).toBeGreaterThanOrEqual(1000);
      expect(lose).toBeLessThan(1000);
    }
  });
});

describe('card points', () => {
  it('match the independent table for every card and contract', () => {
    for (const contract of CONTRACTS)
      for (const s of suits)
        for (const r of ranks)
          expect(cardPoints(C(s, r), contract)).toBe(oraclePoints(C(s, r), contract));
  });
});
