import React from 'react';

type Props = {
  count: number;
  // Incremented for every fresh deal: the backs fly in again (see GameTable.css).
  dealSeq?: number;
  dealScale?: number;
};

// A seat's hand as a small fan of face-down cards; one fewer for every card played.
const SeatFan: React.FC<Props> = ({ count, dealSeq = 0, dealScale = 1 }) => {
  const base: string = (import.meta as any).env?.BASE_URL || '/';
  const cls = `fan${dealSeq > 0 ? ` fan--deal-${dealSeq % 2 ? 'a' : 'b'}` : ''}`;
  return (
    <span
      className={cls}
      aria-hidden="true"
      style={
        {
          '--back': `url(${base}assets/cards/back.webp)`,
          '--deal-k': dealScale,
        } as React.CSSProperties
      }
    >
      {Array.from({ length: Math.max(0, count) }, (_, i) => (
        <i key={i} style={{ '--i': i, '--n': count } as React.CSSProperties} />
      ))}
    </span>
  );
};

export default SeatFan;
