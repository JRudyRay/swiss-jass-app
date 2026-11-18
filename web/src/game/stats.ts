import * as Schieber from '../engine/schieber';
import { DEFAULT_LEVEL, isBotLevel, type BotLevel } from './botLevel';

// Local statistics for single-player matches, kept in localStorage under `jassStats.v1`.
// Storage holds the last MAX_MATCHES finished matches and running counters; every figure shown
// (win rate, averages) is computed on read. Writes are idempotent: a hand by (matchId, handNo), a
// match by its id, so a reload that replays the end of a hand or match never counts it twice.
const KEY = 'jassStats.v1';
const CURRENT_KEY = 'jassCurrentMatch';
const MAX_MATCHES = 50;
const MAX_SEEN = 400;

export type MatchRecord = {
  id: string;
  at: number; // ms since the epoch
  won: boolean;
  us: number;
  them: number;
  target: number;
  hands: number;
  coach: boolean;
  level: BotLevel;
  undo: boolean; // a card was taken back: the match does not count for the streak
};

type ContractCount = { n: number; pts: number };
type Stored = {
  v: 1;
  matches: MatchRecord[]; // newest last
  seenMatches: string[];
  seenHands: string[];
  played: number;
  won: number;
  streak: number;
  bestStreak: number;
  biggestWin: number;
  hands: number;
  bestHand: number;
  matschMade: number;
  matschSuffered: number;
  weisPoints: number;
  stoeck: number;
  contracts: Record<string, ContractCount>;
};

const empty = (): Stored => ({
  v: 1,
  matches: [],
  seenMatches: [],
  seenHands: [],
  played: 0,
  won: 0,
  streak: 0,
  bestStreak: 0,
  biggestWin: 0,
  hands: 0,
  bestHand: 0,
  matschMade: 0,
  matschSuffered: 0,
  weisPoints: 0,
  stoeck: 0,
  contracts: {},
});

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string').slice(-MAX_SEEN) : [];

// Anything unreadable or of the wrong shape gives empty stats rather than an error.
function load(): Stored {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return empty();
    const s = empty();
    s.matches = (Array.isArray(raw.matches) ? raw.matches : [])
      .filter(
        (m: any) =>
          m &&
          typeof m.id === 'string' &&
          typeof m.won === 'boolean' &&
          Number.isFinite(m.us) &&
          Number.isFinite(m.them),
      )
      .map((m: any) => ({
        id: m.id,
        at: num(m.at),
        won: m.won,
        us: m.us,
        them: m.them,
        target: num(m.target),
        hands: num(m.hands),
        coach: m.coach === true,
        level: isBotLevel(m.level) ? m.level : DEFAULT_LEVEL,
        undo: m.undo === true,
      }))
      .slice(-MAX_MATCHES);
    s.seenMatches = strs(raw.seenMatches);
    s.seenHands = strs(raw.seenHands);
    for (const k of [
      'played',
      'won',
      'streak',
      'bestStreak',
      'biggestWin',
      'hands',
      'bestHand',
      'matschMade',
      'matschSuffered',
      'weisPoints',
      'stoeck',
    ] as const)
      s[k] = num(raw[k]);
    if (raw.contracts && typeof raw.contracts === 'object')
      for (const [k, c] of Object.entries<any>(raw.contracts))
        if (c && num(c.n)) s.contracts[k] = { n: num(c.n), pts: num(c.pts) };
    return s;
  } catch {
    return empty();
  }
}

function save(s: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage unavailable: the statistics just won't be kept
  }
}

const remember = (list: string[], id: string) => {
  list.push(id);
  if (list.length > MAX_SEEN) list.splice(0, list.length - MAX_SEEN);
};

// --- The match being played (separate key, not part of the engine state) ---

const newId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

// What the current match was played with: the bot level it started with, and whether a card was
// taken back (training mode). Kept apart from the engine state, like the match id.
const META_KEY = 'jassMatchMeta';
export type MatchMeta = { level: BotLevel; undo: boolean };

export function readMatchMeta(): MatchMeta {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) || 'null');
    return {
      level: isBotLevel(raw?.level) ? raw.level : DEFAULT_LEVEL,
      undo: raw?.undo === true,
    };
  } catch {
    return { level: DEFAULT_LEVEL, undo: false };
  }
}

function writeMatchMeta(meta: MatchMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

export const markMatchUndo = () => writeMatchMeta({ ...readMatchMeta(), undo: true });

export function startNewMatch(level: BotLevel = DEFAULT_LEVEL): string {
  const id = newId();
  writeMatchMeta({ level, undo: false });
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // ignore
  }
  return id;
}

// The current match id; a match that was saved before this existed gets one when first needed.
export function currentMatchId(): string {
  try {
    const id = localStorage.getItem(CURRENT_KEY);
    if (id) return id;
  } catch {
    // ignore
  }
  return startNewMatch();
}

// --- Recording ---

