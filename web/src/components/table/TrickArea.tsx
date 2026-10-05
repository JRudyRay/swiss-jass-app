import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SwissCard } from '../../SwissCard';

// Where each seat's card lands in the trick area (small tilt, like a real pile).
const TRICK_POS: Record<string, { left: string; top: string; rot: number }> = {
  south: { left: '50%', top: '78%', rot: 2 },
  north: { left: '50%', top: '22%', rot: -3 },
  west: { left: '22%', top: '50%', rot: -6 },
  east: { left: '78%', top: '50%', rot: 5 },
  center: { left: '50%', top: '50%', rot: 0 },
};

// Trick collection timing: the winning card is highlighted, then the pile slides to the winner.
export const HIGHLIGHT_MS = 650;
export const SLIDE_MS = 480;
export const COLLECT_MS = HIGHLIGHT_MS + SLIDE_MS + 60;

export type TrickCard = { card: any; seat: string };
export type Collect = { winnerSeat: string; winningCardId: string } | null;

type Props = {
  cards: TrickCard[];
  collect: Collect;
  emptyLabel?: string | null;
};

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

// The cards in the middle of the felt. While `collect` is set, the winning card lifts and glows,
// then every card slides into the winner's name plate (found via `data-seat` on the table).
export const TrickArea: React.FC<Props> = ({ cards, collect, emptyLabel }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sliding, setSliding] = useState(false);
  const [deltas, setDeltas] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    setSliding(false);
    setDeltas({});
    if (!collect) return;
    const id = setTimeout(() => setSliding(true), HIGHLIGHT_MS);
    return () => clearTimeout(id);
  }, [collect?.winnerSeat, collect?.winningCardId]);

  useLayoutEffect(() => {
    if (!sliding || !collect) return;
    const table = boxRef.current?.closest('[data-jass-table]');
    const target = table?.querySelector(`[data-seat="${collect.winnerSeat}"]`)?.getBoundingClientRect();
    if (!target) return;
    const tx = target.left + target.width / 2;
    const ty = target.top + target.height / 2;
    const next: Record<string, { x: number; y: number }> = {};
    for (const [id, el] of Object.entries(cardRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next[id] = { x: tx - (r.left + r.width / 2), y: ty - (r.top + r.height / 2) };
    }
    setDeltas(next);
  }, [sliding]);

  const still = reducedMotion();

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {cards.map(({ card, seat }, i) => {
        const id = String(card.id ?? i);
        const pos = TRICK_POS[seat] || TRICK_POS.center;
        const isWinner = !!collect && collect.winningCardId === id;
        const d = deltas[id];
        const moving = sliding && !!d;
        const transform = moving
          ? `translate(calc(-50% + ${still ? 0 : d.x}px), calc(-50% + ${still ? 0 : d.y}px)) rotate(${pos.rot}deg) scale(0.3)`
          : `translate(-50%,-50%) rotate(${isWinner ? 0 : pos.rot}deg) scale(${isWinner ? 1.08 : 1})`;
        return (
          <div key={id} ref={el => { cardRefs.current[id] = el; }} style={{
            position: 'absolute', left: pos.left, top: pos.top, transform,
            zIndex: isWinner ? 20 : i + 1,
            opacity: moving ? 0 : 1,
            transition: moving
              ? `transform ${SLIDE_MS}ms cubic-bezier(0.45, 0, 0.2, 1), opacity ${SLIDE_MS}ms cubic-bezier(0.7, 0, 1, 1)`
              : 'transform 220ms ease, filter 220ms ease',
            filter: collect && !isWinner && !moving ? 'brightness(0.82)' : 'none',
          }}>
            <div style={{
              borderRadius: 8,
              boxShadow: isWinner ? '0 0 0 3px #fbbf24, 0 6px 18px rgba(0,0,0,0.45)' : 'none',
              transition: 'box-shadow 220ms ease',
            }}>
              <SwissCard card={card} />
            </div>
          </div>
        );
      })}
      {cards.length === 0 && emptyLabel && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: 'rgba(255,250,240,0.65)', fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>
          {emptyLabel}
        </div>
      )}
    </div>
  );
};

export default TrickArea;
