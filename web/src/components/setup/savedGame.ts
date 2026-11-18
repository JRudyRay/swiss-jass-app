// Reads the saved single-player match (localStorage `jassLocalState`) without touching it, and says
// whether it is an unfinished match worth offering to continue. Finished or damaged saves return null.
export type SavedGameSummary = {
  mine: number;
  theirs: number;
  target: number;
  // The bots by seat 1..3 (partner first is seat 2), as named in the match.
  bots: string[];
  // The match was already decided: nothing to continue, only the result to show again.
  finished: boolean;
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function readSavedGame(fallbackTarget = 1000): SavedGameSummary | null {
  try {
    const raw = localStorage.getItem('jassLocalState');
    if (!raw) return null;
    const st = JSON.parse(raw);
    if (!st || typeof st !== 'object') return null;
    if (!Array.isArray(st.players) || st.players.length !== 4) return null;
    if (!st.players.every((p: any) => p && Array.isArray(p.hand))) return null;
    const team1 = num(st.scores?.team1);
    const team2 = num(st.scores?.team2);
    if (team1 === null || team2 === null) return null;
    const target = num(st.target) || fallbackTarget;
    // Same test the engine uses: a match is over once a winner is set or a team reached the target.
    const over = st.phase === 'finished' && (!!st.matchWinner || Math.max(team1, team2) >= target);
    const finished = over || !!st.matchWinner;
    const bots = [1, 2, 3].map((i) => String(st.players.find((p: any) => p.id === i)?.name ?? ''));
    const myTeam = st.players.find((p: any) => p.id === 0)?.team === 2 ? 2 : 1;
    return myTeam === 1
      ? { mine: team1, theirs: team2, target, bots, finished }
      : { mine: team2, theirs: team1, target, bots, finished };
  } catch {
    return null;
  }
}

// The bot names live in their own key, so the setup page, the table, a rematch and a resumed match
// all show the same three opponents. They are only rolled anew for a new match from the setup.
const BOTS_KEY = 'jassBots';

export function readBots(): string[] | null {
  try {
    const arr = JSON.parse(localStorage.getItem(BOTS_KEY) || 'null');
    if (Array.isArray(arr) && arr.length === 3 && arr.every((n) => typeof n === 'string' && n))
      return arr;
  } catch {
    // damaged: roll anew
  }
  return null;
}

export function writeBots(bots: string[]) {
  try {
    localStorage.setItem(BOTS_KEY, JSON.stringify(bots));
  } catch {
    // storage unavailable: the names just won't survive a reload
  }
}

// The per-round results table lives in its own key so saves made before it existed still load
// (they just start with an empty table) and the engine state stays untouched.
export type SavedRound = { round: number; team1: number; team2: number; trump: string };
const ROUNDS_KEY = 'jassLocalRounds';

export function writeSavedRounds(rounds: SavedRound[]) {
  try {
    if (rounds.length) localStorage.setItem(ROUNDS_KEY, JSON.stringify(rounds));
  } catch {
    // storage unavailable: the table just won't survive a reload
  }
}

export function clearSavedRounds() {
  try {
    localStorage.removeItem(ROUNDS_KEY);
  } catch {
    // ignore
  }
}

// Returns the saved rounds, or [] when missing, damaged, or not matching the saved scores
// (e.g. left over from another match).
export function readSavedRounds(scores?: { team1?: number; team2?: number }): SavedRound[] {
  try {
    const raw = localStorage.getItem(ROUNDS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const rounds: SavedRound[] = [];
    for (const r of arr) {
      const t1 = num(r?.team1);
      const t2 = num(r?.team2);
      if (t1 === null || t2 === null) return [];
      rounds.push({
        round: rounds.length + 1,
        team1: t1,
        team2: t2,
        trump: String(r?.trump ?? ''),
      });
    }
    const sum1 = rounds.reduce((a, r) => a + r.team1, 0);
    const sum2 = rounds.reduce((a, r) => a + r.team2, 0);
    if (scores && (sum1 > (scores.team1 || 0) || sum2 > (scores.team2 || 0))) return [];
    return rounds;
  } catch {
    return [];
  }
}
