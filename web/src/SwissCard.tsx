import React, { useState, useEffect } from 'react';

interface CardProps {
  card: any;
  isSelected?: boolean;
  onClick?: () => void;
}

export const SwissCard: React.FC<CardProps> = ({ card, isSelected, onClick }) => {
  const suitSymbols = {
    eicheln: '??',
    schellen: '??',
    rosen: '??',
    schilten: '???'
  };

  const cardStyle = {
    width: '60px',
    height: '90px',
    backgroundColor: isSelected ? '#3B82F6' : 'white',
    border: card.isTrump ? '2px solid gold' : '2px solid #ccc',
    borderRadius: '8px',
    padding: '4px',
    margin: '2px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    fontSize: '12px',
    color: isSelected ? 'white' : 'black'
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      <div>{card.rank}</div>
      <div style={{fontSize: '20px', textAlign: 'center'}}>
        {suitSymbols[card.suit]}
      </div>
      <div style={{transform: 'rotate(180deg)'}}>{card.rank}</div>
      {card.isTrump && <div style={{position: 'absolute', top: '-5px', right: '-5px', background: 'gold', borderRadius: '50%', width: '15px', height: '15px'}}>?</div>}
    </div>
  );
};
