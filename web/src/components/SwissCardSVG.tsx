import React from 'react';

/**
 * SVG-based Swiss Jass card suits with authentic cultural representations
 * Can be replaced with actual card images when available
 */

interface SuitIconProps {
  suit: string;
  color: string;
  size?: number;
}

export const SuitIcon: React.FC<SuitIconProps> = ({ suit, color, size = 40 }) => {
  const renderSuitSVG = () => {
    switch (suit) {
      case 'eicheln': // Acorns (Eicheln)
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            {/* Acorn cap */}
            <ellipse cx="50" cy="35" rx="25" ry="15" fill={color} />
            <path d="M 30,35 Q 30,40 35,42 L 45,48 Q 50,52 55,48 L 65,42 Q 70,40 70,35" fill={color} />
            {/* Acorn body */}
            <ellipse cx="50" cy="65" rx="20" ry="25" fill={color} opacity="0.8" />
            {/* Texture lines */}
            <line x1="40" y1="35" x2="38" y2="42" stroke="#654321" strokeWidth="1" />
            <line x1="50" y1="35" x2="50" y2="45" stroke="#654321" strokeWidth="1" />
            <line x1="60" y1="35" x2="62" y2="42" stroke="#654321" strokeWidth="1" />
          </svg>
        );
      
      case 'schellen': // Bells (Schellen)
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            {/* Bell body */}
            <path d="M 50,20 Q 35,25 30,45 L 30,60 Q 30,70 50,75 Q 70,70 70,60 L 70,45 Q 65,25 50,20 Z" 
                  fill={color} stroke="#333" strokeWidth="2" />
            {/* Bell top */}
            <rect x="45" y="15" width="10" height="8" rx="2" fill={color} />
            {/* Bell clapper */}
            <circle cx="50" cy="75" r="5" fill="#FFD700" />
            <line x1="50" y1="70" x2="50" y2="25" stroke="#666" strokeWidth="2" />
            {/* Sound waves */}
            <path d="M 20,50 Q 15,50 12,55" stroke={color} strokeWidth="2" fill="none" opacity="0.4" />
            <path d="M 80,50 Q 85,50 88,55" stroke={color} strokeWidth="2" fill="none" opacity="0.4" />
          </svg>
        );
      
      case 'rosen': // Roses (Rosen)
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            {/* Rose center */}
            <circle cx="50" cy="50" r="12" fill={color} />
            {/* Rose petals - outer layer */}
            <ellipse cx="35" cy="40" rx="15" ry="20" fill={color} opacity="0.7" transform="rotate(-30 35 40)" />
            <ellipse cx="65" cy="40" rx="15" ry="20" fill={color} opacity="0.7" transform="rotate(30 65 40)" />
            <ellipse cx="35" cy="60" rx="15" ry="20" fill={color} opacity="0.7" transform="rotate(30 35 60)" />
            <ellipse cx="65" cy="60" rx="15" ry="20" fill={color} opacity="0.7" transform="rotate(-30 65 60)" />
            {/* Rose petals - middle layer */}
            <ellipse cx="50" cy="32" rx="12" ry="15" fill={color} opacity="0.8" />
            <ellipse cx="68" cy="50" rx="12" ry="15" fill={color} opacity="0.8" transform="rotate(90 68 50)" />
            <ellipse cx="50" cy="68" rx="12" ry="15" fill={color} opacity="0.8" />
            <ellipse cx="32" cy="50" rx="12" ry="15" fill={color} opacity="0.8" transform="rotate(90 32 50)" />
            {/* Inner details */}
            <circle cx="50" cy="50" r="8" fill="#8B0000" opacity="0.6" />
          </svg>
        );
      
      case 'schilten': // Shields (Schilten)
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            {/* Shield outline */}
            <path d="M 50,10 L 80,25 L 80,55 Q 80,75 50,90 Q 20,75 20,55 L 20,25 Z" 
                  fill={color} stroke="#000" strokeWidth="3" />
            {/* Shield center emblem */}
            <rect x="45" y="30" width="10" height="35" fill="#fff" opacity="0.3" />
            <rect x="35" y="45" width="30" height="10" fill="#fff" opacity="0.3" />
            {/* Shield decorative lines */}
            <path d="M 30,35 Q 50,40 70,35" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" />
            <path d="M 30,60 Q 50,55 70,60" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" />
          </svg>
        );
      
      default:
        return <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={size}>?</text>;
    }
  };

  return <div style={{ display: 'inline-block' }}>{renderSuitSVG()}</div>;
};

