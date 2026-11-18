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
// Room above the top bar for the rows of hundreds.
const HEADROOM = 66;

// One "Z", always drawn whole (top bar, diagonal, bottom bar). Hundreds are tally strokes crossing
// the top bar (groups of five: four strokes and a slash; more rows stack upward), each fifty is a
// short stroke crossing the diagonal, twenties are strokes crossing the bottom bar, and the rest
// is written as digits in the lower right triangle.
const Zed: React.FC<{ points: number; seed: number }> = ({ points, seed }) => {
  const { h, f, z, rest } = tafel(points);
  const groups = tallyGroups(h);
  const frame: string[] = [
    stroke(X0 - 6, BAR_TOP, X1 + 6, BAR_TOP, 7000 + seed),
    stroke(X1, BAR_TOP, X0, BAR_BOTTOM, 9000 + seed),
    stroke(X0 - 6, BAR_BOTTOM, X1 + 6, BAR_BOTTOM, 7100 + seed),
  ];
  const d: string[] = [];
  let n = seed * 100;

  // Hundreds. Rows share the width and (when there are many) squeeze together, so any total fits.
  const perRow = Math.max(5, Math.ceil(groups.length / 4));
  const rows = Math.ceil(groups.length / perRow);
  const rowH = rows > 1 ? Math.min(26, HEADROOM / (rows - 1)) : 26;
  const len = Math.min(21, rowH - 4);
  const gw = Math.min(21.5, (X1 - X0 - 2) / perRow);
  const sw = Math.min(5, gw / 4.4);
  groups.forEach((size, g) => {
    const row = Math.floor(g / perRow);
    const col = g % perRow;
    const gx = X0 + 2 + col * gw;
    const yb = BAR_TOP + len / 2 - row * rowH;
    const yt = yb - len;
    for (let s = 0; s < Math.min(size, 4); s++)
      d.push(stroke(gx + s * sw, yt, gx + s * sw, yb, n++));
    if (size === 5) d.push(stroke(gx - 3, yb - 3, gx + sw * 3 + 3, yt + 3, n++));
  });

  // Fifty: one short stroke crossing the diagonal at its middle.
  if (f) {
    const mx = (X0 + X1) / 2;
    const my = (BAR_TOP + BAR_BOTTOM) / 2;
    d.push(stroke(mx - 8, my - 11, mx + 8, my + 11, n++));
  }
  // Twenties: strokes crossing the bottom bar.
  for (let s = 0; s < z; s++) {
    const x = X0 + 34 + s * 11;
    d.push(stroke(x, BAR_BOTTOM - 11, x, BAR_BOTTOM + 13, n++));
  }

  // Rest: one or two hand-made digits.
  const text = rest > 0 ? String(rest) : '';
  const scale = 1.9;
  const width = text.length * 11 * scale;
  const dx = X1 - 2 - width;
  const digits = [...text].map((ch, k) => (
    <path
      key={k}
      d={DIGITS[ch]}
      transform={`translate(${r1(dx + k * 11 * scale)} ${r1(BAR_BOTTOM - 9 - 16 * scale)}) scale(${scale}) rotate(${r1(
        jitter(seed * 7 + k, 7) * 3,
      )} 5 8)`}
      vectorEffect="non-scaling-stroke"
    />
  ));

  return (
    <g>
      {frame.map((p, i) => (
        <path key={`f${i}`} className="tafel__bar" d={p} />
      ))}
      {d.map((p, i) => (
        <path key={i} className="tafel__mark" d={p} />
      ))}
      <g className="tafel__grain">
        {frame.concat(d).map((p, i) => (
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
