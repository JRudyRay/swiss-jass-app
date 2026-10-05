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
  // This player just won the trick: the pile slides here.
  taking?: boolean;
  seat?: string;
  narrow?: boolean;
};

// Name plate on the felt: light text on a dark plate so it reads on green.
const PlayerSeat: React.FC<Props> = ({ lang, name, team, cardsLeft, tricks, isDealer, isTurn, taking, seat, narrow }) => {
  const t = messages(lang).seat;
  const base: string = ((import.meta as any).env?.BASE_URL) || '/';
  return (
    <div data-seat={seat} data-seat-turn={isTurn ? 'true' : 'false'} style={{
      position: 'relative', display: 'inline-block', maxWidth: narrow ? 92 : 170, padding: '5px 10px 6px',
      background: 'rgba(12, 28, 20, 0.82)', borderRadius: 10, textAlign: 'center',
      borderTop: `3px solid ${TEAM_COLORS[team ?? 0] || '#9ca3af'}`,
      boxShadow: taking ? '0 0 0 2px #fffaf0, 0 0 18px 4px rgba(255,250,240,0.55)'
        : isTurn ? '0 0 0 2px #fbbf24, 0 0 16px 3px rgba(251,191,36,0.65)' : '0 2px 6px rgba(0,0,0,0.35)',
      transform: taking ? 'scale(1.05)' : 'none',
      transition: 'box-shadow 250ms ease, transform 250ms ease',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fffaf0', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 2, fontSize: 11, color: '#e9dfc8', whiteSpace: 'nowrap' }}>
        <span title={t.cards} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <img src={`${base}assets/cards/back.webp`} alt="" width={8} height={12} style={{ borderRadius: 1 }} />
          {cardsLeft}
        </span>
        <span>{t.tricks(tricks)}</span>
      </div>
      {isTurn && (
        <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>{t.turn}</div>
      )}
      {isDealer && (
        <span title={t.dealer} style={{
          position: 'absolute', top: -9, right: -8, padding: '1px 6px', borderRadius: 8,
          background: '#fde68a', color: '#7c2d12', fontSize: 10, fontWeight: 800, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}>
          {t.dealer}
        </span>
      )}
    </div>
  );
};

export default PlayerSeat;
