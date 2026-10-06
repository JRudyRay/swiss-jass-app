import * as Schieber from '../src/engine/schieber';
import * as Bot from '../src/engine/bot';

// Head to head: the new bot (engine/bot.ts) against the old baseline bot
// (chooseBotTrump/chooseBotCard in schieber.ts). Duplicate format: every dealt
// state is played twice, with the new bot on team 1 and then on team 2.
// Exits non-zero on an illegal card or a hand total other than 157.
// Usage: npm run h2h -- [--deals 1000] [--matches 300] [--seed 1]

const args = process.argv.slice(2);
const opt = (name: string, def: number) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const DEALS = opt('deals', 1000),
  MATCHES = opt('matches', 300),
  SEED = opt('seed', 1);

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
Math.random = mulberry32(SEED);
// --set margin=30 safeRisk=0.1 ... overrides Bot.SCHIEBEN_BELOW / Bot.TUNE for tuning runs
for (const kv of args.filter((a) => /^\w+=[-\d.]+$/.test(a))) {
  const [k, v] = kv.split('=');
  if (k in Bot.TUNE) (Bot.TUNE as any)[k] = Number(v);
  else (Bot.SCHIEBEN_BELOW as any)[k] = Number(v);
}

type Policy = {
  trump: (s: Schieber.State, seat: number) => any;
  card: (s: Schieber.State, seat: number) => string | null;
};
const OLD: Policy = { trump: Schieber.chooseBotTrump, card: Schieber.chooseBotCard };
// --ntrump 0 / --ncard 0 give the "new" side the old trump or card logic (diagnosis only)
const NEW: Policy = {
  trump: opt('ntrump', 1) ? Bot.chooseTrump : OLD.trump,
  card: opt('ncard', 1) ? Bot.chooseCard : OLD.card,
};

let failures = 0;
function fail(msg: string) {
  failures++;
  if (failures <= 10) console.error('  FAIL:', msg);
}

// Plays one hand to the end (or to the target). `newTeam` is the team the new bot plays for.
function playHand(start: Schieber.State, newTeam: number): Schieber.State {
  let st = JSON.parse(JSON.stringify(start)) as Schieber.State;
  const pol = (seat: number) => ((seat % 2 === 0 ? 1 : 2) === newTeam ? NEW : OLD);
  let guard = 0;
  while (st.phase === 'trump_selection' && guard++ < 4) {
    st = Schieber.setTrumpAndDetectWeis(st, pol(st.currentPlayer).trump(st, st.currentPlayer));
  }
  if (st.phase !== 'playing') {
    fail('trump selection did not finish');
    return st;
  }
  let lastWinner = -1;
  while (st.phase !== 'finished' && guard++ < 200) {
    const p = st.currentPlayer;
    const legal = Schieber.getLegalCardsForPlayer(st, p);
    const pick = pol(p).card(st, p);
    if (!pick || !legal.some((c) => c.id === pick)) {
      fail(`seat ${p} played illegal card ${pick}`);
      return st;
    }
    st = Schieber.playCardLocal(st, p, pick);
    if (st.pendingResolve) {
      lastWinner = Schieber.peekTrickWinner(st)!;
      const handOver = st.players.every((q) => q.hand.length === 0);
      st = Schieber.resolveTrick(st);
      if (handOver) {
        let total = 5;
        for (const q of st.players)
          for (const c of q.tricks) total += Schieber.cardPoints(c, st.trump);
        if (total !== 157) fail(`hand total ${total} != 157`);
      }
    }
  }
  return st;
}

const t0 = Date.now();
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

// 1. Duplicate deals
const diffs: number[] = [];
let better = 0,
  worse = 0;
for (let i = 0; i < DEALS; i++) {
  const st = Schieber.startGameLocal(undefined, undefined, undefined, Math.random);
  const a = playHand(st, 1),
    b = playHand(st, 2);
  const d = (a.scores.team1 - a.scores.team2 + (b.scores.team2 - b.scores.team1)) / 2;
  diffs.push(d);
  if (d > 0) better++;
  else if (d < 0) worse++;
}
const m = mean(diffs),
  se = sd(diffs) / Math.sqrt(diffs.length);
console.log(`Duplicate deals: ${DEALS}`);
console.log(
  `  mean margin per hand (new - old): ${m.toFixed(2)} points, SE ${se.toFixed(2)} (${(m / se).toFixed(1)} SE)`,
);
console.log(
  `  new outscored old in ${((100 * better) / DEALS).toFixed(1)}% of deals, old in ${((100 * worse) / DEALS).toFixed(1)}%, level ${((100 * (DEALS - better - worse)) / DEALS).toFixed(1)}%`,
);

// 2. 1000-point matches, new bot alternating between the teams
let wins = 0;
for (let i = 0; i < MATCHES; i++) {
  const newTeam = i % 2 === 0 ? 1 : 2;
  let st = Schieber.startGameLocal(undefined, undefined, 1000, Math.random);
  let hands = 0;
  while (hands++ < 60) {
    st = playHand(st, newTeam);
    if (failures || st.matchWinner) break;
    st = Schieber.startNewHand(st);
  }
  if (st.matchWinner === newTeam) wins++;
}
const rate = wins / MATCHES,
  rse = Math.sqrt((rate * (1 - rate)) / MATCHES);
console.log(
  `Matches to 1000: ${MATCHES}, new bot won ${wins} (${(100 * rate).toFixed(1)}%, SE ${(100 * rse).toFixed(1)}%)`,
);
console.log(`Elapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exitCode = 1;
}
