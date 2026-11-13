import {
  type Card,
  type Rank,
  type State,
  type Suit,
  type TrumpContract,
  cardPoints,
  getCurrentTrickWinner,
  getLegalCardsForPlayer,
  isCardBetter,
  rankOrderIndex,
  ranks,
  suits,
} from '../engine/schieber';
import { buildMemory, chooseCard, chooseTrump, pushedTrumpLead, sureTricks } from '../engine/bot';

// Training mode: the coach recommends what the bot would play, says why in terms of the usual
// Schieber habits, and reads what the other seats' plays tell you. Pure functions over the public
// state plus the player's own hand (the coach never looks at hidden cards). Strategy advice only:
// nothing here changes the rules.

export type CoachKey =
  // why a card
  | 'only'
  | 'pushedLeadTrump'
  | 'drawTrump'
  | 'leadTrump'
  | 'cashBock'
  | 'feedPartner'
  | 'leadLow'
  | 'leadAny'
  | 'secure'
  | 'schmieren'
  | 'partnerLow'
  | 'ruff'
  | 'win'
  | 'winLast'
  | 'notWorth'
  | 'cantWin'
  | 'discard'
  // why a contract
  | 'trumpPush'
  | 'trumpForced'
  | 'trumpPuurNell'
  | 'trumpPuur'
  | 'trumpNell'
  | 'trumpLong'
  | 'trumpOben'
  | 'trumpUnden'
  // what another seat's play tells you
  | 'sigPartnerChose'
  | 'sigPartnerChoseSlalom'
  | 'sigTrumpLead'
  | 'sigTopLead'
  | 'sigBockLead'
  | 'sigAnziehen'
  | 'sigPartnerRuffs'
  | 'sigSchmieren'
  | 'sigVerwerfen'
  | 'sigOppNoTrump'
  | 'sigOppRuffs'
  | 'sigOppVoid'
  | 'sigTrumpsGone';

export type CardRef = { suit: Suit; rank: Rank };
export type CoachNote = {
  key: CoachKey;
  card?: CardRef;
  suit?: Suit;
  contract?: TrumpContract;
  n?: number;
  seat?: number;
};
export type Signal = CoachNote & { prio: number };
export type TrumpChoice = TrumpContract | 'schieben';

const teamOf = (seat: number) => (seat % 2 === 0 ? 1 : 2);
const trumpSuitOf = (contract: TrumpContract | null | undefined): Suit | null =>
  contract && (suits as string[]).includes(contract) ? (contract as Suit) : null;

// Why `cardId` is (or would be) played by `seat` in this position.
export function explainCard(state: State, seat: number, cardId: string): CoachNote {
  const legal = getLegalCardsForPlayer(state, seat);
  const me = state.players.find((p) => p.id === seat)!;
  const card = me.hand.find((c) => c.id === cardId)!;
  if (legal.length <= 1 || !card) return { key: 'only' };
  const contract = state.trump as TrumpContract;
  const trump = trumpSuitOf(contract);
  const mem = buildMemory(state, seat);
  const partner = (seat + 2) % 4;
  const isT = (c: { suit: Suit }) => c.suit === trump;
  const str = (c: CardRef) => rankOrderIndex(c.rank, contract, isT(c));
  const pts = (c: Card) => cardPoints(c, contract);
  const boss = (c: Card) => !mem.unseen.some((u) => u.suit === c.suit && str(u) < str(c));
  const trick = state.currentTrick;

  if (trick.length === 0) {
    const ours = typeof state.declarer === 'number' && teamOf(state.declarer) === teamOf(seat);
    if (isT(card)) {
      if (pushedTrumpLead(state, seat)?.id === card.id) return { key: 'pushedLeadTrump' };
      if (mem.trumpsLeft === 0) return { key: 'cashBock', card };
      if (ours) return { key: boss(card) ? 'drawTrump' : 'leadTrump', n: mem.trumpsLeft };
      return { key: 'leadAny' };
    }
    if (boss(card)) return { key: 'cashBock', card };
    if (trump && mem.voids[partner].has(card.suit) && !mem.voids[partner].has(trump))
      return { key: 'feedPartner', suit: card.suit };
    return { key: 'leadLow', suit: card.suit };
  }

  const leadSuit = state.trickLead as Suit;
  const winning = getCurrentTrickWinner(trick, contract, leadSuit)!;
  const beats = (c: Card) => isCardBetter(c, winning, contract, leadSuit);
  const last = trick.length === 3;
  if (teamOf(winning.playerId) === teamOf(seat)) {
    if (beats(card)) return { key: 'secure' };
    return pts(card) >= 3 ? { key: 'schmieren', card } : { key: 'partnerLow' };
  }
  if (beats(card)) {
    const trickPts = trick.reduce((s, c) => s + pts(c), 0) + pts(card);
    if (isT(card) && leadSuit !== trump) return { key: 'ruff', suit: leadSuit, n: trickPts };
    return { key: last ? 'winLast' : 'win', n: trickPts };
  }
  if (legal.some(beats)) return { key: 'notWorth' };
  if (card.suit === leadSuit || isT(card)) return { key: 'cantWin' };
  return { key: 'discard', suit: card.suit };
}

