import React, { useEffect, useState } from 'react';

const PALETTE = ['#c0392b', '#fffaf0', '#8a5a34', '#d94a3a', '#e9dfc8', '#5b3a24'];
const PIECES = 24;

export const motionAllowed = (): boolean => {
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
};

// About 1.6 s of paper confetti in the Swiss red / white / wood palette. CSS only; every piece
// falls with transform and opacity. Hidden under reduced motion (see GameTable.css).
export const Confetti: React.FC = () => (
  <div className="confetti" aria-hidden="true" data-confetti>
    {Array.from({ length: PIECES }, (_, i) => (
      <i
        key={i}
        style={
          {
            left: `${(i * 41 + 7) % 100}%`,
            background: PALETTE[i % PALETTE.length],
            '--dx': `${((i * 29) % 90) - 45}px`,
            '--rot': `${200 + ((i * 67) % 300)}deg`,
            '--delay': `${(i % 8) * 25}ms`,
            '--dur': `${1100 + (i % 5) * 100}ms`,
            width: i % 3 === 0 ? 6 : 8,
            height: i % 3 === 0 ? 12 : 8,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);

// Counts from 0 up to `target` over `ms` (ease-out) when `enabled`; otherwise the target at once.
export function useCountUp(target: number, enabled: boolean, ms = 900): number {
  const [v, setV] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, ms]);
  return v;
}
