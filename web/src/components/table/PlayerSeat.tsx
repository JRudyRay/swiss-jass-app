import React from 'react';
import { TEAM_COLORS } from './ScoreBar';
import { messages, type Lang } from '../../i18n';

type Props = {
  lang: Lang;
  name: string;
  team?: number;
  cardsLeft: number;
  tricks: number;
  isDealer?: boolean;
  isTurn?: boolean;
  // Somebody else is deciding: show the three-dot indicator.
  thinking?: boolean;
  // This player just won the trick: the pile slides here.
  taking?: boolean;
  seat?: string;
  // West/east: a stacked chip so the trick keeps its room.
  narrow?: boolean;
};

// Compact chip on the felt: initial avatar, name, cards left. The gold ring marks whose turn it is.
const PlayerSeat: React.FC<Props> = ({
  lang,
  name,
  team,
  cardsLeft,
  tricks,
  isDealer,
  isTurn,
  thinking,
  taking,
  seat,
  narrow,
}) => {
  const t = messages(lang).seat;
  const base: string = (import.meta as any).env?.BASE_URL || '/';
  const cls = ['seat', narrow && 'seat--side', isTurn && 'seat--turn', taking && 'seat--taking']
    .filter(Boolean)
    .join(' ');
  const initial = (Array.from(name.trim())[0] || '?').toUpperCase();
  return (
    <div
      className={cls}
      data-seat={seat}
      data-seat-turn={isTurn ? 'true' : 'false'}
      style={{ '--team': TEAM_COLORS[team ?? 0] } as React.CSSProperties}
      aria-label={isTurn ? `${name}: ${t.turn}` : undefined}
    >
      <span className="seat__avatar" aria-hidden="true">
        {initial}
      </span>
      <span className="seat__name">{name}</span>
      <span className="seat__meta">
        <span className="seat__count" title={`${cardsLeft} ${t.cards} · ${t.tricks(tricks)}`}>
          <img src={`${base}assets/cards/back.webp`} alt="" width={8} height={12} />
          {cardsLeft}
        </span>
        {thinking && (
          <span className="seat__thinking" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </span>
      {isDealer && (
        <span className="seat__dealer" title={t.dealer} aria-label={t.dealer}>
          D
        </span>
      )}
    </div>
  );
};

export default PlayerSeat;
