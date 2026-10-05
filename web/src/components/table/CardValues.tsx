import React, { useState } from 'react';
import { messages, type Lang } from '../../i18n';
import { cardPoints } from '../../engine/schieber';
import { SuitIcon, trumpName } from './SuitBadge';

type Mode = 'trump' | 'plain' | 'oben-abe' | 'unden-ufe';

// The example suit is Roses; ranks are listed strongest first for each contract.
const SUIT = 'rosen';
const ORDER: Record<Mode, string[]> = {
  trump: ['U', '9', 'A', 'K', 'O', '10', '8', '7', '6'],
  plain: ['A', 'K', 'O', 'U', '10', '9', '8', '7', '6'],
  'oben-abe': ['A', 'K', 'O', 'U', '10', '9', '8', '7', '6'],
  'unden-ufe': ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'],
};
const CONTRACT: Record<Mode, string> = { trump: SUIT, plain: 'eicheln', 'oben-abe': 'oben-abe', 'unden-ufe': 'unden-ufe' };

const ink = '#2b2116';
const muted = '#7a6748';
const base: string = ((import.meta as any).env?.BASE_URL) || '/';

// Reference card for what each card scores and how strong it is, per contract.
export const CardValues: React.FC<{ lang: Lang }> = ({ lang }) => {
  const m = messages(lang);
  const t = m.info;
  const [mode, setMode] = useState<Mode>('trump');
  const tabs: [Mode, string, string][] = [
    ['trump', t.trump, SUIT],
    ['plain', t.nonTrump, ''],
    ['oben-abe', trumpName('oben-abe', lang), 'oben-abe'],
    ['unden-ufe', trumpName('unden-ufe', lang), 'unden-ufe'],
  ];
  const ranks = ORDER[mode];
  const pts = ranks.map(r => cardPoints({ suit: SUIT as any, rank: r as any }, CONTRACT[mode] as any));
  const top = Math.max(...pts);

  return (
    <div style={{ marginTop: 10, color: ink }}>
      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 3, padding: 3, borderRadius: 10, background: '#f1e7d3' }}>
        {tabs.map(([id, label, icon]) => {
          const active = id === mode;
          return (
            <button key={id} role="tab" aria-selected={active} onClick={() => setMode(id)} style={{
              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden',
              background: active ? '#fff' : 'transparent', color: active ? ink : muted,
              boxShadow: active ? '0 1px 3px rgba(60,40,10,0.18)' : 'none',
              transition: 'background 150ms ease, color 150ms ease',
            }}>
              {icon && <SuitIcon trump={icon} size={15} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 2px 8px', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: muted }}>
        <span>{t.strongest}</span>
        <span aria-hidden="true" style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #d9cbae, transparent)' }} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 6px' }}>
        {ranks.map((r, i) => {
          const p = pts[i];
          const zero = p === 0;
          const best = p === top;
          return (
            <div key={r} style={{ width: 'calc((100% - 24px) / 5)', maxWidth: 64, display: 'grid', justifyItems: 'center', gap: 6 }}>
              <img src={`${base}assets/cards/${SUIT}_${r}.webp`} alt={r} loading="lazy" style={{
                width: '100%', aspectRatio: '222 / 336', objectFit: 'cover', borderRadius: 5, background: '#fff',
                boxShadow: best ? '0 0 0 2px #e0a526, 0 4px 10px rgba(60,40,10,0.25)' : '0 2px 6px rgba(60,40,10,0.2)',
                opacity: zero ? 0.62 : 1, filter: zero ? 'saturate(0.55)' : 'none', transition: 'opacity 150ms ease',
              }} />
              <span style={{
                minWidth: 30, padding: '2px 7px', borderRadius: 999, textAlign: 'center',
                fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                background: best ? '#e0a526' : zero ? 'transparent' : '#1d6040',
                color: best ? '#2b1a00' : zero ? '#b3a283' : '#fffaf0',
                border: zero ? '1px dashed #d9cbae' : '1px solid transparent',
              }}>{p}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8, background: '#f7efdf', fontSize: 12.5, color: muted, textAlign: 'center' }}>
        {t.footer}
      </div>
    </div>
  );
};

export default CardValues;
