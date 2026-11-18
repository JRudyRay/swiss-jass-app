import React from 'react';
import { SwissCard } from '../../SwissCard';
import { messages, type Lang } from '../../i18n';

// The deal: cards fly in one after another (stagger, flight) and the bots wait this long.
export const DEAL_STAGGER_MS = 50;
export const DEAL_FLY_MS = 260;
export const DEAL_MS = 8 * DEAL_STAGGER_MS + DEAL_FLY_MS + 40;

// Where the cards come from, relative to the hand, by the dealer's seat.
const DEAL_FROM: Record<string, [number, number]> = {
  north: [0, -320],
  west: [-240, -180],
  east: [240, -180],
  south: [0, -90],
};

type Props = {
  lang: Lang;
  // Incremented for every fresh deal (0 = none yet, e.g. after a reload): the cards fly in.
  dealSeq?: number;
  dealFrom?: string;
  // Timing multiplier of the animation-speed setting.
  dealScale?: number;
  // One-time tip above the hand ("tap to select, tap again to play").
  tapHint?: string | null;
  cards: any[]; // already sorted for display
  legalCards: any[];
  selectedCard: string | null;
  // False while the trump is being chosen: nothing is dimmed then.
  markPlayability: boolean;
  // The player is to play a card now: the playable cards step forward.
  myTurn?: boolean;
  // Training mode: the card the coach recommends, with the badge text.
  hintCard?: string | null;
  hintLabel?: string;
  reasonFor: (card: any) => string | null;
  onCardTap: (card: any, playable: boolean, reason: string | null) => void;
};

// The player's cards as an overlapping fan along the bottom. Slots shrink (flex) so nine cards
// fit one row on a phone while each corner index stays visible.
const Hand: React.FC<Props> = ({
  lang,
  dealSeq = 0,
  dealFrom = 'north',
  dealScale = 1,
  tapHint,
  cards,
  legalCards,
  selectedCard,
  markPlayability,
  myTurn,
  hintCard,
  hintLabel,
  reasonFor,
  onCardTap,
}) => {
  const m = messages(lang);
  const label = (c: any) => `${m.suits[c.suit] || c.suit} ${m.ranks[c.rank] || c.rank}`;
  const [dx, dy] = DEAL_FROM[dealFrom] || DEAL_FROM.north;
  // Two identical keyframe sets alternate, so every deal restarts the animation on cards that
  // keep their element (the same card dealt again).
  const dealCls = dealSeq > 0 ? ` hand--deal-${dealSeq % 2 ? 'a' : 'b'}` : '';
  return (
    <div className="hand-dock">
      {tapHint && (
        <div className="hand-tip" role="status" data-tap-hint>
          {tapHint}
        </div>
      )}
      <div
        className={`hand${myTurn ? ' hand--turn' : ''}${dealCls}`}
        role="group"
        style={
          {
            '--deal-x': `${dx}px`,
            '--deal-y': `${dy}px`,
            '--deal-k': dealScale,
          } as React.CSSProperties
        }
      >
        {cards.map((card, i) => {
          const playable = legalCards.some((c: any) => c.id === card.id);
          const reason = !playable ? reasonFor(card) : null;
          const selected = selectedCard === card.id;
          const hint = !!hintCard && hintCard === card.id;
          const dim = markPlayability && legalCards.length > 0 && !playable;
          const tap = () => onCardTap(card, playable, reason);
          return (
            <div
              key={card.id}
              className={`hand-slot${selected ? ' hand-slot--sel' : ''}${hint ? ' hand-slot--hint' : ''}`}
              style={{ '--i': i, '--n': cards.length } as React.CSSProperties}
            >
              {/* Tap to select, tap again to play (dblclick never fires reliably on touch). */}
              <div
                className={`hand-card${selected ? ' hand-card--sel' : ''}${hint ? ' hand-card--hint' : ''}`}
                data-hint={hint ? hintLabel || '' : undefined}
                role="button"
                tabIndex={0}
                data-card-id={card.id}
                data-playable={playable ? 'true' : 'false'}
                aria-disabled={dim ? true : undefined}
                aria-pressed={selected}
                aria-label={label(card)}
                title={reason || undefined}
                onClick={tap}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    tap();
                  }
                }}
              >
                <SwissCard card={card} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Hand;