export function adviseCard(state: State, seat: number): { cardId: string; why: CoachNote } | null {
  if (state.phase !== 'playing' || state.currentPlayer !== seat) return null;
  const cardId = chooseCard(state, seat);
  if (!cardId) return null;
  return { cardId, why: explainCard(state, seat, cardId) };
}

export type Review = { tone: 'good' | 'better'; why: CoachNote; card?: CardRef };

// Compare the card the player chose with the coach's card. `before` is the state in which the
// player was to play. Returns null when there was no real choice.
export function reviewCard(before: State, seat: number, playedId: string): Review | null {
  const advice = adviseCard(before, seat);
  if (!advice || advice.why.key === 'only') return null;
  if (advice.cardId === playedId) return { tone: 'good', why: advice.why };
  const hand = before.players.find((p) => p.id === seat)!.hand;
  const mine = hand.find((c) => c.id === playedId);
  const best = hand.find((c) => c.id === advice.cardId);
  if (!mine || !best) return null;
  // A neighbouring card of the same suit played for the same reason is just as good.
  const contract = before.trump as TrumpContract;
  const same =
    mine.suit === best.suit &&
    cardPoints(mine, contract) === cardPoints(best, contract) &&
    explainCard(before, seat, playedId).key === advice.why.key;
  if (same) return { tone: 'good', why: advice.why };
  return { tone: 'better', why: advice.why, card: { suit: best.suit, rank: best.rank } };
}

export function adviseTrump(state: State, seat: number): { choice: TrumpChoice; why: CoachNote } {
  const choice = chooseTrump(state, seat);
  if (choice === 'schieben') return { choice, why: { key: 'trumpPush' } };
  const hand = state.players.find((p) => p.id === seat)?.hand || [];
  const forced = typeof state.forehand === 'number' && state.forehand !== seat;
  const sure = sureTricks(hand, choice);
  const trump = trumpSuitOf(choice);
  if (!trump) {
    if (forced && sure < 3) return { choice, why: { key: 'trumpForced', contract: choice } };
    return {
      choice,
      why: { key: choice === 'oben-abe' ? 'trumpOben' : 'trumpUnden', n: sure },
    };
  }
  if (forced && sure < 2) return { choice, why: { key: 'trumpForced', contract: choice } };
  const has = (r: Rank) => hand.some((c) => c.suit === trump && c.rank === r);
  const n = hand.filter((c) => c.suit === trump).length;
  const key = has('U')
    ? has('9')
      ? 'trumpPuurNell'
      : 'trumpPuur'
    : has('9')
      ? 'trumpNell'
      : 'trumpLong';
  return { choice, why: { key, suit: trump, n } };
}

export type TrumpReview = { tone: 'good' | 'better'; why: CoachNote; choice?: TrumpChoice };

