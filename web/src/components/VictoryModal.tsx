import React, { useEffect, useRef } from 'react';
import { messages, type Lang } from '../i18n';
import { TEAM_COLORS } from './table/ScoreBar';
import { trumpName } from './table/SuitBadge';

interface VictoryModalProps {
  isOpen: boolean;
  lang: Lang;
  myTeam?: number;
  teamNames: { 1: string; 2: string };
  finalScores: { team1: number; team2: number };
  roundHistory: Array<{ round: number; team1: number; team2: number; trump: string }>;
  onPlayAgain: () => void;
  onClose: () => void;
}

// End-of-match summary: winner, final score and the round-by-round breakdown.
// Bottom sheet on phones, centred dialog on larger screens (see GameTable.css). Esc closes.
const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  lang,
  myTeam,
  teamNames,
  finalScores,
  roundHistory,
  onPlayAgain,
  onClose,
}) => {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Keep Tab inside the dialog.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(
      cardRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), summary') || [],
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;
  const m = messages(lang);
  const v = m.victory;
  // Derived from the totals shown, so the headline can never disagree with the score.
  const winner: 1 | 2 = finalScores.team2 > finalScores.team1 ? 2 : 1;

  return (
    <div className="victory" onClick={onClose}>
      <div
        ref={cardRef}
        className="victory__card"
        onKeyDown={trapTab}
        role="dialog"
        aria-modal="true"
        aria-labelledby="victory-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="victory__scroll">
          <h2 id="victory-title" className="victory__title">
            {m.game.teamWins(teamNames[winner] || `Team ${winner}`)}
          </h2>
          {myTeam != null && (
            <p className="victory__sub">{myTeam === winner ? v.youWon : v.youLost}</p>
          )}

          <div className="victory__scores">
            {([1, 2] as const).map((team, i) => (
              <React.Fragment key={team}>
                {i === 1 && <span className="victory__colon">:</span>}
                <div
                  className={`victory__team${team === winner ? ' victory__team--win' : ''}`}
                  style={{ '--team': TEAM_COLORS[team] } as React.CSSProperties}
                >
                  <div className="victory__team-name">{teamNames[team]}</div>
                  <div className="victory__team-score">
                    {team === 1 ? finalScores.team1 : finalScores.team2}
                  </div>
                  <div className="victory__team-bar" />
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="victory__meta">
            {m.game.finalScore} · {v.rounds}: {roundHistory.length}
          </div>

          {roundHistory.length > 0 && (
            <details className="victory__details" open>
              <summary>{v.breakdown}</summary>
              <table className="victory__table">
                <thead>
                  <tr>
                    <th scope="col">{v.colRound}</th>
                    <th scope="col">{v.colContract}</th>
                    {([1, 2] as const).map((team) => (
                      <th key={team} scope="col" style={{ color: TEAM_COLORS[team] }}>
                        {teamNames[team]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roundHistory.map((r) => (
                    <tr key={r.round}>
                      <td>{r.round}</td>
                      <td>{trumpName(r.trump, lang)}</td>
                      <td style={{ color: TEAM_COLORS[1] }}>{r.team1}</td>
                      <td style={{ color: TEAM_COLORS[2] }}>{r.team2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="victory__note">{v.roundNote}</p>
            </details>
          )}
        </div>

        <div className="victory__actions">
          <button
            ref={primaryRef}
            className="victory__btn victory__btn--primary"
            onClick={onPlayAgain}
          >
            {m.game.playAgain}
          </button>
          <button className="victory__btn victory__btn--ghost" onClick={onClose}>
            {v.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VictoryModal;
