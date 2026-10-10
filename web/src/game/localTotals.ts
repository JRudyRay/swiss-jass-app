import * as Schieber from '../engine/schieber';
import type { GameState, Player } from './localState';

export type LocalTotals = {
  newTotals: Record<string, number>;
  newUsers: Record<string, any>;
  t1: number;
  t2: number;
};

/** Reads jassTotals/jassUsers from localStorage and returns the updated values.
    Returns null when the game id was already processed. Does not write anything. */
export const computeTotalsUpdate = (
  state: GameState,
  playersList: Player[],
  maybeGameId?: string | null,
): LocalTotals | null => {
  // Prevent double-processing the same finished game (by id)
  if (maybeGameId) {
    try {
      const processedRawCheck = localStorage.getItem('jassProcessedGames');
      const processedCheck: string[] = processedRawCheck ? JSON.parse(processedRawCheck) : [];
      if (processedCheck.includes(maybeGameId)) return null; // already applied
    } catch (e) {
      /* ignore parse errors */
    }
  }
  const currentTotalsRaw = localStorage.getItem('jassTotals');
  const currentTotals: Record<string, number> = currentTotalsRaw
    ? JSON.parse(currentTotalsRaw)
    : {};
  const currentUsersRaw = localStorage.getItem('jassUsers');
  const currentUsers: Record<string, any> = currentUsersRaw ? JSON.parse(currentUsersRaw) : {};

  // Determine per-player points from state - Swiss Jass is TEAM-based scoring
  const additions: Record<string, number> = {};

  // Swiss Jass: Teams earn points together, each player gets the FULL team score
  if (state.scores && (state.scores as any).team1 !== undefined) {
    // If the hand finished, prefer the engine's settled totals (multiplier/Weis/match applied)
    let team1Score = (state.scores as any).team1 || 0;
    let team2Score = (state.scores as any).team2 || 0;
    try {
      if (state.phase === 'finished') {
        // The incoming `state` may already contain settled scores (resolveTrick calls settleHand
        // and stores final scores into state.scores). Avoid calling settleHand again in that case
        // to prevent double-application of Weis/multiplier/match bonus.
        const incomingScores = (state.scores as any) || { team1: 0, team2: 0 };
        const sum = (incomingScores.team1 || 0) + (incomingScores.team2 || 0);
        const hasMultiplier =
          (state as any).trumpMultiplier !== undefined && (state as any).trumpMultiplier !== null;
        if (hasMultiplier || sum > 157) {
          // Already settled or contains multiplier -> trust provided scores
          team1Score = incomingScores.team1 || team1Score;
          team2Score = incomingScores.team2 || team2Score;
        } else {
          // Not settled yet: calculate settled totals now
          const settled = Schieber.settleHand(state as any);
          team1Score = (settled.scores as any).team1 || team1Score;
          team2Score = (settled.scores as any).team2 || team2Score;
        }
      }
    } catch (e) {
      // fallback to provided state.scores if settlement fails
    }
    const team1Players = playersList.filter((p) => p.team === 1);
    const team2Players = playersList.filter((p) => p.team === 2);

    // In Swiss Jass, each player gets their team's FULL score (not divided)
    team1Players.forEach((p) => (additions[p.name] = team1Score));
    team2Players.forEach((p) => (additions[p.name] = team2Score));
  } else if (
    playersList &&
    playersList.length &&
    playersList.every((p) => typeof (p as any).points === 'number')
  ) {
    // Fallback: if per-player points are already calculated
    playersList.forEach((p) => {
      additions[p.name] = (p as any).points || 0;
    });
  }

  // Apply additions to totals and to user records
  const newTotals = { ...currentTotals };
  const newUsers = { ...currentUsers };
  Object.keys(additions).forEach((name) => {
    const pts = additions[name] || 0;
    newTotals[name] = (newTotals[name] || 0) + pts;
    if (!newUsers[name])
      newUsers[name] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
    newUsers[name].totalPoints = (newUsers[name].totalPoints || 0) + pts;
    newUsers[name].gamesPlayed = (newUsers[name].gamesPlayed || 0) + 1;
  });
  // determine winning team and credit wins
  const t1 = (state.scores as any)?.team1 || 0;
  const t2 = (state.scores as any)?.team2 || 0;
  const winningTeam = t1 >= t2 ? 1 : 2;
  playersList
    .filter((p) => p.team === winningTeam)
    .forEach((p) => {
      const nm = p.name;
      if (!newUsers[nm]) newUsers[nm] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
      newUsers[nm].wins = (newUsers[nm].wins || 0) + 1;
    });
  // update lastSeen timestamp for all players
  const now = Date.now();
  playersList.forEach((p) => {
    const nm = p.name;
    if (!newUsers[nm]) newUsers[nm] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
    newUsers[nm].lastSeen = now;
  });
  return { newTotals, newUsers, t1, t2 };
};

export const clearLocalTotals = () => {
  localStorage.removeItem('jassTotals');
  localStorage.removeItem('jassProcessedGames');
  localStorage.removeItem('jassUsers');
};
