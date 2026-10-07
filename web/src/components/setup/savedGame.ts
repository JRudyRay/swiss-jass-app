// Reads the saved single-player match (localStorage `jassLocalState`) without touching it, and says
// whether it is an unfinished match worth offering to continue. Finished or damaged saves return null.
export type SavedGameSummary = { mine: number; theirs: number; target: number };

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
    if (over || st.matchWinner) return null;
    const myTeam = st.players.find((p: any) => p.id === 0)?.team === 2 ? 2 : 1;
    return myTeam === 1
      ? { mine: team1, theirs: team2, target }
      : { mine: team2, theirs: team1, target };
  } catch {
    return null;
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
