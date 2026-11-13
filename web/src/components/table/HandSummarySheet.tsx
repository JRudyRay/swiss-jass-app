import React, { useRef } from 'react';
import type { HandSummary, TeamPair } from '../../engine/schieber';
import { messages, type Lang } from '../../i18n';
import { TEAM_COLORS } from './ScoreBar';
import Sheet from './Sheet';
import { SuitIcon, trumpName } from './SuitBadge';

type Props = {
  lang: Lang;
  summary: HandSummary;
  round: number;
  players: { id: number; name: string }[];
  youId: number | null;
  teamNames: Record<number, string>;
  target: number;
  onNext: () => void;
};

// Score sheet shown after each hand: what every team made and how it adds up.
const HandSummarySheet: React.FC<Props> = ({
  lang,
  summary,
  round,
  players,
  youId,
  teamNames,
  target,
  onNext,
}) => {
  const t = messages(lang).handSummary;
  const focusRef = useRef<HTMLElement>(null);
  const declarer = players.find((p) => p.id === summary.declarer);
  const mult = summary.multiplier;
  const cell = (n: number, sign = false) => (n ? `${sign ? '+' : ''}${n}` : '–');
  const row = (label: string, pair: TeamPair, key: string) => (
    <tr data-row={key}>
      <th scope="row">{label}</th>
      <td>{cell(pair.team1)}</td>
      <td>{cell(pair.team2)}</td>
    </tr>
  );
  const any = (pair: TeamPair) => pair.team1 > 0 || pair.team2 > 0;
  const lead =
    summary.hand.team1 === summary.hand.team2 ? 0 : summary.hand.team1 > summary.hand.team2 ? 1 : 2;
  const head = (n: 1 | 2) => (
    <th scope="col">
      <span className="hs-team" style={{ '--team': TEAM_COLORS[n] } as React.CSSProperties}>
        <span className="hs-team__dot" />
        <span className="hs-team__name">{teamNames[n] || `Team ${n}`}</span>
      </span>
    </th>
  );

  return (
    <Sheet
      title={t.title(round)}
      closeLabel={t.next}
      onClose={onNext}
      returnFocusRef={focusRef}
      className="hs-sheet"
    >
      <div className="hs-contract">
        {summary.trump && <SuitIcon trump={summary.trump} size={30} />}
        <strong>{summary.trump ? trumpName(summary.trump, lang) : ''}</strong>
        {mult > 1 && <span className="hs-mult">×{mult}</span>}
        {declarer && (
          <span className="hs-by">
            {declarer.id === youId ? t.youChose : t.chosenBy(declarer.name)}
          </span>
        )}
      </div>
      <table className="hs-table">
        <thead>
          <tr>
            <td />
            {head(1)}
            {head(2)}
          </tr>
        </thead>
        <tbody>
          {row(t.cards, summary.cards, 'cards')}
          {any(summary.weis) && row(t.weis, summary.weis, 'weis')}
          {any(summary.stoeck) && row(t.stoeck, summary.stoeck, 'stoeck')}
          {any(summary.match) && row(t.match, summary.match, 'match')}
          {mult > 1 && (
            <tr data-row="multiplier" className="hs-row--mult">
              <th scope="row">{t.multiplier}</th>
              <td>×{mult}</td>
              <td>×{mult}</td>
            </tr>
          )}
          <tr data-row="hand" className="hs-row--hand">
            <th scope="row">{t.hand}</th>
            <td className={lead === 1 ? 'hs-best' : undefined}>{cell(summary.hand.team1, true)}</td>
            <td className={lead === 2 ? 'hs-best' : undefined}>{cell(summary.hand.team2, true)}</td>
          </tr>
          <tr data-row="total" className="hs-row--total">
            <th scope="row">{t.total}</th>
            <td>{summary.totals.team1}</td>
            <td>{summary.totals.team2}</td>
          </tr>
        </tbody>
      </table>
      <div className="hs-target">{t.target(target)}</div>
      <button type="button" className="hs-next" data-next-hand onClick={onNext}>
        {t.next}
      </button>
    </Sheet>
  );
};

export default HandSummarySheet;
