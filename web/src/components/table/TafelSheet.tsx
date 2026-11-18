import React from 'react';
import { messages, type Lang } from '../../i18n';
import Jasstafel from './Jasstafel';
import Sheet from './Sheet';
import { TEAM_COLORS } from './ScoreBar';
import { trumpName } from './SuitBadge';

export type RoundRow = { round: number; team1: number; team2: number; trump: string };

type Props = {
  lang: Lang;
  teamNames: Record<number, string>;
  scores: { team1: number; team2: number };
  rounds: RoundRow[];
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement>;
};

// The slate in a sheet, with the hands played so far (points per team) underneath.
const TafelSheet: React.FC<Props> = ({
  lang,
  teamNames,
  scores,
  rounds,
  onClose,
  returnFocusRef,
}) => {
  const t = messages(lang).tafel;
  return (
    <Sheet
      title={t.title}
      closeLabel={t.close}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      className="tafel-sheet"
    >
      <div className="tafel-sheet__body">
        <Jasstafel
          lang={lang}
          teams={[
            { name: teamNames[1] || 'Team 1', points: scores.team1 },
            { name: teamNames[2] || 'Team 2', points: scores.team2 },
          ]}
        />
        <p className="tafel-sheet__note">{t.note}</p>
        <h3 className="tafel-sheet__h">{t.hands}</h3>
        {rounds.length === 0 ? (
          <p className="tafel-sheet__empty">{t.empty}</p>
        ) : (
          <table className="victory__table tafel-sheet__table">
            <thead>
              <tr>
                <th scope="col">{t.hand}</th>
                <th scope="col">{t.contract}</th>
                {([1, 2] as const).map((n) => (
                  <th key={n} scope="col" style={{ color: TEAM_COLORS[n] }}>
                    {teamNames[n]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.round}>
                  <td>{r.round}</td>
                  <td>{trumpName(r.trump, lang)}</td>
                  <td style={{ color: TEAM_COLORS[1] }}>{r.team1}</td>
                  <td style={{ color: TEAM_COLORS[2] }}>{r.team2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Sheet>
  );
};

export default TafelSheet;
