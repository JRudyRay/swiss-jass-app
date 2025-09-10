// src/engine/schieber.ts
var suits = ["eicheln", "schellen", "rosen", "schilten"];
var ranks = ["6", "7", "8", "9", "10", "U", "O", "K", "A"];
var trumpOrder = ["U", "9", "A", "10", "K", "O", "8", "7", "6"];
var normalOrder = ["A", "10", "K", "O", "U", "9", "8", "7", "6"];
function rankOrderIndex(rank, contract, isTrumpCard) {
  if (contract === "unden-ufe") {
    const undenOrder = ["6", "7", "8", "9", "U", "O", "K", "10", "A"];
    return undenOrder.indexOf(rank);
  }
  if (contract === "oben-abe") {
    return normalOrder.indexOf(rank);
  }
  if (isTrumpCard) return trumpOrder.indexOf(rank);
  return normalOrder.indexOf(rank);
}
function makeId(suit, rank) {
  return `${suit}_${rank}_${Math.random().toString(36).slice(2, 9)}`;
}
function createDeck() {
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push({ id: makeId(s, r), suit: s, rank: r });
  return deck;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function deal() {
  const deck = createDeck();
  shuffle(deck);
  const names = ["You", "Anna (bot)", "Reto (bot)", "Fritz (bot)"];
  const players = [0, 1, 2, 3].map((i) => ({ id: i, name: names[i] || `Player ${i + 1}`, team: i % 2 === 0 ? 1 : 2, hand: [], tricks: [], points: 0, weis: [] }));
  for (let i = 0; i < 9; i++) {
    for (let p = 0; p < 4; p++) {
      const card = deck.pop();
      players[p].hand.push(card);
    }
  }
  return players;
}
function startGameLocal(previousDealer) {
  const players = deal();
  const dealer = previousDealer !== void 0 ? (previousDealer + 1) % 4 : 0;
  const trumpSelector = (dealer + 1) % 4;
  const st = {
    phase: "trump_selection",
    trump: null,
    currentPlayer: trumpSelector,
    dealer,
    currentTrick: [],
    trickLead: null,
    players,
    scores: { team1: 0, team2: 0 }
  };
  return st;
}
function getLegalCardsForPlayer(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return [];
  if (state.currentTrick.length === 0) return player.hand.slice();
  const leadSuit = state.trickLead;
  const trumpContract = state.trump;
  const currentBestIdx = state.currentTrick.length > 0 ? winnerOfTrick(state.currentTrick, trumpContract, leadSuit) : 0;
  const currentBestCard = state.currentTrick[currentBestIdx];
  const sameSuit = player.hand.filter((c) => c.suit === leadSuit);
  if (sameSuit.length > 0) {
    const beating = sameSuit.filter((c) => compareCards(c, currentBestCard, trumpContract, leadSuit) < 0);
    return beating.length > 0 ? beating : sameSuit;
  }
  const suitTrump = trumpContract && suits.includes(trumpContract) ? trumpContract : null;
  if (suitTrump) {
    const trumpCards = player.hand.filter((c) => c.suit === suitTrump);
    if (trumpCards.length > 0) {
      const beatingTrumps = trumpCards.filter((c) => compareCards(c, currentBestCard, trumpContract, leadSuit) < 0);
      return beatingTrumps.length > 0 ? beatingTrumps : trumpCards;
    }
  }
  return player.hand.slice();
}
function compareCards(a, b, trumpContract, leadSuit) {
  const suitTrump = trumpContract && suits.includes(trumpContract) ? trumpContract : null;
  const aIsTrump = suitTrump ? a.suit === suitTrump : false;
  const bIsTrump = suitTrump ? b.suit === suitTrump : false;
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;
  return rankOrderIndex(a.rank, trumpContract, aIsTrump) - rankOrderIndex(b.rank, trumpContract, bIsTrump);
}
function winnerOfTrick(cards, trump, leadSuit) {
  let winnerIndex = 0;
  for (let i = 1; i < cards.length; i++) {
    const cmp = compareCards(cards[i], cards[winnerIndex], trump, leadSuit);
    if (cmp < 0) {
    }
  }
  let bestIdx = 0;
  let best = cards[0];
  for (let i = 1; i < cards.length; i++) {
    const a = cards[i];
    const b = best;
    const aTrump = trump ? a.suit === trump : false;
    const bTrump = trump ? b.suit === trump : false;
    if (aTrump && !bTrump) {
      best = a;
      bestIdx = i;
      continue;
    }
    if (!aTrump && bTrump) continue;
    if (leadSuit) {
      const aLead = a.suit === leadSuit;
      const bLead = b.suit === leadSuit;
      if (aLead && !bLead) {
        best = a;
        bestIdx = i;
        continue;
      }
      if (!aLead && bLead) continue;
    }
    const ai = rankOrderIndex(a.rank, trump, aTrump);
    const bi = rankOrderIndex(b.rank, trump, bTrump);
    if (ai < bi) {
      best = a;
      bestIdx = i;
    }
  }
  return bestIdx;
}
function rankToNumber(rank) {
  const rankOrder = ["6", "7", "8", "9", "10", "U", "O", "K", "A"];
  return rankOrder.indexOf(rank);
}
function calculateTeamWeis(players) {
  const team1Players = players.filter((p) => p.team === 1);
  const team2Players = players.filter((p) => p.team === 2);
  let team1BestWeis = null;
  let team2BestWeis = null;
  const details = {};
  for (const player of team1Players) {
    details[player.id] = player.weis || [];
    for (const weis of player.weis || []) {
      if (!team1BestWeis || isWeisBetter(weis, team1BestWeis)) {
        team1BestWeis = weis;
      }
    }
  }
  for (const player of team2Players) {
    details[player.id] = player.weis || [];
    for (const weis of player.weis || []) {
      if (!team2BestWeis || isWeisBetter(weis, team2BestWeis)) {
        team2BestWeis = weis;
      }
    }
  }
  let team1Points = 0;
  let team2Points = 0;
  if (team1BestWeis && team2BestWeis) {
    if (isWeisBetter(team1BestWeis, team2BestWeis)) {
      team1Points = team1Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
    } else if (isWeisBetter(team2BestWeis, team1BestWeis)) {
      team2Points = team2Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
    }
  } else if (team1BestWeis) {
    team1Points = team1Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
  } else if (team2BestWeis) {
    team2Points = team2Players.reduce((sum, p) => sum + (p.weis?.reduce((s, w) => s + w.points, 0) || 0), 0);
  }
  return { team1: team1Points, team2: team2Points, details };
}
function isWeisBetter(a, b) {
  if (a.points !== b.points) return a.points > b.points;
  if (a.type.startsWith("sequence") && b.type.startsWith("sequence")) {
    if (a.cards.length !== b.cards.length) return a.cards.length > b.cards.length;
    const aTop = Math.max(...a.cards.map((c) => rankToNumber(c.rank)));
    const bTop = Math.max(...b.cards.map((c) => rankToNumber(c.rank)));
    return aTop > bTop;
  }
  return false;
}

// scripts/unit_tests.ts
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function testRankOrder() {
  const r1 = rankOrderIndex("A", "oben-abe", false);
  const r2 = rankOrderIndex("6", "oben-abe", false);
  assert(r1 < r2, "Oben-abe: A should rank higher than 6");
  const u1 = rankOrderIndex("6", "unden-ufe", false);
  const u2 = rankOrderIndex("A", "unden-ufe", false);
  assert(u1 < u2, "Unden-ufe: 6 should rank higher than A");
}
function testCompareCardsTrump() {
  const a = { id: "a", suit: "eicheln", rank: "U" };
  const b = { id: "b", suit: "eicheln", rank: "9" };
  const cmp = compareCards(a, b, "eicheln", "eicheln");
  assert(cmp < 0, "U should be stronger than 9 in trump (lower index returned)");
  const c = { id: "c", suit: "rosen", rank: "A" };
  const cmp2 = compareCards(a, c, "eicheln", "rosen");
  assert(cmp2 > 0, "trump should be ranked higher than non-trump (compareCards returns >0 for trump)");
}
function testWeisCompare() {
  const seq3 = { type: "sequence3", cards: [{ rank: "6" }, { rank: "7" }, { rank: "8" }], points: 20 };
  const seq4 = { type: "sequence4", cards: [{ rank: "6" }, { rank: "7" }, { rank: "8" }, { rank: "9" }], points: 50 };
  const better = isWeisBetter(seq4, seq3);
  assert(better === true, "sequence4 should be better than sequence3");
}
function testObenUndenOrdering() {
  const ai = rankOrderIndex("A", "oben-abe", false);
  const sixi = rankOrderIndex("6", "oben-abe", false);
  assert(ai < sixi, "Oben-abe: Ace should be higher than 6");
  const u6 = rankOrderIndex("6", "unden-ufe", false);
  const uA = rankOrderIndex("A", "unden-ufe", false);
  assert(u6 < uA, "Unden-ufe: 6 should be higher than A");
}
function testWeisTieNoScore() {
  const st = startGameLocal();
  st.players[0].weis = [{ type: "sequence3", cards: [], points: 20, description: "seq3" }];
  st.players[1].weis = [{ type: "sequence3", cards: [], points: 20, description: "seq3" }];
  const res = calculateTeamWeis(st.players);
  assert(res.team1 === 0 && res.team2 === 0, "Tie Weis should award nobody points");
}
function testLegalPlayEnforcement() {
  const st = startGameLocal();
  st.players[0].hand = [{ id: "x1", suit: "eicheln", rank: "A" }, { id: "x2", suit: "rosen", rank: "K" }];
  st.trickLead = "eicheln";
  st.currentTrick = [{ id: "t1", suit: "eicheln", rank: "9", playerId: 1 }];
  const legal = getLegalCardsForPlayer(st, 0);
  assert(legal.length === 1 && legal[0].suit === "eicheln", "Player must follow suit when lead suit present");
}
function runAll() {
  const tests = [testRankOrder, testCompareCardsTrump, testWeisCompare, testLegalPlayEnforcement];
  tests.push(testObenUndenOrdering, testWeisTieNoScore);
  let passed = 0;
  for (const t of tests) {
    try {
      t();
      console.log("PASS:", t.name);
      passed++;
    } catch (e) {
      console.error("FAIL:", t.name, e.message || e);
    }
  }
  console.log(`${passed}/${tests.length} tests passed`);
}
runAll();
//# sourceMappingURL=unit_tests.bundle.cjs.map
