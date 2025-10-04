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
  const [imageLoaded, setImageLoaded] = useState(false);

  const suitColors: { [key: string]: string } = {
    eicheln: '#8B4513',
    schellen: '#FFD700',
    rosen: '#DC143C',
    schilten: '#2F4F4F'
  };

  const rankDisplay: { [key: string]: string } = {
    'U': 'U',
    'O': 'O',
    'K': 'K',
    'A': 'A'
  };

  const isCourtCard = ['U', 'O', 'K'].includes(card.rank);
  const suitColor = suitColors[card.suit] || '#000';

  // Get card image path (public folder)
  const getCardImagePath = () => {
    return `/assets/cards/${card.suit}_${card.rank}.png`;
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const getCardStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: '80px',
      height: '112px',
      backgroundColor: imageLoaded && !imageError ? 'transparent' : 'white',
      borderRadius: '10px',
      padding: imageLoaded && !imageError ? '0' : '6px',
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
      opacity: isPlayable === false ? 0.5 : 1,
      filter: isPlayable === false ? 'grayscale(40%)' : 'none',
    };
    
    if (isSelected) {
      baseStyle.transform = 'translateY(-16px) scale(1.1)';
      baseStyle.boxShadow = '0 20px 40px rgba(245, 158, 11, 0.6), 0 0 0 3px #f59e0b';
      baseStyle.border = '2px solid #f59e0b';
      baseStyle.zIndex = 101;
    } else if (isPlayable && !isSelected) {
      baseStyle.border = '2px solid #10b981';
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
    if (!imageError) {
      return (
        <>
          <img
            src={getCardImagePath()}
            alt={`${card.suit} ${card.rank}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '10px',
              display: imageLoaded ? 'block' : 'none',
            }}
          />
          {/* Show loading state while image loads */}
          {!imageLoaded && (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#999'
            }}>
              Loading...
            </div>
          )}
        </>
      );
    }

    // SVG Fallback rendering
    return (
      <>
        {/* Top rank */}
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '16px',
          color: isSelected ? 'white' : suitColors[card.suit] 
        }}>
          {displayRank}
        </div>
        
        {/* Center suit symbol or court figure */}
        <div style={{
          fontSize: '28px', 
          textAlign: 'center',
          filter: isSelected ? 'brightness(1.2)' : 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexGrow: 1
        }}>
          {isCourtCard ? (
            <CourtFigure rank={card.rank} suit={card.suit} color={suitColor} />
          ) : (
            <SuitIcon suit={card.suit} color={suitColor} size={35} />
          )}
        </div>
        
        {/* Bottom rank (rotated) */}
        <div style={{ 
          transform: 'rotate(180deg)', 
          fontWeight: 'bold',
          fontSize: '16px',
          color: isSelected ? 'white' : suitColors[card.suit]
        }}>
          {displayRank}
        </div>
        
        {/* Points indicator for high value cards */}
        {card.points >= 10 && (
          <div style={{
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
            color: isSelected ? 'white' : 'black'
          }}>
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
        <div style={{
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
          zIndex: 10
        }}>
          ♔
        </div>
      )}
      
      {/* Playable indicator (overlay) */}
      {isPlayable && !isSelected && (
        <div style={{
          position: 'absolute',
          bottom: '-5px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '8px',
          height: '8px',
          background: '#10b981',
          borderRadius: '50%',
          animation: 'pulse 1.5s infinite',
          zIndex: 10
        }} />
      )}
    </div>
  );
};
