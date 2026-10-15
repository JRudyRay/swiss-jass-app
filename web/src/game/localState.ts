import * as Schieber from '../engine/schieber';

export type GameState = {
  phase: string;
  currentPlayer: number;
  trumpSuit?: string | null;
  currentTrick?: any[];
  scores?: { team1: number; team2: number };
  roundScores?: { team1: number; team2: number };
  dealer?: number;
  forehand?: number | null;
  weis?: Record<number, any[]>; // playerId -> Weis declarations
};

export type Player = { id: number; name: string; hand: any[]; team: number; position: string };

export const toGameState = (st: Schieber.State): GameState => ({
  phase: st.phase,
  currentPlayer: st.currentPlayer,
  trumpSuit: st.trump || null,
  currentTrick: st.currentTrick || [],
  scores: st.scores,
  dealer: st.dealer,
  weis: st.weis,
  forehand: st.forehand ?? null,
});

export const loadLocalState = (): Schieber.State | null => {
  try {
    const raw = localStorage.getItem('jassLocalState');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Schieber.State & { _lastActionAt?: number };
    // Backfill missing timestamp to avoid huge age values
    if (!parsed._lastActionAt) parsed._lastActionAt = Date.now();
    // Saves from older versions lack some fields; a save without players is unusable.
    if (!Array.isArray(parsed.players) || parsed.players.length !== 4 || !parsed.scores)
      return null;
    if (!Array.isArray(parsed.currentTrick)) parsed.currentTrick = [];
    if (parsed.forehand === undefined || parsed.forehand === null)
      parsed.forehand = (((parsed.dealer ?? 0) + 3) % 4) as any;
    if (!parsed.handStartScores) {
      const none = !parsed.scores.team1 && !parsed.scores.team2;
      parsed.handStartScores = none ? { team1: 0, team2: 0 } : ({ ...parsed.scores } as any);
    }
    return parsed as Schieber.State;
  } catch {
    return null;
  }
};

export const saveLocalState = (st: Schieber.State) => {
  try {
    // annotate with last action timestamp used by UI watchdog
    try {
      (st as any)._lastActionAt = Date.now();
    } catch (e) {}
    localStorage.setItem('jassLocalState', JSON.stringify(st));
  } catch (e) {
    // ignore storage errors
  }
};
