import React, { useEffect, useRef } from 'react';
import { messages, type Lang } from '../i18n';
import { TEAM_COLORS } from './table/ScoreBar';
import { trumpName } from './table/SuitBadge';
import Jasstafel from './table/Jasstafel';
import { Confetti, motionAllowed, useCountUp } from './Confetti';

interface VictoryModalProps {
  isOpen: boolean;
  lang: Lang;
  myTeam?: number;
  teamNames: { 1: string; 2: string };
  finalScores: { team1: number; team2: number };
  roundHistory: Array<{ round: number; team1: number; team2: number; trump: string }>;
  winner?: 1 | 2; // the team the engine declared the winner
  endReason?: 'stoeck' | 'weis' | 'trick'; // set when the match ended before the hand was played out
  // Party on a win (confetti, score count-up); calm otherwise. False with animation speed Off.
  animate?: boolean;
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
  winner: declared,
  endReason,
  animate = true,
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

  const won =
    myTeam != null &&
    myTeam === (declared || (finalScores.team2 > finalScores.team1 ? 2 : 1)) &&
    isOpen &&
    animate &&
    motionAllowed();
  const shown1 = useCountUp(finalScores.team1, won);
  const shown2 = useCountUp(finalScores.team2, won);

  if (!isOpen) return null;
  const m = messages(lang);
  const v = m.victory;
  // Derived from the totals shown, so the headline can never disagree with the score.
  const winner: 1 | 2 = declared || (finalScores.team2 > finalScores.team1 ? 2 : 1);

  return (
    <div className="victory" onClick={onClose}>
      {won && <Confetti />}
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
            {myTeam != null
              ? myTeam === winner
                ? v.youWon
                : v.youLost
              : m.game.teamWins(teamNames[winner] || `Team ${winner}`)}
          </h2>
          {myTeam != null && (
            <p className="victory__sub">{m.game.teamWins(teamNames[winner] || `Team ${winner}`)}</p>
          )}
          {endReason && roundHistory.length > 0 && (
            <p className="victory__sub" data-victory-decided>
              {v.decided(roundHistory.length, endReason)}
            </p>
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
                  <div className="victory__team-score">{team === 1 ? shown1 : shown2}</div>
                  <div className="victory__team-bar" />
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="victory__slate">
            <Jasstafel
              lang={lang}
              compact
              teams={[
                { name: teamNames[1], points: finalScores.team1 },
                { name: teamNames[2], points: finalScores.team2 },
              ]}
            />
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
