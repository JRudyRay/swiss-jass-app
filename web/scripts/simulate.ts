import * as Schieber from '../src/engine/schieber';

function sumScores(st: Schieber.State) {
  return (st.scores.team1 || 0) + (st.scores.team2 || 0);
}

function runOneHand() {
  let st = Schieber.startGameLocal();
  // let bots pick trump until playing (simulate naive decisions)
  while (st.phase === 'trump_selection') {
    const p = st.currentPlayer;
    if (p === 0) {
      // pick a random trump for player 0 (simulate human choosing randomly)
      const t = Schieber.chooseRandomTrump();
      st = Schieber.setTrumpAndDetectWeis(st, t as any);
    } else {
      const t = Schieber.chooseBotTrump(st, p);
      st = Schieber.setTrumpAndDetectWeis(st, t as any);
    }
  }

  // play until finished using simple bot choices
  while (st.phase !== 'finished') {
    if (st.currentPlayer !== 0) {
      const pick = Schieber.chooseBotCard(st, st.currentPlayer);
      if (!pick) break;
      st = Schieber.playCardLocal(st, st.currentPlayer, pick);
      if (st.pendingResolve) {
        st = Schieber.resolveTrick(st);
      }
    } else {
      // play first legal card for player 0
      const legal = Schieber.getLegalCardsForPlayer(st, 0);
      if (legal.length === 0) break;
      st = Schieber.playCardLocal(st, 0, legal[0].id);
      if (st.pendingResolve) st = Schieber.resolveTrick(st);
    }
  }

  return st;
}

function simulate(n = 20) {
  for (let i = 0; i < n; i++) {
    const st = runOneHand();
  const total = sumScores(st);
  // compute sum of card points from collected tricks for verification
    const basePoints: Record<string, number> = { '6':0,'7':0,'8':0,'9':0,'10':10,'U':2,'O':3,'K':4,'A':11 };
    const trumpOverride: Record<string, number> = { 'U':20,'9':14,'A':11,'10':10,'K':4,'O':3,'8':0,'7':0,'6':0 };
    let sumFromTricks = 0;
    let totalCards = 0;
    for (const p of st.players) {
      for (const c of p.tricks) {
        totalCards += 1;
        const isTrump = (st.trump && (['eicheln','schellen','rosen','schilten'].includes(st.trump))) ? c.suit === st.trump : false;
        sumFromTricks += isTrump ? trumpOverride[c.rank] : basePoints[c.rank];
      }
    }
    const diff = total - sumFromTricks;
    // Compute per-team raw totals from collected trick cards
    const teamRaw: { [k:number]: number } = { 1: 0, 2: 0 };
    for (const p of st.players) {
      for (const c of p.tricks) {
        const isTrump = (st.trump && (['eicheln','schellen','rosen','schilten'].includes(st.trump))) ? c.suit === st.trump : false;
        const pts = isTrump ? trumpOverride[c.rank] : basePoints[c.rank];
        teamRaw[p.team] += pts;
      }
    }
    // Add last-trick +5 to the team of the currentPlayer (winner of last trick)
    if (st.players.every(p => p.hand.length === 0)) {
      const winnerTeam = st.players.find(p => p.id === st.currentPlayer)!.team;
      teamRaw[winnerTeam] += 5;
    }

    // The engine already applies settlement in resolveTrick when finishing, so read settled scores from st.scores
    const settled = { team1: st.scores.team1 || 0, team2: st.scores.team2 || 0 };
  const lastTrickBonus = st.players.every(p => p.hand.length === 0) ? 5 : 0;
  const totalRaw = sumFromTricks + lastTrickBonus;
  console.log(`Hand ${i+1}: RawTeam1=${teamRaw[1]} RawTeam2=${teamRaw[2]} RawTotal=${teamRaw[1]+teamRaw[2]} Trump=${st.trump} Mult=${st.trumpMultiplier}`);
    console.log(`  Intermediate: sumFromTricks=${sumFromTricks} lastTrickBonus=${lastTrickBonus} totalRaw=${totalRaw}`);
    // Compute expected settled totals using Weis and multiplier logic (for verification)
    const weis = Schieber.calculateTeamWeis(st.players);
    const declarerId = st.declarer;
    const declarerTeam = (typeof declarerId === 'number') ? st.players.find(p => p.id === declarerId)!.team : null;
    const multiplierUsed = st.trumpMultiplier || 1;
    let expectedT1 = teamRaw[1] + (weis.team1 || 0);
    let expectedT2 = teamRaw[2] + (weis.team2 || 0);
    if (declarerTeam === 1) expectedT1 = expectedT1 * multiplierUsed;
    else if (declarerTeam === 2) expectedT2 = expectedT2 * multiplierUsed;
    // match bonus if a team captured all cards
    const team1Cards = st.players.filter(p=>p.team===1).reduce((s,p)=>s + (p.tricks?.length||0), 0);
    const team2Cards = st.players.filter(p=>p.team===2).reduce((s,p)=>s + (p.tricks?.length||0), 0);
    const matchBonus = st.matchBonus || 100;
    if (team1Cards === 36) expectedT1 += (declarerTeam === 1 ? (matchBonus * multiplierUsed) : matchBonus);
    if (team2Cards === 36) expectedT2 += (declarerTeam === 2 ? (matchBonus * multiplierUsed) : matchBonus);

    console.log(`  Expected settled: Team1=${expectedT1} Team2=${expectedT2} Total=${expectedT1+expectedT2}`);
    console.log(`  Settled (engine): Team1=${settled.team1} Team2=${settled.team2} Total=${settled.team1+settled.team2}`);
    console.log(`  Cards counted=${totalCards}, settled-minus-expected=${(settled.team1+settled.team2)-(expectedT1+expectedT2)}`);
    if (settled.team1 !== expectedT1 || settled.team2 !== expectedT2) {
      console.warn(`  Settlement mismatch between engine and expected calculation. Diff Team1=${settled.team1-expectedT1} Team2=${settled.team2-expectedT2}`);
    }
  }
}

simulate(10);
