import React, { useRef, useState } from 'react';
import Icon from '../Icon';
import { readStats, resetStats } from '../../game/stats';
import { messages, type Lang } from '../../i18n';
import Sheet from './Sheet';
import { trumpName } from './SuitBadge';

const LOCALES: Record<Lang, string> = {
  en: 'en',
  ch: 'de-CH',
  de: 'de',
  fr: 'fr-CH',
  it: 'it-CH',
  rm: 'rm',
};

function numberFormat(lang: Lang) {
  try {
    return new Intl.NumberFormat(LOCALES[lang]);
  } catch {
    return new Intl.NumberFormat('en');
  }
}

function dateFormat(lang: Lang, at: number) {
  try {
    return new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'short' }).format(at);
  } catch {
    return new Date(at).toLocaleDateString();
  }
}

const Ring: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg className="stats-ring" viewBox="0 0 100 100" role="img" aria-label={label}>
      <circle cx="50" cy="50" r={r} className="stats-ring__track" />
      <circle
        cx="50"
        cy="50"
        r={r}
        className="stats-ring__arc"
        strokeDasharray={`${(c * value).toFixed(1)} ${c.toFixed(1)}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="57" textAnchor="middle" className="stats-ring__text">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
};

// Statistics screen: figures kept on this device only (see game/stats.ts).
const StatsSheet: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = messages(lang).stats;
  const setupT = messages(lang).setup;
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [, bump] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const nf = numberFormat(lang);
  const n = (v: number) => nf.format(v);
  const s = open ? readStats() : null;

  const tile = (label: string, value: string) => (
    <div className="stats-tile" key={label}>
      <div className="stats-tile__v">{value}</div>
      <div className="stats-tile__l">{label}</div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="rules-link"
        data-stats-open
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="chart" size={18} />
        {t.link}
      </button>
      {open && s && (
        <Sheet
          title={t.title}
          closeLabel={t.close}
          onClose={() => {
            setOpen(false);
            setConfirm(false);
          }}
          returnFocusRef={btnRef}
          className="stats-sheet"
        >
          <div className="stats-sheet__body">
            {s.played === 0 ? (
              <div className="stats-empty" data-stats-empty>
                <Icon name="chart" size={36} />
                <strong>{t.empty}</strong>
                <p>{t.emptyHint}</p>
              </div>
            ) : (
              <>
                <div className="stats-hero">
                  <Ring value={s.winRate} label={`${t.winRate}: ${Math.round(s.winRate * 100)}%`} />
                  <div>
                    <div className="stats-hero__l">{t.winRate}</div>
                    <div className="stats-hero__v">{t.record(s.won, s.played)}</div>
                  </div>
                </div>
                <div className="stats-grid">
                  {tile(t.matches, n(s.played))}
                  {tile(t.streak, n(s.streak))}
                  {tile(t.bestStreak, n(s.bestStreak))}
                  {tile(t.biggestWin, n(s.biggestWin))}
                  {tile(t.hands, n(s.hands))}
                  {tile(t.bestHand, n(s.bestHand))}
                  {tile(t.matschMade, n(s.matschMade))}
                  {tile(t.matschSuffered, n(s.matschSuffered))}
                  {tile(t.weis, n(s.weisPoints))}
                  {tile(t.stoeck, n(s.stoeck))}
                </div>
                {s.contracts.length > 0 && (
                  <>
                    <h3 className="stats-h">{t.contracts}</h3>
                    <ul className="stats-contracts">
                      {s.contracts.map((c) => (
                        <li key={c.trump}>
                          <span>{trumpName(c.trump, lang)}</span>
                          <span>
                            {n(c.n)} · {t.avg} {n(Math.round(c.avg))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <h3 className="stats-h">{t.recent}</h3>
                <ul className="stats-recent">
                  {s.recent.map((m) => (
                    <li key={m.id} className={m.won ? 'is-won' : 'is-lost'}>
                      <span className="stats-recent__date">{dateFormat(lang, m.at)}</span>
                      <span className="stats-recent__res">{m.won ? t.won : t.lost}</span>
                      <span className="stats-recent__score">
                        {n(m.us)} : {n(m.them)}
                      </span>
                      <span className="stats-recent__target">
                        {t.toTarget(n(m.target))}
                        {` · ${setupT.botLevels[m.level]}`}
                        {m.coach ? ` · ${t.coachMark}` : ''}
                        {m.undo ? ` · ${t.undoMark}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="stats-note">{t.localNote}</p>
            {s.played > 0 &&
              (confirm ? (
                <div className="stats-confirm" role="alertdialog" aria-label={t.reset}>
                  <p>{t.resetConfirm}</p>
                  <div className="stats-confirm__row">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setConfirm(false)}
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      data-stats-reset-confirm
                      onClick={() => {
                        resetStats();
                        setConfirm(false);
                        bump((x) => x + 1);
                      }}
                    >
                      {t.resetDo}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="stats-reset" onClick={() => setConfirm(true)}>
                  {t.reset}
                </button>
              ))}
          </div>
        </Sheet>
      )}
    </>
  );
};

export default StatsSheet;
