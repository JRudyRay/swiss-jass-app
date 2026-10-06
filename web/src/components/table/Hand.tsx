import React from 'react';
import { SwissCard } from '../../SwissCard';

type Props = {
  cards: any[]; // already sorted for display
  legalCards: any[];
  selectedCard: string | null;
  // False while the trump is being chosen: nothing is dimmed then.
  markPlayability: boolean;
  reasonFor: (card: any) => string | null;
  onCardTap: (card: any, playable: boolean, reason: string | null) => void;
};

// The player's cards as an overlapping fan along the bottom. Slots shrink (flex) so nine cards
// fit one row on a phone while each corner index stays visible.
const Hand: React.FC<Props> = ({
  cards,
  legalCards,
  selectedCard,
  markPlayability,
  reasonFor,
  onCardTap,
}) => (
  <div className="hand-dock">
    <div className="hand" role="group">
      {cards.map((card, i) => {
        const playable = legalCards.some((c: any) => c.id === card.id);
        const reason = !playable ? reasonFor(card) : null;
        const selected = selectedCard === card.id;
        const dim = markPlayability && legalCards.length > 0 && !playable;
        const tap = () => onCardTap(card, playable, reason);
        return (
          <div
            key={card.id}
            className={`hand-slot${selected ? ' hand-slot--sel' : ''}`}
            style={{ '--i': i, '--n': cards.length } as React.CSSProperties}
          >
            {/* Tap to select, tap again to play (dblclick never fires reliably on touch). */}
            <div
              className={`hand-card${selected ? ' hand-card--sel' : ''}`}
              role="button"
              tabIndex={0}
              data-card-id={card.id}
              data-playable={playable ? 'true' : 'false'}
              aria-disabled={dim ? true : undefined}
              aria-pressed={selected}
              aria-label={`${card.suit} ${card.rank}`}
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

export default Hand;
