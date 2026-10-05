import * as Schieber from '../src/engine/schieber';

// Plays random hands with the bots and checks the engine's settlement against
// an independent calculation. Exits non-zero on any mismatch or illegal play.

const SUITS = ['eicheln', 'schellen', 'rosen', 'schilten'];
const BASE: Record<string, number> = { '6': 0, '7': 0, '8': 0, '9': 0, '10': 10, 'U': 2, 'O': 3, 'K': 4, 'A': 11 };
const TRUMP: Record<string, number> = { ...BASE, 'U': 20, '9': 14 };
const OBEN: Record<string, number> = { ...BASE, '8': 8 };
const UNDEN: Record<string, number> = { ...BASE, '8': 8, '6': 11, 'A': 0 };

function points(card: { suit: string; rank: string }, trump: string) {
  if (trump === 'oben-abe') return OBEN[card.rank];
  if (trump === 'unden-ufe') return UNDEN[card.rank];
  return card.suit === trump ? TRUMP[card.rank] : BASE[card.rank];
}

let failures = 0;
function fail(msg: string) { failures++; console.error('  FAIL:', msg); }

function runOneHand() {
  let st = Schieber.startGameLocal();
  const dealt = JSON.parse(JSON.stringify(st.players)) as Schieber.Player[];
  while (st.phase === 'trump_selection') {
    const p = st.currentPlayer;
    const t = p === 0 ? Schieber.chooseRandomTrump() : Schieber.chooseBotTrump(st, p);
    st = Schieber.setTrumpAndDetectWeis(st, t as any);
  }
  const forehand = st.forehand;
  if (st.currentPlayer !== forehand) fail(`play should start with the forehand ${forehand}, got ${st.currentPlayer}`);
  const withWeis = JSON.parse(JSON.stringify(st.players)) as Schieber.Player[];
  let lastWinner = -1;
  while (st.phase !== 'finished') {
    const p = st.currentPlayer;
    const legal = Schieber.getLegalCardsForPlayer(st, p);
    const pick = p === 0 ? legal[0]?.id : Schieber.chooseBotCard(st, p);
    if (!pick) { fail(`player ${p} has no card to play`); break; }
    if (!legal.some(c => c.id === pick)) fail(`player ${p} played illegal card ${pick}`);
    st = Schieber.playCardLocal(st, p, pick);
    if (st.pendingResolve) {
      lastWinner = Schieber.peekTrickWinner(st)!;
      st = Schieber.resolveTrick(st);
    }
  }
  return { st, dealt, withWeis, forehand, lastWinner };
}

function simulate(n: number) {
  for (let i = 0; i < n; i++) {
    const { st, dealt, withWeis, forehand, lastWinner } = runOneHand();
    const trump = st.trump as string;
    const raw: Record<number, number> = { 1: 0, 2: 0 };
    const cards: Record<number, number> = { 1: 0, 2: 0 };
    for (const p of st.players) for (const c of p.tricks) { raw[p.team] += points(c, trump); cards[p.team]++; }
    const lastTeam = st.players.find(p => p.id === lastWinner)!.team;
    raw[lastTeam] += 5;
    if (raw[1] + raw[2] !== 157) fail(`hand total should be 157, got ${raw[1] + raw[2]}`);

    // Stöck: trump King and Ober dealt to the same player
    if (SUITS.includes(trump)) {
      for (const p of dealt) {
        const has = (r: string) => p.hand.some(c => c.suit === trump && c.rank === r);
        if (has('K') && has('O')) raw[p.team] += 20;
      }
    }
    const weis = Schieber.calculateTeamWeis(withWeis, trump as any, forehand);
    const m = st.trumpMultiplier || 1;
    const expected = { team1: (raw[1] + weis.team1) * m, team2: (raw[2] + weis.team2) * m };
    if (cards[1] === 36) expected.team1 += 100 * m;
    if (cards[2] === 36) expected.team2 += 100 * m;

    const ok = st.scores.team1 === expected.team1 && st.scores.team2 === expected.team2;
    console.log(`Hand ${i + 1}: trump=${trump} ×${m} engine=${st.scores.team1}/${st.scores.team2} expected=${expected.team1}/${expected.team2}${ok ? '' : '  MISMATCH'}`);
    if (!ok) fail('settlement mismatch');
  }
  console.log(failures === 0 ? `${n} hands simulated, all consistent` : `${failures} simulation failure(s)`);
  if (failures) process.exitCode = 1;
}

simulate(40);
