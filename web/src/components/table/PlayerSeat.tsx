import React from 'react';
import { TEAM_COLORS } from './ScoreBar';
import { messages, type Lang } from '../../i18n';
import type { SeatWeis } from './seatWeis';
import { SuitIcon, trumpName } from './SuitBadge';

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
  // Points of the trick being taken, floated next to the chip.
  gain?: number;
  // Weis announced with the first card (first trick only).
  weis?: SeatWeis | null;
  // Stöck called in the current trick.
  stoeck?: boolean;
  // Contract this player named (shown as a small badge), if any.
  chose?: string | null;
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
  gain,
  weis,
  stoeck,
  chose,
  seat,
  narrow,
}) => {
  const m = messages(lang);
  const t = m.seat;
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
      {weis && !taking && (
        <span className={`seat__weis${weis.counts ? '' : ' seat__weis--off'}`}>
          {m.weis.short(weis.points)}
        </span>
      )}
      {stoeck && !weis && !taking && <span className="seat__weis">{m.handSummary.stoeck}</span>}
      {taking && !!gain && (
        <span className="seat__gain" aria-hidden="true">
          +{gain}
        </span>
      )}
      {chose && (
        <span
          className="seat__chose"
          title={`${m.scoreBar.trump}: ${trumpName(chose, lang)}`}
          aria-label={`${m.scoreBar.trump}: ${trumpName(chose, lang)}`}
        >
          <SuitIcon trump={chose} size={14} />
        </span>
      )}
      {isDealer && (
        <span className="seat__dealer" title={t.dealer} aria-label={t.dealer}>
          D
        </span>
      )}
    </div>
  );
};

export default PlayerSeat;
