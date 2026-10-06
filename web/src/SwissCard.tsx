import React, { useState } from 'react';
import { SuitIcon, CourtFigure } from './components/SwissCardSVG';

interface CardProps {
  card: any;
  isSelected?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
}

export const SwissCard: React.FC<CardProps> = ({ card, isSelected, isPlayable, onClick }) => {
  const [imageError, setImageError] = useState(false);

  const suitColors: { [key: string]: string } = {
    eicheln: '#8B4513',
    schellen: '#FFD700',
    rosen: '#DC143C',
    schilten: '#2F4F4F',
  };

  const rankDisplay: { [key: string]: string } = {
    U: 'U',
    O: 'O',
    K: 'K',
    A: 'A',
  };

  const isCourtCard = ['U', 'O', 'K'].includes(card.rank);
  const suitColor = suitColors[card.suit] || '#000';

  // Public-domain Hasle deck, late 19th century (see public/assets/cards/README.md).
  // BASE_URL keeps the path right under the GitHub Pages subpath.
  const baseUrl: string = (import.meta as any).env?.BASE_URL || '/';
  const cardImagePath = `${baseUrl}assets/cards/${card.suit}_${card.rank}.webp`;
  const useImage = !imageError;

  const getCardStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: 'var(--card-w, 74px)',
      height: 'var(--card-h, 112px)',
      backgroundColor: useImage ? '#efe6d2' : 'white',
      borderRadius: '8px',
      padding: useImage ? '0' : '6px',
      margin: '2px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontSize: '14px',
      position: 'relative',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      cursor: isPlayable ? 'pointer' : 'default',
      border: '2px solid #e5e7eb',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      color: isSelected ? 'white' : 'black',
      // Unplayable cards are only darkened a little so they stay readable.
      filter: isPlayable === false ? 'brightness(0.72)' : 'none',
    };

    if (isSelected) {
      baseStyle.transform = 'translateY(-16px) scale(1.1)';
      baseStyle.boxShadow = '0 20px 40px rgba(245, 158, 11, 0.6), 0 0 0 3px #f59e0b';
      baseStyle.border = '2px solid #f59e0b';
      baseStyle.zIndex = 101;
    } else if (isPlayable && !isSelected) {
      baseStyle.border = '2px solid #10b981';
      baseStyle.transform = 'translateY(-8px)';
      baseStyle.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.25), 0 0 0 1px #10b981';
    }

    if (card.isTrump) {
      baseStyle.boxShadow = '0 4px 20px rgba(255, 215, 0, 0.5), 0 0 15px rgba(255, 215, 0, 0.3)';
      baseStyle.border = '3px solid #FFD700';
    }

    return baseStyle;
  };

  const displayRank = rankDisplay[card.rank] || card.rank;

  // Render using real card image if available, fallback to SVG
  const renderCardContent = () => {
    if (useImage) {
      return (
        <>
          <img
            src={cardImagePath}
            alt={`${card.suit} ${card.rank}`}
            draggable={false}
            onError={() => setImageError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
          />
          {/* Corner index: pips are hard to count at hand size. */}
          <div
            style={{
              position: 'absolute',
              top: 3,
              left: 3,
              minWidth: 16,
              padding: '1px 3px',
              background: 'rgba(255,250,238,0.92)',
              borderRadius: 4,
              border: '1px solid rgba(0,0,0,0.15)',
              fontSize: 11,
              fontWeight: 800,
              lineHeight: '13px',
              textAlign: 'center',
              color: '#2b2118',
            }}
          >
            {displayRank}
          </div>
        </>
      );
    }

    // SVG Fallback rendering
    return (
      <>
        {/* Top rank */}
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: isSelected ? 'white' : suitColors[card.suit],
          }}
        >
          {displayRank}
        </div>

        {/* Center suit symbol or court figure */}
        <div
          style={{
            fontSize: '28px',
            textAlign: 'center',
            filter: isSelected ? 'brightness(1.2)' : 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
          }}
        >
          {isCourtCard ? (
            <CourtFigure rank={card.rank} suit={card.suit} color={suitColor} />
          ) : (
            <SuitIcon suit={card.suit} color={suitColor} size={35} />
          )}
        </div>

        {/* Bottom rank (rotated) */}
        <div
          style={{
            transform: 'rotate(180deg)',
            fontWeight: 'bold',
            fontSize: '16px',
            color: isSelected ? 'white' : suitColors[card.suit],
          }}
        >
          {displayRank}
        </div>

        {/* Points indicator for high value cards */}
        {card.points >= 10 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.1)',
              borderRadius: '50%',
              width: '25px',
              height: '25px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              color: isSelected ? 'white' : 'black',
            }}
          >
            {card.points}
          </div>
        )}
      </>
    );
  };

  return (
    <div style={getCardStyle()} onClick={isPlayable ? onClick : undefined}>
      {renderCardContent()}

      {/* Trump indicator (overlay) */}
      {card.isTrump && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            zIndex: 10,
          }}
        >
          ♔
        </div>
      )}

      {/* Playable indicator (overlay) */}
      {isPlayable && !isSelected && (
        <div
          style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '8px',
            height: '8px',
            background: '#10b981',
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite',
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};
