import React, { useEffect, useRef, useState } from 'react';
import { contractMultiplier } from '../../engine/schieber';
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

// Counts up to a new score instead of jumping (no animation for reduced motion or a lower value).
function useCountUp(value: number, ms = 600) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const start = current.current;
    if (start === value) return;
    const still =
      value < start ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      current.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const v = Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3)));
      current.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

const Points: React.FC<{ value: number }> = ({ value }) => <>{useCountUp(value)}</>;

// Slim match bar: both team totals with a thin progress line, and the trump pill in between.
const ScoreBar: React.FC<Props> = ({ lang, teamNames, scores, target, trump, myTeam }) => {
  const t = messages(lang).scoreBar;
  const mult = contractMultiplier(trump);
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
          <Points value={score} />
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
            {mult > 1 && <span className="trump-pill__mult">×{mult}</span>}
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
