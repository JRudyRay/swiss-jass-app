import * as Schieber from '../engine/schieber';
import * as Bot from '../engine/bot';

// How well the bots play. 'normal' is the current bot (engine/bot.ts); 'easy' is the older, simpler
// logic that sometimes plays any legal card at random. A third level ('strong') only needs an
// entry in LEVELS, a case in botPolicy() and the matching strings.
export const LEVELS = ['easy', 'normal'] as const;
export type BotLevel = (typeof LEVELS)[number];
export const DEFAULT_LEVEL: BotLevel = 'normal';

export const isBotLevel = (v: unknown): v is BotLevel =>
  typeof v === 'string' && (LEVELS as readonly string[]).includes(v);

// Share of an easy bot's card plays that are a random legal card.
export const EASY_RANDOM = 0.15;

export type BotPolicy = {
  trump: (state: Schieber.State, seat: number) => Schieber.TrumpContract | 'schieben';
  card: (state: Schieber.State, seat: number) => string | null;
};

const NORMAL: BotPolicy = { trump: Bot.chooseTrump, card: Bot.chooseCard };

const EASY: BotPolicy = {
  trump: Schieber.chooseBotTrump,
  card: (state, seat) => {
    const pick = Schieber.chooseBotCard(state, seat);
    if (Math.random() >= EASY_RANDOM) return pick;
    const legal = Schieber.getLegalCardsForPlayer(state, seat);
    // Never an illegal card: a random one is taken from the legal ones only.
    return legal.length ? legal[Math.floor(Math.random() * legal.length)].id : pick;
  },
};

export function botPolicy(level: BotLevel): BotPolicy {
  return level === 'easy' ? EASY : NORMAL;
}
