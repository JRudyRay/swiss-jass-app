import React from 'react';
import { TEAM_COLORS } from './ScoreBar';
import { messages, type Lang } from '../../i18n';

interface Props {
  lang: Lang;
  weis: Record<string, any[]> | undefined;
  players: { id: number; name: string; team: number }[];
  weisWinner: { playerId: number; teamId: number } | null | undefined;
}

// Compact list of announced Weis; hidden when nobody has any.
export const WeisPanel: React.FC<Props> = ({ lang, weis, players, weisWinner }) => {
  const t = messages(lang).weis;
  const entries = Object.entries(weis || {}).filter(
    ([, arr]) => Array.isArray(arr) && arr.length > 0,
  );
  if (entries.length === 0) return null;
  const winnerName = weisWinner
    ? players.find((p) => p.id === weisWinner.playerId)?.name
    : undefined;
  return (
    <div className="weis-panel">
      <div className="weis-panel__title">{t.title}</div>
      {winnerName && <div className="weis-panel__winner">{t.winner(winnerName)}</div>}
      <div className="weis-panel__list">
        {entries.flatMap(([pid, arr]) => {
          const player = players.find((p) => p.id === parseInt(pid));
          const counts = !weisWinner || weisWinner.teamId === player?.team;
          return arr.map((w: any, i: number) => (
            <div
              key={`${pid}-${i}`}
              className={`weis-row${counts ? '' : ' weis-row--off'}`}
              style={{ '--team': TEAM_COLORS[(player?.team as 1 | 2) || 1] } as React.CSSProperties}
            >
              <span className="weis-row__dot" />
              <span className="weis-row__name">{player?.name || `#${pid}`}</span>
              <span className="weis-row__pts">
                {w.points} {t.points}
              </span>
              <span className="weis-row__desc">{w.description}</span>
              {!counts && <span className="weis-row__off">{t.notCounted}</span>}
            </div>
          ));
        })}
      </div>
    </div>
  );
};

export default WeisPanel;
