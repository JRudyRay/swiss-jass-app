import React, { useEffect, useId, useRef, useState } from 'react';
import Icon from '../Icon';
import { SwissCard } from '../../SwissCard';
import { TEAM_COLORS } from './ScoreBar';
import { messages, type Lang } from '../../i18n';
import type { LastTrickData } from './useLastTrick';

type Props = {
  lang: Lang;
  last: LastTrickData | null;
  players: { id: number; name: string; team?: number }[];
};

// "Last trick" review: a corner button on the table that opens a small dialog with the previous
// trick (who played what, who took it). Disabled until the first trick of the hand is done.
const LastTrick: React.FC<Props> = ({ lang, last, players }) => {
  const t = messages(lang).lastTrick;
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const close = () => {
    setOpen(false);
    btnRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // A new hand clears the trick while the dialog could still be open.
  useEffect(() => {
    if (!last && open) setOpen(false);
  }, [last, open]);

  const nameOf = (id: number) => players.find((p) => p.id === id)?.name || `#${id}`;
  const teamOf = (id: number) => players.find((p) => p.id === id)?.team ?? 0;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="lt-btn"
        aria-label={t.button}
        title={t.button}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={!last}
        onClick={() => setOpen(true)}
      >
        <Icon name="history" size={20} />
      </button>
      {open && last && (
        <div className="lt-overlay" onClick={close}>
          <div
            className="lt-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              // The close button is the only control: keep focus inside the dialog.
              if (e.key === 'Tab') {
                e.preventDefault();
                closeRef.current?.focus();
              }
            }}
          >
            <div className="lt-sheet__head">
              <h2 id={titleId} className="lt-sheet__title">
                {t.title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                className="lt-sheet__close"
                aria-label={t.close}
                onClick={close}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="lt-sheet__cards">
              {last.cards.map((c, i) => {
                const won = c.playerId === last.winnerId;
                return (
                  <div
                    key={String(c.id ?? i)}
                    className={`lt-play${won ? ' lt-play--won' : ''}`}
                    style={
                      { '--team': TEAM_COLORS[teamOf(c.playerId) || 1] } as React.CSSProperties
                    }
                  >
                    <SwissCard card={c} />
                    <span className="lt-play__name">{nameOf(c.playerId)}</span>
                    {won && <span className="lt-play__won">{t.takes}</span>}
                  </div>
                );
              })}
            </div>
            <p className="lt-sheet__winner" role="status">
              {t.wonBy(nameOf(last.winnerId))}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default LastTrick;