type Pair = { team1: number; team2: number };
export type HandFacts = Pick<Schieber.HandSummary, 'trump' | 'weis' | 'stoeck' | 'match' | 'hand'>;

// One finished hand. `myTeam` is the human's team (1 or 2); `declarerTeam` the team that named
// the contract (null if unknown). Returns false when this hand was already recorded.
export function recordHand(
  matchId: string,
  handNo: number,
  summary: HandFacts,
  myTeam: 1 | 2,
  declarerTeam: number | null,
): boolean {
  const s = load();
  const key = `${matchId}:${handNo}`;
  if (s.seenHands.includes(key)) return false;
  const mine = (p: Pair) => (myTeam === 1 ? p.team1 : p.team2);
  const theirs = (p: Pair) => (myTeam === 1 ? p.team2 : p.team1);
  const pts = Math.max(0, mine(summary.hand));
  remember(s.seenHands, key);
  s.hands += 1;
  s.bestHand = Math.max(s.bestHand, pts);
  if (mine(summary.match) > 0) s.matschMade += 1;
  if (theirs(summary.match) > 0) s.matschSuffered += 1;
  s.weisPoints += mine(summary.weis);
  s.stoeck += Math.round(mine(summary.stoeck) / 20);
  if (declarerTeam === myTeam && summary.trump) {
    const c = s.contracts[summary.trump] || { n: 0, pts: 0 };
    c.n += 1;
    c.pts += pts;
    s.contracts[summary.trump] = c;
  }
  save(s);
  return true;
}

export type MatchResult = {
  won: boolean;
  us: number;
  them: number;
  target: number;
  hands: number;
  coach?: boolean;
  level?: BotLevel;
  undo?: boolean;
  at?: number;
};

// A finished match. Returns false when it was already recorded.
export function finishMatch(id: string, r: MatchResult): boolean {
  const s = load();
  if (s.seenMatches.includes(id)) return false;
  remember(s.seenMatches, id);
  s.played += 1;
  // A match with a card taken back is played and won, but leaves the winning streak as it was.
  if (r.won) {
    s.won += 1;
    if (!r.undo) {
      s.streak += 1;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    }
    s.biggestWin = Math.max(s.biggestWin, r.us - r.them);
  } else if (!r.undo) s.streak = 0;
  s.matches.push({
    id,
    at: r.at ?? Date.now(),
    won: r.won,
    us: r.us,
    them: r.them,
    target: r.target,
    hands: r.hands,
    coach: r.coach === true,
    level: r.level ?? DEFAULT_LEVEL,
    undo: r.undo === true,
  });
  if (s.matches.length > MAX_MATCHES) s.matches.splice(0, s.matches.length - MAX_MATCHES);
  save(s);
  return true;
}

// From a finished engine state: the human is player 0.
export function recordHandOf(st: Schieber.State, handNo: number, matchId = currentMatchId()) {
  const myTeam = st.players.find((p) => p.id === 0)?.team === 2 ? 2 : 1;
  const sum = Schieber.handSummary(st);
  const declarerTeam = st.players.find((p) => p.id === sum.declarer)?.team ?? null;
  return recordHand(matchId, handNo, sum, myTeam, declarerTeam);
}

export function finishMatchOf(
  st: Schieber.State,
  hands: number,
  coach: boolean,
  id = currentMatchId(),
) {
  const myTeam = st.players.find((p) => p.id === 0)?.team === 2 ? 2 : 1;
  const a = st.scores.team1 || 0;
  const b = st.scores.team2 || 0;
  const us = myTeam === 1 ? a : b;
  const them = myTeam === 1 ? b : a;
  const won = st.matchWinner ? st.matchWinner === myTeam : us > them;
  const { level, undo } = readMatchMeta();
  return finishMatch(id, { won, us, them, target: st.target || 0, hands, coach, level, undo });
}

// --- Reading ---

export type StatsView = {
  played: number;
  won: number;
  winRate: number; // 0..1
  streak: number;
  bestStreak: number;
  hands: number;
  bestHand: number;
  matschMade: number;
  matschSuffered: number;
  weisPoints: number;
  stoeck: number;
  biggestWin: number;
  contracts: { trump: string; n: number; avg: number }[]; // most chosen first
  recent: MatchRecord[]; // newest first
};

export function readStats(): StatsView {
  const s = load();
  return {
    played: s.played,
    won: s.won,
    winRate: s.played ? s.won / s.played : 0,
    streak: s.streak,
    bestStreak: s.bestStreak,
    hands: s.hands,
    bestHand: s.bestHand,
    matschMade: s.matschMade,
    matschSuffered: s.matschSuffered,
    weisPoints: s.weisPoints,
    stoeck: s.stoeck,
    biggestWin: s.biggestWin,
    contracts: Object.entries(s.contracts)
      .map(([trump, c]) => ({ trump, n: c.n, avg: c.pts / c.n }))
      .sort((a, b) => b.n - a.n),
    recent: s.matches.slice().reverse(),
  };
}

export function resetStats() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
