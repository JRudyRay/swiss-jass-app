import * as Schieber from '../engine/schieber';

export function updateTotalsFromGameStateForTests(state: any, playersList: any[], maybeGameId?: string | null) {
  try {
    // Prevent double-processing the same finished game (by id)
    if (maybeGameId) {
      try {
        const processedRawCheck = localStorage.getItem('jassProcessedGames');
        const processedCheck: string[] = processedRawCheck ? JSON.parse(processedRawCheck) : [];
        if (processedCheck.includes(maybeGameId)) return { newTotals: null, newUsers: null };
      } catch (e) { /* ignore parse errors */ }
    }

    const currentTotalsRaw = localStorage.getItem('jassTotals');
    const currentTotals: Record<string, number> = currentTotalsRaw ? JSON.parse(currentTotalsRaw) : {};
    const currentUsersRaw = localStorage.getItem('jassUsers');
    const currentUsers: Record<string, any> = currentUsersRaw ? JSON.parse(currentUsersRaw) : {};

    const additions: Record<string, number> = {};

    if (state.scores && (state.scores as any).team1 !== undefined) {
      let team1Score = (state.scores as any).team1 || 0;
      let team2Score = (state.scores as any).team2 || 0;
      try {
        if (state.phase === 'finished') {
          const incomingScores = (state.scores as any) || { team1: 0, team2: 0 };
          const sum = (incomingScores.team1 || 0) + (incomingScores.team2 || 0);
          const hasMultiplier = (state as any).trumpMultiplier !== undefined && (state as any).trumpMultiplier !== null;
          if (hasMultiplier || sum > 157) {
            team1Score = incomingScores.team1 || team1Score;
            team2Score = incomingScores.team2 || team2Score;
          } else {
            const settled = Schieber.settleHand(state as any);
            team1Score = (settled.scores as any).team1 || team1Score;
            team2Score = (settled.scores as any).team2 || team2Score;
          }
        }
      } catch (e) {
        // fallback
      }
      const team1Players = playersList.filter(p => p.team === 1);
      const team2Players = playersList.filter(p => p.team === 2);
      team1Players.forEach((p:any) => additions[p.name] = team1Score);
      team2Players.forEach((p:any) => additions[p.name] = team2Score);
    } else if (playersList && playersList.length && playersList.every(p => typeof (p as any).points === 'number')) {
      playersList.forEach(p => { additions[p.name] = (p as any).points || 0; });
    }

    const newTotals = { ...currentTotals };
    const newUsers = { ...currentUsers };
    Object.keys(additions).forEach(name => {
      const pts = additions[name] || 0;
      newTotals[name] = (newTotals[name] || 0) + pts;
      if (!newUsers[name]) newUsers[name] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
      newUsers[name].totalPoints = (newUsers[name].totalPoints || 0) + pts;
      newUsers[name].gamesPlayed = (newUsers[name].gamesPlayed || 0) + 1;
    });

    const t1 = (state.scores as any)?.team1 || 0;
    const t2 = (state.scores as any)?.team2 || 0;
    const winningTeam = t1 >= t2 ? 1 : 2;
    playersList.filter(p => p.team === winningTeam).forEach(p => {
      const nm = p.name;
      if (!newUsers[nm]) newUsers[nm] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
      newUsers[nm].wins = (newUsers[nm].wins || 0) + 1;
    });

    const now = Date.now();
    playersList.forEach(p => {
      const nm = p.name;
      if (!newUsers[nm]) newUsers[nm] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
      newUsers[nm].lastSeen = now;
    });

    localStorage.setItem('jassTotals', JSON.stringify(newTotals));
    localStorage.setItem('jassUsers', JSON.stringify(newUsers));

    if (maybeGameId) {
      const processedRaw = localStorage.getItem('jassProcessedGames');
      const processed: string[] = processedRaw ? JSON.parse(processedRaw) : [];
      processed.push(maybeGameId);
      localStorage.setItem('jassProcessedGames', JSON.stringify(processed));
    }

    return { newTotals, newUsers };
  } catch (err) {
    // propagate
    throw err;
  }
}

export default { updateTotalsFromGameStateForTests };
