import React from 'react';

// Trump modes with their names. Suit icons are cut from the 1850 deck
// (scripts/make-suit-icons.py); Obenabe/Undenufe get an arrow.
const NAMES: Record<string, { en: string; ch: string }> = {
  eicheln: { en: 'Acorns', ch: 'Eichle' },
  schellen: { en: 'Bells', ch: 'Schelle' },
  rosen: { en: 'Roses', ch: 'Rose' },
  schilten: { en: 'Shields', ch: 'Schilte' },
  'oben-abe': { en: 'Top down', ch: 'Obenabe' },
  'unden-ufe': { en: 'Bottom up', ch: 'Undenufe' },
};

export function trumpName(trump: string, lang: 'en' | 'ch'): string {
  return NAMES[trump]?.[lang] ?? trump;
}

export const SuitIcon: React.FC<{ trump: string; size?: number }> = ({ trump, size = 24 }) => {
  if (trump === 'oben-abe' || trump === 'unden-ufe') {
    const up = trump === 'oben-abe';
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d={up ? 'M12 3 L20 13 H15 V21 H9 V13 H4 Z' : 'M12 21 L20 11 H15 V3 H9 V11 H4 Z'} fill="#3b2a1a" />
      </svg>
    );
  }
  if (!NAMES[trump]) return null;
  const base: string = ((import.meta as any).env?.BASE_URL) || '/';
  return <img src={`${base}assets/suits/${trump}.png`} alt="" width={size} height={size} style={{ display: 'block', objectFit: 'contain' }} />;
};
