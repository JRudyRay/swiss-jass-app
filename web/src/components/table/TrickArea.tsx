import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SwissCard } from '../../SwissCard';

// Tilt of each seat's card in the pile (mirrors --rot in GameTable.css); used by the collect animation.
const TRICK_ROT: Record<string, number> = { south: 3, north: -4, west: -4, east: 4, center: 0 };

// Trick collection timing: a short pause with the winner highlighted, then the pile slides to the winner.
export const HIGHLIGHT_MS = 600;
export const SLIDE_MS = 420;
export const COLLECT_MS = HIGHLIGHT_MS + SLIDE_MS + 60;

export type TrickCard = { card: any; seat: string };
export type Collect = { winnerSeat: string; winningCardId: string } | null;

type Props = {
  cards: TrickCard[];
  collect: Collect;
  emptyLabel?: string | null;
};

const reducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// The cards in the middle of the felt. While `collect` is set, the winning card is ringed in gold,
// then every card slides and fades toward the winner's name plate (found via `data-seat` on the table).
export const TrickArea: React.FC<Props> = ({ cards, collect, emptyLabel }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sliding, setSliding] = useState(false);

  useEffect(() => {
    setSliding(false);
    if (!collect) return;
    const id = setTimeout(() => setSliding(true), HIGHLIGHT_MS);
    return () => clearTimeout(id);
  }, [collect?.winnerSeat, collect?.winningCardId]);

  // The cards gather onto the winning card, then swoop in an arc into the winner's seat.
  useLayoutEffect(() => {
    if (!sliding || !collect) return;
    const table = boxRef.current?.closest('[data-jass-table]');
    const target = table
      ?.querySelector(`[data-seat="${collect.winnerSeat}"]`)
      ?.getBoundingClientRect();
    if (!target) return;
    const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const t = center(target);
    const still = reducedMotion();
    const anims: Animation[] = [];
    Object.entries(cardRefs.current).forEach(([id, el]) => {
      if (!el || typeof el.animate !== 'function') return;
      if (still) {
        anims.push(
          el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }),
        );
        return;
      }
      // Slide straight toward the winner's chip while shrinking and fading (transform/opacity only).
      const c = center(el.getBoundingClientRect());
      const rot = TRICK_ROT[seatOf[id]] ?? 0;
      const tr = (x: number, y: number, r: number, s: number) =>
        `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${r}deg) scale(${s})`;
      const win = id === collect.winningCardId;
      anims.push(
        el.animate(
          [
            { transform: tr(0, 0, win ? 0 : rot, win ? 1.08 : 1), opacity: 1 },
            { transform: tr(t.x - c.x, t.y - c.y, 0, 0.45), opacity: 0 },
          ],
          { duration: SLIDE_MS, easing: 'cubic-bezier(0.4, 0, 0.8, 0.6)', fill: 'forwards' },
        ),
      );
    });
    return () => anims.forEach((a) => a.cancel());
  }, [sliding]);

  const seatOf: Record<string, string> = {};
  cards.forEach(({ card, seat }, i) => {
    seatOf[String(card.id ?? i)] = seat;
  });

  return (
    <div ref={boxRef} className="trick">
      {cards.map(({ card, seat }, i) => {
        const id = String(card.id ?? i);
        const isWinner = !!collect && collect.winningCardId === id;
        const cls = [
          'trick-card',
          `trick-card--${TRICK_ROT[seat] !== undefined ? seat : 'center'}`,
          isWinner && 'trick-card--winner',
          collect && !isWinner && !sliding && 'trick-card--loser',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={id}
            className={cls}
            style={{ zIndex: isWinner ? 20 : i + 1 }}
            ref={(el) => {
              cardRefs.current[id] = el;
            }}
          >
            <SwissCard card={card} />
          </div>
        );
      })}
      {cards.length === 0 && emptyLabel && <div className="trick__empty">{emptyLabel}</div>}
    </div>
  );
};

export default TrickArea;
