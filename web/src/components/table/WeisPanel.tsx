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
  const entries = Object.entries(weis || {}).filter(([, arr]) => Array.isArray(arr) && arr.length > 0);
  if (entries.length === 0) return null;
  const winnerName = weisWinner ? players.find(p => p.id === weisWinner.playerId)?.name : undefined;
  return (
    <div style={{ marginTop: 16, padding: '10px 12px', background: '#fffaf0', border: '1px solid #fde2b6', borderRadius: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#3b2a14', marginBottom: 6 }}>{t.title}</div>
      {winnerName && <div style={{ fontSize: 13, color: '#065f46', marginBottom: 6 }}>{t.winner(winnerName)}</div>}
      <div style={{ display: 'grid', gap: 4 }}>
        {entries.flatMap(([pid, arr]) => {
          const player = players.find(p => p.id === parseInt(pid));
          const counts = !weisWinner || weisWinner.teamId === player?.team;
          return arr.map((w: any, i: number) => (
            <div key={`${pid}-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13, opacity: counts ? 1 : 0.55 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, flex: '0 0 8px', background: TEAM_COLORS[(player?.team as 1 | 2) || 1] }} />
              <span style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player?.name || `#${pid}`}</span>
              <span style={{ fontWeight: 700, color: counts ? '#047857' : '#6b7280' }}>{w.points} {t.points}</span>
              <span style={{ color: '#4b5563' }}>{w.description}</span>
              {!counts && <span style={{ color: '#b91c1c', fontSize: 11 }}>{t.notCounted}</span>}
            </div>
          ));
        })}
      </div>
    </div>
  );
};

export default WeisPanel;
