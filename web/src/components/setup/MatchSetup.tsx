import React, { useState } from 'react';
import { messages, type Lang } from '../../i18n';
import { TEAM_COLORS } from '../table/ScoreBar';
import { SuitIcon, trumpName } from '../table/SuitBadge';

const TARGETS = [1000, 1500, 2500];
const MULTIPLIERS: [string, number][] = [
  ['eicheln', 1], ['rosen', 1], ['schellen', 2], ['schilten', 2], ['oben-abe', 3], ['unden-ufe', 3],
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

const ink = '#2b2116';
const muted = '#7a6748';
const line = '#eadfc9';

const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: muted, margin: '0 0 10px',
};
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10, border: `1px solid #d9cbae`,
  background: '#fff', fontSize: 15, fontWeight: 600, color: ink, outline: 'none',
};

const base: string = ((import.meta as any).env?.BASE_URL) || '/';
const FAN = ['rosen_A', 'eicheln_U', 'schellen_9'];

// Setup screen for a single-player match: team names, target score and the contract multipliers.
export const MatchSetup: React.FC<Props> = ({ lang, bots, teamNames, onTeamNames, target, onTarget, onStart, onBack, backLabel }) => {
  const m = messages(lang);
  const s = m.setup;
  const [custom, setCustom] = useState(!TARGETS.includes(target));
  // Typed text for the custom target; only clamped when the field loses focus.
  const [draft, setDraft] = useState(String(target));
  const commitDraft = () => { const n = Math.max(100, Math.round(Number(draft) || 0)); setDraft(String(n)); onTarget(n); };

  const segment = (active: boolean): React.CSSProperties => ({
    flex: 1, minWidth: 0, minHeight: 44, padding: '10px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
    background: active ? '#fff' : 'transparent', color: active ? ink : muted,
    boxShadow: active ? '0 1px 3px rgba(60,40,10,0.18)' : 'none', transition: 'background 150ms ease, color 150ms ease',
  });

  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', borderRadius: 18, overflow: 'hidden', background: '#fffaf0', boxShadow: '0 18px 44px rgba(40, 28, 10, 0.18)', border: `1px solid ${line}`, color: ink }}>
      {/* Felt header with a fan of real cards */}
      <div style={{ position: 'relative', padding: '24px 22px', minHeight: 112, background: 'radial-gradient(120% 140% at 80% 20%, #2f8a5b 0%, #1d6040 55%, #154a31 100%)', color: '#fffaf0', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 'calc(100% - 150px)' }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.3 }}>{s.title}</h2>
          <div style={{ marginTop: 6, fontSize: 15, opacity: 0.85 }}>{s.subtitle}</div>
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', right: 22, top: 18, width: 120, height: 110 }}>
          {FAN.map((f, i) => (
            <img key={f} src={`${base}assets/cards/${f}.webp`} alt="" style={{
              position: 'absolute', left: 30 + (i - 1) * 26, top: 6 + Math.abs(i - 1) * 6, width: 62, borderRadius: 5,
              transform: `rotate(${(i - 1) * 12}deg)`, transformOrigin: '50% 120%',
              boxShadow: '0 4px 10px rgba(0,0,0,0.35)', background: '#fff',
            }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 22px 22px', display: 'grid', gap: 22 }}>
        <section>
          <h3 style={sectionLabel}>{s.teams}</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {([1, 2] as const).map(team => (
              <label key={team} style={{ display: 'grid', gridTemplateColumns: '4px 1fr', gap: 12, alignItems: 'stretch' }}>
                <span style={{ borderRadius: 2, background: TEAM_COLORS[team] }} />
                <span style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 13, color: muted }}>
                    <b style={{ color: ink }}>{team === 1 ? s.yourTeam : s.opponents}</b>
                    {' · '}{team === 1 ? s.partner(bots[1]) : `${bots[0]} & ${bots[2]}`}
                  </span>
                  <input value={teamNames[team]} maxLength={24} onChange={e => onTeamNames({ ...teamNames, [team]: e.target.value })} style={input} />
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 style={sectionLabel}>{m.game.targetScore}</h3>
          <div role="radiogroup" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 11, background: '#f1e7d3' }}>
            {TARGETS.map(n => (
              <button key={n} role="radio" aria-checked={!custom && target === n} style={segment(!custom && target === n)}
                onClick={() => { setCustom(false); onTarget(n); }}>{n}</button>
            ))}
            <button role="radio" aria-checked={custom} style={segment(custom)} onClick={() => { setCustom(true); setDraft(String(target)); }}>{s.custom}</button>
          </div>
          {custom && (
            <input type="number" inputMode="numeric" min={100} step={100} value={draft} autoFocus
              onChange={e => { setDraft(e.target.value); const n = Number(e.target.value); if (n >= 100) onTarget(Math.round(n)); }}
              onBlur={commitDraft} style={{ ...input, marginTop: 10 }} />
          )}
          <div style={{ marginTop: 8, fontSize: 13, color: muted }}>{s.targetHint(target)}</div>
        </section>

        <section>
          <h3 style={sectionLabel}>{s.multipliers}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px 14px' }}>
            {MULTIPLIERS.map(([trump, x]) => (
              <div key={trump} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ width: 22, display: 'flex', justifyContent: 'center' }}><SuitIcon trump={trump} size={20} /></span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trumpName(trump, lang)}</span>
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>×{x}</b>
              </div>
            ))}
          </div>
        </section>

        <div style={{ borderTop: `1px solid ${line}`, paddingTop: 18, display: 'grid', gap: 10 }}>
          <button data-start-match onClick={onStart} style={{
            width: '100%', padding: '14px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: '#b91c1c', color: '#fff', fontSize: 17, fontWeight: 800, letterSpacing: 0.2,
            boxShadow: '0 6px 16px rgba(185, 28, 28, 0.28)',
          }}>{s.start}</button>
          <div style={{ display: 'flex', justifyContent: onBack ? 'space-between' : 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {onBack && (
              <button onClick={onBack} style={{ border: 'none', background: 'none', color: muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '12px 8px 12px 0', minHeight: 44 }}>← {backLabel}</button>
            )}
            <span style={{ fontSize: 12, color: muted, textAlign: 'center' }}>{m.game.autosaveHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchSetup;
