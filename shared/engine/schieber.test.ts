import { describe, expect, it } from 'vitest';
import { cardPoints, createDeck, ranks, suits, compareCards, rankOrderIndex } from './schieber';
import type { TrumpContract } from './schieber';

const deckTotal = (contract: TrumpContract) =>
  createDeck().reduce((sum, c) => sum + cardPoints(c, contract), 0);

describe('card points', () => {
  it('every contract totals 152 card points (plus 5 for the last trick)', () => {
    for (const c of [...suits, 'oben-abe', 'unden-ufe'] as TrumpContract[]) {
      expect(deckTotal(c)).toBe(152);
    }
  });

  it('trump Under is 20 and Nell (9) is 14', () => {
    expect(cardPoints({ suit: 'rosen', rank: 'U' }, 'rosen')).toBe(20);
    expect(cardPoints({ suit: 'rosen', rank: '9' }, 'rosen')).toBe(14);
  });

  it('Undenufe: 6 is worth 11, Ass 0; Obenabe: every 8 is worth 8', () => {
    expect(cardPoints({ suit: 'eicheln', rank: '6' }, 'unden-ufe')).toBe(11);
    expect(cardPoints({ suit: 'eicheln', rank: 'A' }, 'unden-ufe')).toBe(0);
    expect(cardPoints({ suit: 'eicheln', rank: '8' }, 'oben-abe')).toBe(8);
  });
});

describe('card order', () => {
  it('Undenufe reverses the order, Obenabe keeps Ass on top', () => {
    expect(rankOrderIndex('6', 'unden-ufe', false)).toBeLessThan(
      rankOrderIndex('A', 'unden-ufe', false),
    );
    expect(rankOrderIndex('A', 'oben-abe', false)).toBeLessThan(
      rankOrderIndex('6', 'oben-abe', false),
    );
  });

  it('trump Under beats trump Nell, and any trump beats a non-trump Ass', () => {
    const under = { id: 'u', suit: 'eicheln', rank: 'U' } as any;
    const nell = { id: 'n', suit: 'eicheln', rank: '9' } as any;
    const ass = { id: 'a', suit: 'rosen', rank: 'A' } as any;
    expect(compareCards(under, nell, 'eicheln', 'eicheln')).toBeLessThan(0);
    expect(compareCards(under, ass, 'eicheln', 'rosen')).toBeGreaterThan(0);
  });

  it('deck has 36 distinct cards', () => {
    expect(createDeck()).toHaveLength(suits.length * ranks.length);
  });
});
