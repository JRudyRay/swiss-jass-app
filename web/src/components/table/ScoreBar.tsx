import React from 'react';
import { SuitIcon, trumpName } from './SuitBadge';
import { messages, type Lang } from '../../i18n';

export const TEAM_COLORS: Record<number, string> = { 1: '#c8372d', 2: '#2f5f8f' };

type Props = {
  lang: Lang;
  teamNames: Record<number, string>;
  scores: { team1: number; team2: number };
  target: number;
  trump?: string | null;
  myTeam?: number;
};

// Slim match bar: both team totals with a thin progress line, and the trump pill in between.
const ScoreBar: React.FC<Props> = ({ lang, teamNames, scores, target, trump, myTeam }) => {
  const t = messages(lang).scoreBar;
  const team = (n: 1 | 2) => {
    const score = n === 1 ? scores.team1 : scores.team2;
    const pct = Math.max(0, Math.min(1, score / (target || 1)));
    return (
      <div
        className={`score-team score-team--${n}`}
        style={{ '--team': TEAM_COLORS[n], '--pct': pct } as React.CSSProperties}
      >
        <div className="score-team__name">
          <span className="score-team__dot" />
          <span>
            {teamNames[n] || `Team ${n}`}
            {myTeam === n && <span className="score-team__us"> ({t.us})</span>}
          </span>
        </div>
        <div className="score-team__points">
          {score}
          <span className="score-team__target"> / {target}</span>
        </div>
        <div className="score-team__track">
          <div className="score-team__fill" />
        </div>
      </div>
    );
  };
  return (
    <div className="score-bar">
      {team(1)}
      <div
        data-testid="trump"
        className={`trump-pill${trump ? '' : ' trump-pill--none'}`}
        aria-label={`${t.trump}: ${trump ? trumpName(trump, lang) : t.none}`}
      >
        {trump ? (
          <>
            <SuitIcon trump={trump} size={24} />
            <span>{trumpName(trump, lang)}</span>
          </>
        ) : (
          <span>
            {t.trump}: {t.none}
          </span>
        )}
      </div>
      {team(2)}
    </div>
  );
};

export default ScoreBar;