export function reviewTrump(before: State, seat: number, picked: TrumpChoice): TrumpReview {
  const advice = adviseTrump(before, seat);
  if (advice.choice === picked) return { tone: 'good', why: advice.why };
  return { tone: 'better', why: advice.why, choice: advice.choice };
}

// Your partner named the contract after you pushed: what to open with.
export function readContract(state: State, me: number): Signal | null {
  const partner = (me + 2) % 4;
  if (state.declarer !== partner || state.forehand !== me || !state.trump) return null;
  const contract = state.trump as TrumpContract;
  return trumpSuitOf(contract)
    ? { key: 'sigPartnerChose', seat: partner, contract, prio: 4 }
    : { key: 'sigPartnerChoseSlalom', seat: partner, contract, prio: 4 };
}

// What the card just played (the last entry of `state.played`) tells the player in seat `me`.
export function readPlay(state: State, me: number): Signal | null {
  const played = state.played || [];
  const e = played[played.length - 1];
  if (!e || e.playerId === me || !state.trump) return null;
  const contract = state.trump as TrumpContract;
  const trump = trumpSuitOf(contract);
  const partner = (me + 2) % 4;
  const hand = state.players.find((p) => p.id === me)?.hand || [];
  const earlier = played.slice(0, -1);
  const gone = (s: Suit, r: Rank, list = played) => list.some((p) => p.suit === s && p.rank === r);
  const mine = (s: Suit, r: Rank) => hand.some((c) => c.suit === s && c.rank === r);
  const str = (s: Suit, r: Rank) => rankOrderIndex(r, contract, s === trump);
  const card: CardRef = { suit: e.suit, rank: e.rank };

  // The last trump the others held has just fallen.
  if (trump && e.suit === trump && hand.length > 0) {
    const out = ranks.filter((r) => !gone(trump, r) && !mine(trump, r)).length;
    if (out === 0) return { key: 'sigTrumpsGone', prio: 4 };
  }

  if (e.playerId === partner) {
    if (e.lead === null) {
      if (trump && e.suit === trump) {
        const out = ranks.filter((r) => !gone(trump, r) && !mine(trump, r)).length;
        return { key: 'sigTrumpLead', seat: partner, n: out, prio: 3 };
      }
      const top = !ranks.some(
        (r) => str(e.suit, r) < str(e.suit, e.rank) && !gone(e.suit, r, earlier),
      );
      if (top) return { key: trump ? 'sigBockLead' : 'sigTopLead', card, seat: partner, prio: 3 };
      return { key: 'sigAnziehen', suit: e.suit, seat: partner, prio: 3 };
    }
    if (e.suit === e.lead) return null;
    if (trump && e.suit === trump)
      return { key: 'sigPartnerRuffs', suit: e.lead, seat: partner, prio: 3 };
    const trick = earlier
      .filter((p) => p.trickNo === e.trickNo)
      .map((p) => ({
        id: `${p.suit}${p.rank}`,
        suit: p.suit,
        rank: p.rank,
        playerId: p.playerId,
      }));
    const winner = trick.length ? getCurrentTrickWinner(trick, contract, e.lead) : null;
    const points = cardPoints({ suit: e.suit, rank: e.rank }, contract);
    if (winner && teamOf(winner.playerId) === teamOf(me) && points >= 10)
      return { key: 'sigSchmieren', card, seat: partner, prio: 2 };
    return { key: 'sigVerwerfen', suit: e.suit, seat: partner, prio: 3 };
  }

  // An opponent could not follow suit.
  if (e.lead === null || e.suit === e.lead) return null;
  if (trump && e.lead === trump) {
    // Someone holding only the Under need not follow a trump lead.
    const underSeen = gone(trump, 'U', earlier) || mine(trump, 'U');
    return underSeen ? { key: 'sigOppNoTrump', seat: e.playerId, prio: 2 } : null;
  }
  if (trump && e.suit === trump)
    return { key: 'sigOppRuffs', seat: e.playerId, suit: e.lead, prio: 2 };
  return { key: 'sigOppVoid', seat: e.playerId, suit: e.lead, prio: 1 };
}