/**
 * Court card figures (Unter, Ober, König) with Swiss styling
 */
interface CourtFigureProps {
  rank: string;
  suit: string;
  color: string;
}

export const CourtFigure: React.FC<CourtFigureProps> = ({ rank, suit, color }) => {
  const renderFigure = () => {
    switch (rank) {
      case 'U': // Unter (Jack)
        return (
          <svg width="50" height="70" viewBox="0 0 50 70">
            {/* Simple representation of a servant/page */}
            <circle cx="25" cy="15" r="8" fill={color} /> {/* Head */}
            <rect x="20" y="23" width="10" height="20" fill={color} /> {/* Body */}
            <line x1="20" y1="30" x2="10" y2="40" stroke={color} strokeWidth="3" /> {/* Left arm */}
            <line x1="30" y1="30" x2="40" y2="40" stroke={color} strokeWidth="3" /> {/* Right arm */}
            <line x1="22" y1="43" x2="18" y2="60" stroke={color} strokeWidth="3" /> {/* Left leg */}
            <line x1="28" y1="43" x2="32" y2="60" stroke={color} strokeWidth="3" /> {/* Right leg */}
          </svg>
        );
      
      case 'O': // Ober (Officer)
        return (
          <svg width="50" height="70" viewBox="0 0 50 70">
            {/* Officer with hat */}
            <rect x="18" y="8" width="14" height="6" fill={color} /> {/* Hat brim */}
            <rect x="20" y="3" width="10" height="8" fill={color} /> {/* Hat top */}
            <circle cx="25" cy="18" r="7" fill={color} /> {/* Head */}
            <rect x="18" y="25" width="14" height="22" fill={color} /> {/* Body */}
            <line x1="18" y1="30" x2="8" y2="38" stroke={color} strokeWidth="3" /> {/* Left arm */}
            <line x1="32" y1="30" x2="42" y2="38" stroke={color} strokeWidth="3" /> {/* Right arm */}
            <line x1="21" y1="47" x2="18" y2="65" stroke={color} strokeWidth="3" /> {/* Left leg */}
            <line x1="29" y1="47" x2="32" y2="65" stroke={color} strokeWidth="3" /> {/* Right leg */}
          </svg>
        );
      
      case 'K': // König (King)
        return (
          <svg width="50" height="70" viewBox="0 0 50 70">
            {/* King with crown */}
            <path d="M 15,8 L 18,3 L 21,8 L 25,2 L 29,8 L 32,3 L 35,8 Z" fill="#FFD700" /> {/* Crown */}
            <circle cx="25" cy="18" r="8" fill={color} /> {/* Head */}
            <rect x="17" y="26" width="16" height="24" fill={color} /> {/* Body */}
            <line x1="17" y1="32" x2="5" y2="40" stroke={color} strokeWidth="4" /> {/* Left arm */}
            <line x1="33" y1="32" x2="45" y2="40" stroke={color} strokeWidth="4" /> {/* Right arm */}
            <line x1="21" y1="50" x2="18" y2="68" stroke={color} strokeWidth="4" /> {/* Left leg */}
            <line x1="29" y1="50" x2="32" y2="68" stroke={color} strokeWidth="4" /> {/* Right leg */}
            {/* Scepter */}
            <line x1="45" y1="40" x2="48" y2="55" stroke="#FFD700" strokeWidth="2" />
            <circle cx="48" cy="52" r="3" fill="#FFD700" />
          </svg>
        );
      
      default:
        return null;
    }
  };

  return <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>{renderFigure()}</div>;
};
