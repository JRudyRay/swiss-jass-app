import React, { useState } from 'react';
import { SuitIcon, CourtFigure } from './components/SwissCardSVG';
import { SuitIcon as SuitMark } from './components/table/SuitBadge';

interface CardProps {
  card: any;
  // Kept for callers; styling of selected/playable state lives on the wrapper (see Hand).
  isSelected?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
}

const SUIT_COLORS: Record<string, string> = {
  eicheln: '#8B4513',
  schellen: '#FFD700',
  rosen: '#DC143C',
  schilten: '#2F4F4F',
};

// One playing card: the printed Hasle image with a readable corner index (rank + suit),
// or an SVG card when the image is missing. Sizing comes from --cw (see GameTable.css).
export const SwissCard: React.FC<CardProps> = ({ card, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const isCourtCard = ['U', 'O', 'K'].includes(card.rank);
  const suitColor = SUIT_COLORS[card.suit] || '#000';

  // Public-domain Hasle deck, late 19th century (see public/assets/cards/README.md).
  // BASE_URL keeps the path right under the GitHub Pages subpath.
  const baseUrl: string = (import.meta as any).env?.BASE_URL || '/';
  const cardImagePath = `${baseUrl}assets/cards/${card.suit}_${card.rank}.webp`;
  const cls = ['swiss-card', imageError && 'swiss-card--svg', card.isTrump && 'swiss-card--trump']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} onClick={onClick}>
      {!imageError ? (
        <>
          <img
            className="swiss-card__img"
            src={cardImagePath}
            alt={`${card.suit} ${card.rank}`}
            draggable={false}
            onError={() => setImageError(true)}
          />
          {/* Corner index: stays visible when the hand overlaps. */}
          <div className="swiss-card__index" aria-hidden="true">
            <span className="swiss-card__rank">{card.rank}</span>
            <SuitMark trump={card.suit} size={14} />
          </div>
        </>
      ) : (
        <>
          <div className="swiss-card__rank swiss-card__rank--svg" style={{ color: suitColor }}>
            {card.rank}
          </div>
          <div className="swiss-card__mid">
            {isCourtCard ? (
              <CourtFigure rank={card.rank} suit={card.suit} color={suitColor} />
            ) : (
              <SuitIcon suit={card.suit} color={suitColor} size={35} />
            )}
          </div>
          <div
            className="swiss-card__rank swiss-card__rank--svg swiss-card__rank--flip"
            style={{ color: suitColor }}
          >
            {card.rank}
          </div>
        </>
      )}
      {card.isTrump && (
        <div className="swiss-card__trump" aria-hidden="true">
          ♔
        </div>
      )}
    </div>
  );
};
