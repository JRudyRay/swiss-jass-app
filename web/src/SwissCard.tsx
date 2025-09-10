import React from 'react';

interface CardProps {
  card: any;
  isSelected?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
}

export const SwissCard: React.FC<CardProps> = ({ card, isSelected, isPlayable, onClick }) => {
  const suitSymbols: { [key: string]: string } = {
    eicheln: '🌰',
    schellen: '🔔',
    rosen: '🌹',
    schilten: '🛡️'
  };

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

  const getCardStyle = () => {
    let backgroundColor = 'white';
    let border = '2px solid #e5e7eb';
    let cursor = 'default';
    let transform = 'none';
    let boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    
    if (isSelected) {
      backgroundColor = '#3B82F6';
      transform = 'translateY(-10px)';
      boxShadow = '0 10px 20px rgba(59, 130, 246, 0.4)';
    }
    
    if (card.isTrump) {
      border = '3px solid #FFD700';
      boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
    }
    
    if (isPlayable) {
      cursor = 'pointer';
      if (!isSelected) {
        border = '2px solid #10b981';
      }
    }
    
    if (!isPlayable && onClick) {
      opacity: 0.6;
    }
    
    return {
      width: '70px',
      height: '100px',
      backgroundColor,
      border,
      borderRadius: '10px',
      padding: '6px',
      margin: '2px',
      cursor,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'space-between',
      fontSize: '14px',
      color: isSelected ? 'white' : 'black',
      position: 'relative' as const,
      transform,
      transition: 'all 0.2s ease',
      boxShadow,
      opacity: isPlayable === false ? 0.6 : 1,
    };
  };

  const displayRank = rankDisplay[card.rank] || card.rank;

  return (
    <div style={getCardStyle()} onClick={isPlayable ? onClick : undefined}>
      {/* Top rank */}
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '16px',
        color: isSelected ? 'white' : suitColors[card.suit] 
      }}>
        {displayRank}
      </div>
      
      {/* Center suit symbol */}
      <div style={{
        fontSize: '28px', 
        textAlign: 'center',
        filter: isSelected ? 'brightness(1.2)' : 'none'
      }}>
        {suitSymbols[card.suit]}
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
      
      {/* Trump indicator */}
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
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          ♔
        </div>
      )}
      
      {/* Playable indicator */}
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
          animation: 'pulse 1.5s infinite'
        }} />
      )}
      
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
    </div>
  );
};
