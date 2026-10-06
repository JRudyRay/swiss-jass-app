import * as Schieber from '../src/engine/schieber';
import * as Bot from '../src/engine/bot';

// Offline fit of Bot.MODEL: plays hands with a forced contract (all four seats
// use Bot.chooseCard) and regresses the chooser team's raw card margin (no
// Weis, no multiplier) on Bot.contractFeatures. Prints the coefficients.
// Run: npx esbuild scripts/calibrate-bot.ts --bundle --platform=node --format=cjs --outfile=dist_scripts/cal.cjs && node dist_scripts/cal.cjs [deals]

const DEALS = Number(process.argv[2] || 1500);
let a = 12345;
Math.random = () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CONTRACTS: Schieber.TrumpContract[] = [
  'eicheln',
  'schellen',
  'rosen',
  'schilten',
  'oben-abe',
  'unden-ufe',
];
type Row = { f: number[]; y: number; push: number };
const rows: Record<'suit' | 'oben' | 'unden', Row[]> = { suit: [], oben: [], unden: [] };
const bestVals: number[] = [];

for (let d = 0; d < DEALS; d++) {
  const base = Schieber.startGameLocal(undefined, undefined, undefined, Math.random);
  const fh = base.forehand as number;
  for (const push of [0, 1]) {
    const chooser = push ? (fh + 2) % 4 : fh;
    for (const contract of CONTRACTS) {
      let st = JSON.parse(JSON.stringify(base)) as Schieber.State;
      st.currentPlayer = chooser;
      st = Schieber.setTrumpAndDetectWeis(st, contract);
      const hand = st.players[chooser].hand.map((c) => ({ ...c }));
      const weis = Schieber.calculateTeamWeis(st.players, contract, st.forehand);
      while (st.phase !== 'finished') {
        const p = st.currentPlayer;
        st = Schieber.playCardLocal(st, p, Bot.chooseCard(st, p)!);
        if (st.pendingResolve) st = Schieber.resolveTrick(st);
      }
      const mult = st.trumpMultiplier || 1;
      const team = chooser % 2 === 0 ? 1 : 2;
      const m1 = (st.scores.team1 - st.scores.team2) / mult - (weis.team1 - weis.team2);
      const y = team === 1 ? m1 : -m1;
      const g = contract === 'oben-abe' ? 'oben' : contract === 'unden-ufe' ? 'unden' : 'suit';
      rows[g].push({ f: Bot.contractFeatures(hand, contract), y, push });
    }
  }
}

function solve(A: number[][], b: number[]) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const k = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= k * A[i][c];
      b[r] -= k * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}
function fit(rs: Row[]) {
  const k = rs[0].f.length + 1; // + push indicator
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (const r of rs) {
    const x = [...r.f, r.push];
    for (let i = 0; i < k; i++) {
      b[i] += x[i] * r.y;
      for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j];
    }
  }
  for (let i = 1; i < k; i++) A[i][i] += 2; // light ridge
  const w = solve(A, b);
  let sse = 0,
    sst = 0;
  const my = rs.reduce((s, r) => s + r.y, 0) / rs.length;
  for (const r of rs) {
    const p = [...r.f, r.push].reduce((s, v, i) => s + v * w[i], 0);
    sse += (r.y - p) ** 2;
    sst += (r.y - my) ** 2;
  }
  return { w, r2: 1 - sse / sst, rmse: Math.sqrt(sse / rs.length), n: rs.length };
}
const out: any = {};
let pushSum = 0;
for (const g of ['suit', 'oben', 'unden'] as const) {
  const r = fit(rows[g]);
  out[g] = r.w.slice(0, -1).map((x) => Math.round(x * 100) / 100);
  pushSum += r.w[r.w.length - 1];
  console.error(
    g,
    'n',
    r.n,
    'R2',
    r.r2.toFixed(3),
    'rmse',
    r.rmse.toFixed(1),
    'push',
    r.w[r.w.length - 1].toFixed(2),
  );
}
out.partnerPush = Math.round((pushSum / 3) * 100) / 100;
console.log(JSON.stringify(out));
