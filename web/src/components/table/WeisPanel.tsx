import React from 'react';
import { TEAM_COLORS } from './ScoreBar';
import { messages, type Lang } from '../../i18n';
import { weisLabel } from './seatWeis';

interface Props {
  lang: Lang;
  weis: Record<string, any[]> | undefined;
  players: { id: number; name: string; team: number }[];
  weisWinner: { playerId: number; teamId: number } | null | undefined;
  // The first trick is done: Weis are shown now.
  revealed: boolean;
}

// Weis after the first trick, as at the table: the team with the best Weis shows its cards, the
// other team only what it announced (its best Weis in points). Hidden before that.
export const WeisPanel: React.FC<Props> = ({ lang, weis, players, weisWinner, revealed }) => {
  const t = messages(lang).weis;
  const entries = Object.entries(weis || {}).filter(
    ([, arr]) => Array.isArray(arr) && arr.length > 0,
  );
  if (!revealed || entries.length === 0) return null;
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
          const shown = counts
            ? arr
            : [arr.reduce((best: any, w: any) => (w.points > best.points ? w : best), arr[0])];
          return shown.map((w: any, i: number) => (
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
              {counts && <span className="weis-row__desc">{weisLabel(w, lang)}</span>}
              {!counts && <span className="weis-row__off">{t.notCounted}</span>}
            </div>
          ));
        })}
      </div>
    </div>
  );
};

export default WeisPanel;
