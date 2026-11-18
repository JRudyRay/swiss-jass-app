import React from 'react';
import { jitter, tafel, tallyGroups } from '../../game/jasstafel';
import { messages, type Lang } from '../../i18n';
import { TEAM_COLORS } from './ScoreBar';

type Team = { name: string; points: number };
type Props = { lang: Lang; teams: [Team, Team]; compact?: boolean };

// Hand-made digits in a 10 x 16 box (stroke paths), so the remainder looks written, not typeset.
const DIGITS: Record<string, string> = {
  '0': 'M5 1C1 1 1 4 1 8C1 12 1 15 5 15C9 15 9 12 9 8C9 4 9 1 5 1Z',
  '1': 'M2.5 4.5L6 1V15',
  '2': 'M1.5 4C2 1 8 0.5 8.5 4C9 7 3 11 1 15H9.5',
  '3': 'M1.5 2C5 0.5 9 1.5 8 5C7.5 7.5 5 8 4 8C8 8 9.5 10 9 12.5C8 15.5 3 16 1 13',
  '4': 'M7 15V1L1 11H9.5',
  '5': 'M8.5 1H2.5L2 7C5 5.5 9 6.5 9 10.5C9 15 4 16 1 13',
  '6': 'M8 2C4 0 1.5 4 1.5 9C1.5 15 9 16 9 11C9 7 3 6 1.5 10',
  '7': 'M1 1.5H9C7 7 5.5 11 4.5 15',
  '8': 'M5 8C1 7 1.5 1 5 1C8.5 1 9 7 5 8C1 9 1 15 5 15C9 15 9 9 5 8Z',
  '9': 'M2 14C6 16 8.5 12 8.5 7C8.5 1 1 0 1 5C1 9 7 10 8.5 6',
};

const r1 = (n: number) => Math.round(n * 10) / 10;

// One chalk stroke from (x1,y1) to (x2,y2) with a slight bend and wobbly ends.
function stroke(x1: number, y1: number, x2: number, y2: number, i: number) {
  const j = (k: number, a: number) => jitter(i, k) * a;
  const ax = x1 + j(0, 1.2);
  const ay = y1 + j(1, 1.5);
  const bx = x2 + j(2, 1.2);
  const by = y2 + j(3, 1.5);
  const cx = (ax + bx) / 2 + j(4, 1.6);
  const cy = (ay + by) / 2 + j(5, 1.6);
  return `M${r1(ax)} ${r1(ay)}Q${r1(cx)} ${r1(cy)} ${r1(bx)} ${r1(by)}`;
}

const CELL = 140;
const BAR_TOP = 86;
const BAR_BOTTOM = 172;
const X0 = 16;
const X1 = 124;
const ROW = 26;
const PER_ROW = 5;

// One "Z": hundreds above the top bar, the fifty on the diagonal, twenties below the bottom bar,
// the rest as digits in the lower right triangle.
const Zed: React.FC<{ points: number; seed: number }> = ({ points, seed }) => {
  const { h, f, z, rest } = tafel(points);
  const groups = tallyGroups(h);
  const d: string[] = [];
  let n = seed * 100;

  // Hundreds: groups of five (four strokes and a slash), left to right, rows stacked upward.
  groups.forEach((size, g) => {
    const row = Math.floor(g / PER_ROW);
    const col = g % PER_ROW;
    const gx = X0 + 2 + col * 21.5;
    const yb = BAR_TOP - 7 - row * ROW;
    const yt = yb - 19;
    const sticks = Math.min(size, 4);
    for (let s = 0; s < sticks; s++) d.push(stroke(gx + s * 4.6, yt, gx + s * 4.6, yb, n++));
    if (size === 5) d.push(stroke(gx - 3, yb - 3, gx + 17.5, yt + 3, n++));
  });

  // Fifty: the diagonal (drawn bold), a faint guide when there is none.
  const diag = stroke(X1, BAR_TOP, X0, BAR_BOTTOM, 9000 + seed);
  // Twenties: strokes hanging below the bottom bar.
  for (let s = 0; s < z; s++) {
    const x = X0 + 14 + s * 11;
    d.push(stroke(x, BAR_BOTTOM + 8, x, BAR_BOTTOM + 30, n++));
  }

  // Rest: one or two hand-made digits.
  const text = rest > 0 ? String(rest) : '';
  const scale = 2.1;
  const width = text.length * 11 * scale;
  const dx = X1 - 6 - width;
  const digits = [...text].map((ch, k) => (
    <path
      key={k}
      d={DIGITS[ch]}
      transform={`translate(${r1(dx + k * 11 * scale)} ${r1(BAR_BOTTOM - 8 - 16 * scale)}) scale(${scale}) rotate(${r1(
        jitter(seed * 7 + k, 7) * 3,
      )} 5 8)`}
      vectorEffect="non-scaling-stroke"
    />
  ));

  return (
    <g>
      <path className="tafel__bar" d={stroke(X0 - 6, BAR_TOP, X1 + 6, BAR_TOP, 7000 + seed)} />
      <path
        className="tafel__bar"
        d={stroke(X0 - 6, BAR_BOTTOM, X1 + 6, BAR_BOTTOM, 7100 + seed)}
      />
      <path
        className={f ? 'tafel__bar tafel__bar--fifty' : 'tafel__bar tafel__bar--ghost'}
        d={diag}
      />
      {d.map((p, i) => (
        <path key={i} className="tafel__mark" d={p} />
      ))}
      <g className="tafel__grain">
        {d.map((p, i) => (
          <path key={i} d={p} />
        ))}
      </g>
      <g className="tafel__digits">{digits}</g>
    </g>
  );
};

// The Jasstafel: a slate with two chalk Z's (the second one upside down, as written by the other
// side of the table). Everything is derived from the exact totals: this is display only.
const Jasstafel: React.FC<Props> = ({ lang, teams, compact }) => {
  const t = messages(lang).tafel;
  const [a, b] = teams;
  const label = t.aria(a.name, a.points, b.name, b.points);
  return (
    <figure className={`tafel${compact ? ' tafel--compact' : ''}`} aria-label={label}>
      <div className="tafel__frame">
        <svg
          className="tafel__svg"
          viewBox={`0 0 ${CELL * 2 + 20} 210`}
          role="img"
          aria-label={label}
        >
          <g transform="translate(5 -6)">
            <Zed points={a.points} seed={1} />
          </g>
          <g transform={`translate(${CELL + 15} -6) rotate(180 ${CELL / 2} 105)`}>
            <Zed points={b.points} seed={2} />
          </g>
        </svg>
      </div>
      <figcaption className="tafel__captions">
        {teams.map((team, i) => (
          <div
            key={i}
            className="tafel__cap"
            style={{ '--team': TEAM_COLORS[i + 1] } as React.CSSProperties}
          >
            <span className="tafel__cap-name">{team.name}</span>
            <span className="tafel__cap-pts">{team.points}</span>
          </div>
        ))}
      </figcaption>
    </figure>
  );
};

export default Jasstafel;
