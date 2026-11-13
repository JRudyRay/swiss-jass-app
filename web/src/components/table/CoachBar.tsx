import React from 'react';
import { messages, type Lang } from '../../i18n';
import type { CoachArgs } from '../../i18n/en';
import type { CardRef, CoachNote } from '../../game/coach';
import { trumpName } from './SuitBadge';
import type { CoachMsg } from './useCoach';

type Props = {
  lang: Lang;
  msg: CoachMsg | null;
  // It is the player's move: the Tip button is offered.
  canTip: boolean;
  choosingTrump: boolean;
  nameOf: (seat: number) => string;
  onTip: () => void;
};

// The coach's message in the player's language.
export function coachText(lang: Lang, msg: CoachMsg, nameOf: (seat: number) => string): string {
  const m = messages(lang);
  const t = m.coach;
  const cardName = (c: CardRef) => `${m.suits[c.suit] || c.suit} ${m.ranks[c.rank] || c.rank}`;
  const note: CoachNote = msg.note;
  const args: CoachArgs = {
    card: note.card ? cardName(note.card) : '',
    suit: note.contract ? trumpName(note.contract, lang) : note.suit ? m.suits[note.suit] : '',
    n: note.n ?? 0,
    name: typeof note.seat === 'number' ? nameOf(note.seat) : '',
  };
  const why = t.notes[note.key](args);
  if (msg.tone === 'signal') return why;
  if (msg.tone === 'good') return t.good(why);
  const what = msg.choice
    ? msg.choice === 'schieben'
      ? t.push
      : trumpName(msg.choice, lang)
    : msg.card
      ? cardName(msg.card)
      : '';
  if (msg.tone === 'tip') return t.tipCard(what, why);
  return msg.choice ? t.betterTrump(what, why) : t.better(what, why);
}

// Training mode: one reserved row between the table and the hand with the coach's latest
// remark and, on the player's move, a Tip button.
const CoachBar: React.FC<Props> = ({ lang, msg, canTip, choosingTrump, nameOf, onTip }) => {
  const t = messages(lang).coach;
  const idle = canTip ? (choosingTrump ? t.idleTrump : t.idle) : '';
  const tone = msg ? msg.tone : 'idle';
  return (
    <div className={`coach-bar coach-bar--${tone}`} data-coach={tone} aria-label={t.label}>
      <div className="coach-bar__msg" role="status" aria-live="polite">
        <p key={msg ? msg.id : 'idle'} className="coach-bar__text">
          {msg ? coachText(lang, msg, nameOf) : idle}
        </p>
      </div>
      {canTip && (
        <button
          type="button"
          className="coach-bar__tip"
          data-coach-tip
          aria-label={t.tipAria}
          onClick={onTip}
        >
          {t.tip}
        </button>
      )}
    </div>
  );
};

export default CoachBar;
