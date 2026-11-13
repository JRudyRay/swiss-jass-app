import React from 'react';
import { TEAM_COLORS } from './ScoreBar';
import { trumpName } from './SuitBadge';
import { messages, type Lang } from '../../i18n';

type Round = { round: number; team1: number; team2: number; trump: any };

// Collapsed list of the hands played so far, below the table.
export const RoundHistory: React.FC<{ lang: Lang; rounds: Round[] }> = ({ lang, rounds }) => {
  const t = messages(lang).game;
  if (rounds.length === 0) return null;
  return (
    <details className="info-panel round-history">
      <summary className="info-panel__summary">
        {t.roundHistory} ({rounds.length})
      </summary>
      <div className="round-history__list">
        {rounds.map((round, idx) => (
          <div key={idx} className="round-history__item">
            <div className="round-history__no">
              {t.round} {round.round}
            </div>
            <div style={{ color: TEAM_COLORS[1] }}>{round.team1}</div>
            <div style={{ color: TEAM_COLORS[2] }}>{round.team2}</div>
            <div className="round-history__trump">{trumpName(round.trump, lang)}</div>
          </div>
        ))}
      </div>
    </details>
  );
};

export default RoundHistory;
