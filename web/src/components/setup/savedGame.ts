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
