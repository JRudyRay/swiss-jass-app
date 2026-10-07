import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { SwissCard } from '../../SwissCard';
import { TEAM_COLORS } from './ScoreBar';
import { messages, type Lang } from '../../i18n';
import type { LastTrickData } from './useLastTrick';
import Sheet from './Sheet';

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
        className="sheet-btn"
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
        <Sheet
          title={t.title}
          closeLabel={t.close}
          onClose={() => setOpen(false)}
          returnFocusRef={btnRef}
        >
          <div className="sheet__cards">
            {last.cards.map((c, i) => {
              const won = c.playerId === last.winnerId;
              return (
                <div
                  key={String(c.id ?? i)}
                  className={`lt-play${won ? ' lt-play--won' : ''}`}
                  style={{ '--team': TEAM_COLORS[teamOf(c.playerId) || 1] } as React.CSSProperties}
                >
                  <SwissCard card={c} />
                  <span className="lt-play__name">{nameOf(c.playerId)}</span>
                  {won && <span className="lt-play__won">{t.takes}</span>}
                </div>
              );
            })}
          </div>
          <p className="sheet__winner" role="status">
            {t.wonBy(nameOf(last.winnerId))}
          </p>
        </Sheet>
      )}
    </>
  );
};

export default LastTrick;
