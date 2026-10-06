import React from 'react';
import { SuitIcon, trumpName } from './SuitBadge';
import { messages, type Lang } from '../../i18n';

export const TEAM_COLORS: Record<number, string> = { 1: '#d8473f', 2: '#2f74d0' };

type Props = {
  lang: Lang;
  teamNames: Record<number, string>;
  scores: { team1: number; team2: number };
  target: number;
  trump?: string | null;
  myTeam?: number;
};

// Compact match header: both teams with progress to the target and the trump in between.
const ScoreBar: React.FC<Props> = ({ lang, teamNames, scores, target, trump, myTeam }) => {
  const t = messages(lang).scoreBar;
  const team = (n: 1 | 2) => {
    const score = n === 1 ? scores.team1 : scores.team2;
    const pct = Math.max(0, Math.min(100, (score / (target || 1)) * 100));
    return (
      <div style={{ flex: 1, minWidth: 0, textAlign: n === 1 ? 'left' : 'right' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            justifyContent: n === 1 ? 'flex-start' : 'flex-end',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: TEAM_COLORS[n],
              flexShrink: 0,
              alignSelf: 'center',
              order: n === 1 ? 0 : 2,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#3a2e20',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              order: 1,
            }}
          >
            {teamNames[n] || `Team ${n}`}
            {myTeam === n && <span style={{ fontWeight: 500, color: '#8a7a62' }}> ({t.us})</span>}
          </span>
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            lineHeight: 1.05,
            color: TEAM_COLORS[n],
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {score}
          <span style={{ fontSize: 11, fontWeight: 600, color: '#8a7a62' }}> / {target}</span>
        </div>
        <div
          style={{
            height: 8,
            background: '#e8dfcc',
            borderRadius: 4,
            overflow: 'hidden',
            marginTop: 3,
            direction: n === 1 ? 'ltr' : 'rtl',
          }}
        >
          <div
            style={{
              width: `${score > 0 ? Math.max(pct, 3) : 0}%`,
              height: '100%',
              background: TEAM_COLORS[n],
              transition: 'width 600ms ease',
            }}
          />
        </div>
      </div>
    );
  };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 700,
        margin: '0 auto 10px',
        padding: '8px 12px',
        background: '#fffaf0',
        border: '1px solid #e3d7bf',
        borderRadius: 14,
        boxShadow: '0 2px 8px rgba(60,40,10,0.08)',
      }}
    >
      {team(1)}
      <div data-testid="trump" style={{ flexShrink: 0, textAlign: 'center', minWidth: 64 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: '#8a7a62',
          }}
        >
          {t.trump}
        </div>
        {trump ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <SuitIcon trump={trump} size={26} />
            <div style={{ fontSize: 12, fontWeight: 800, color: '#3a2e20' }}>
              {trumpName(trump, lang)}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#8a7a62', marginTop: 8 }}>{t.none}</div>
        )}
      </div>
      {team(2)}
    </div>
  );
};

export default ScoreBar;
