import * as Schieber from '../engine/schieber';
import * as Bot from '../engine/bot';
import { strongCardId } from '../engine/strongBot';

// How well the bots play. 'normal' is the current bot (engine/bot.ts); 'easy' is the older, simpler
// logic that sometimes plays any legal card at random; 'strong' plays its cards by Monte Carlo
// search over the deals that fit what its seat has seen (engine/strongBot.ts) and chooses trump
// like 'normal'. Another level only needs an entry in LEVELS, a case in botPolicy() and the
// matching strings.
export const LEVELS = ['easy', 'normal', 'strong'] as const;
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

// The search only sees what a player at that seat knows (see viewOf in engine/strongBot.ts). Any
// failure falls back to the normal bot's card.
const STRONG: BotPolicy = {
  trump: Bot.chooseTrump,
  card: (state, seat) => {
    try {
      return strongCardId(state, seat, Bot.chooseCard);
    } catch {
      return Bot.chooseCard(state, seat);
    }
  },
};

export function botPolicy(level: BotLevel): BotPolicy {
  return level === 'easy' ? EASY : level === 'strong' ? STRONG : NORMAL;
}
