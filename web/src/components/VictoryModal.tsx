import React from 'react';
import { messages, type Lang } from '../i18n';
import { TEAM_COLORS } from './table/ScoreBar';
import { trumpName } from './table/SuitBadge';

interface VictoryModalProps {
  isOpen: boolean;
  lang: Lang;
  winningTeam: number;
  myTeam?: number;
  teamNames: { 1: string; 2: string };
  finalScores: { team1: number; team2: number };
  roundHistory: Array<{ round: number; team1: number; team2: number; trump: string }>;
  onPlayAgain: () => void;
  onClose: () => void;
}

const btn: React.CSSProperties = {
  flex: '1 1 140px', padding: '12px 18px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
};

// End-of-match summary: winner, final score and the round-by-round breakdown.
const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen, lang, winningTeam, myTeam, teamNames, finalScores, roundHistory, onPlayAgain, onClose,
}) => {
  if (!isOpen) return null;
  const m = messages(lang);
  const v = m.victory;
  const winner = (winningTeam === 2 ? 2 : 1) as 1 | 2;
  const accent = TEAM_COLORS[winner];

  return (
    <div role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 2000, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10, 20, 14, 0.62)', animation: 'fadeIn 250ms ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', background: '#fffaf0', borderRadius: 16,
        borderTop: `6px solid ${accent}`, boxShadow: '0 20px 50px rgba(0,0,0,0.35)', padding: '22px 22px 18px', color: '#2b2116',
      }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: accent }}>
          {m.game.teamWins(teamNames[winner] || `Team ${winner}`)}
        </h2>
        {myTeam != null && (
          <div style={{ marginTop: 4, fontSize: 15, color: '#5b4a33' }}>{myTeam === winner ? v.youWon : v.youLost}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '18px 0 6px' }}>
          {([1, 2] as const).map((team, i) => (
            <React.Fragment key={team}>
              {i === 1 && <span style={{ fontSize: 22, color: '#a8957a' }}>:</span>}
              <div style={{ textAlign: 'center', minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#5b4a33', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teamNames[team]}</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: TEAM_COLORS[team], fontVariantNumeric: 'tabular-nums' }}>
                  {team === 1 ? finalScores.team1 : finalScores.team2}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#8a7759' }}>{m.game.finalScore} · {v.rounds}: {roundHistory.length}</div>

        {roundHistory.length > 0 && (
          <details style={{ marginTop: 14, borderTop: '1px solid #eadfc9', paddingTop: 10 }}>
            <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{v.breakdown}</summary>
            <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              <tbody>
                {roundHistory.map(r => (
                  <tr key={r.round} style={{ borderBottom: '1px solid #f1e8d6' }}>
                    <td style={{ padding: '4px 0', color: '#5b4a33' }}>{m.game.round} {r.round}</td>
                    <td style={{ padding: '4px 0', color: '#8a7759', fontSize: 12 }}>{trumpName(r.trump, lang)}</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', color: TEAM_COLORS[1], fontWeight: 600 }}>{r.team1}</td>
                    <td style={{ padding: '4px 0 4px 12px', textAlign: 'right', color: TEAM_COLORS[2], fontWeight: 600 }}>{r.team2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
          <button onClick={onPlayAgain} style={{ ...btn, border: 'none', background: '#b91c1c', color: '#fff' }}>{m.game.playAgain}</button>
          <button onClick={onClose} style={{ ...btn, border: '1px solid #d6c7a8', background: '#fff', color: '#3b2a14' }}>{v.close}</button>
        </div>
      </div>
    </div>
  );
};

export default VictoryModal;
