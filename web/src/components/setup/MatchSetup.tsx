import React, { useState } from 'react';
import { messages, type Lang } from '../../i18n';
import { TEAM_COLORS } from '../table/ScoreBar';
import Icon from '../Icon';
import './setup.css';
import { SuitIcon, trumpName } from '../table/SuitBadge';

const TARGETS = [1000, 1500, 2500];
const MULTIPLIERS: [string, number][] = [
  ['eicheln', 1],
  ['rosen', 1],
  ['schellen', 2],
  ['schilten', 2],
  ['oben-abe', 3],
  ['unden-ufe', 3],
];

type Props = {
  lang: Lang;
  // Bot names by seat: [right opponent, partner, left opponent] (engine ids 1, 2, 3).
  bots: string[];
  teamNames: { 1: string; 2: string };
  onTeamNames: (names: { 1: string; 2: string }) => void;
  target: number;
  onTarget: (n: number) => void;
  onStart: () => void;
  onBack?: () => void;
  backLabel?: string;
};

const base: string = (import.meta as any).env?.BASE_URL || '/';
const FAN = ['rosen_A', 'eicheln_U', 'schellen_9'];

// Setup screen for a single-player match: team names, target score and the contract multipliers.
export const MatchSetup: React.FC<Props> = ({
  lang,
  bots,
  teamNames,
  onTeamNames,
  target,
  onTarget,
  onStart,
  onBack,
  backLabel,
}) => {
  const m = messages(lang);
  const s = m.setup;
  const [custom, setCustom] = useState(!TARGETS.includes(target));
  // Typed text for the custom target; only clamped when the field loses focus.
  const [draft, setDraft] = useState(String(target));
  const commitDraft = () => {
    const n = Math.max(100, Math.round(Number(draft) || 0));
    setDraft(String(n));
    onTarget(n);
  };

  return (
    <div className="setup card">
      <div className="setup__hero">
        <div className="setup__hero-text">
          <h2 className="setup__title">{s.title}</h2>
          <p className="setup__subtitle">{s.subtitle}</p>
        </div>
        <div className="setup__fan" aria-hidden="true">
          {FAN.map((f, i) => (
            <img
              key={f}
              src={`${base}assets/cards/${f}.webp`}
              alt=""
              style={{
                left: 30 + (i - 1) * 26,
                top: 6 + Math.abs(i - 1) * 6,
                transform: `rotate(${(i - 1) * 12}deg)`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="setup__body">
        <section className="setup__section">
          <h3 className="setup__label">{s.teams}</h3>
          <div className="setup__teams">
            {([1, 2] as const).map((team) => (
              <label
                key={team}
                className="setup__team"
                style={{ borderLeftColor: TEAM_COLORS[team] }}
              >
                <span className="setup__team-meta">
                  <b>{team === 1 ? s.yourTeam : s.opponents}</b>
                  {' · '}
                  {team === 1 ? s.partner(bots[1]) : `${bots[0]} & ${bots[2]}`}
                </span>
                <input
                  className="input"
                  value={teamNames[team]}
                  maxLength={24}
                  onChange={(e) => onTeamNames({ ...teamNames, [team]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="setup__section">
          <h3 className="setup__label">{m.game.targetScore}</h3>
          <div role="radiogroup" className="segmented">
            {TARGETS.map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={!custom && target === n}
                onClick={() => {
                  setCustom(false);
                  onTarget(n);
                }}
              >
                {n}
              </button>
            ))}
            <button
              role="radio"
              aria-checked={custom}
              onClick={() => {
                setCustom(true);
                setDraft(String(target));
              }}
            >
              {s.custom}
            </button>
          </div>
          {custom && (
            <input
              className="input setup__custom"
              type="number"
              inputMode="numeric"
              min={100}
              step={100}
              value={draft}
              autoFocus
              onChange={(e) => {
                setDraft(e.target.value);
                const n = Number(e.target.value);
                if (n >= 100) onTarget(Math.round(n));
              }}
              onBlur={commitDraft}
            />
          )}
          <p className="setup__hint">{s.targetHint(target)}</p>
        </section>

        <section className="setup__section">
          <h3 className="setup__label">{s.multipliers}</h3>
          <div className="setup__mult">
            {MULTIPLIERS.map(([trump, x]) => (
              <div key={trump} className="setup__mult-item">
                <SuitIcon trump={trump} size={20} />
                <span className="setup__mult-name">{trumpName(trump, lang)}</span>
                <b className="tabular">×{x}</b>
              </div>
            ))}
          </div>
        </section>

        <div className="setup__actions">
          <button className="btn btn--primary btn--big" data-start-match onClick={onStart}>
            {s.start}
          </button>
          <div className="setup__foot">
            {onBack && (
              <button className="btn btn--ghost" onClick={onBack}>
                <Icon name="arrow" size={18} className="flip" />
                {backLabel}
              </button>
            )}
            <span className="setup__autosave">{m.game.autosaveHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchSetup;
