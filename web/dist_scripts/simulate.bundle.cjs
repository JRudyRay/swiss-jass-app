// src/engine/schieber.ts
var suits = ["eicheln", "schellen", "rosen", "schilten"];
var ranks = ["6", "7", "8", "9", "10", "U", "O", "K", "A"];
var basePoints = {
  "6": 0,
  "7": 0,
  "8": 0,
  "9": 0,
  "10": 10,
  "U": 2,
  "O": 3,
  "K": 4,
  "A": 11
};
var trumpOverride = {
  "U": 20,
  "9": 14,
  "A": 11,
  "10": 10,
  "K": 4,
  "O": 3,
  "8": 0,
  "7": 0,
  "6": 0
};
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
function chooseRandomTrump() {
  return suits[Math.floor(Math.random() * suits.length)];
}
function chooseBotTrump(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return chooseRandomTrump();
  const hand = player.hand;
  const suitCounts = {
    "eicheln": 0,
    "schellen": 0,
    "rosen": 0,
    "schilten": 0
  };
  const suitStrength = {
    "eicheln": 0,
    "schellen": 0,
    "rosen": 0,
    "schilten": 0
  };
  hand.forEach((card) => {
    suitCounts[card.suit]++;
    switch (card.rank) {
      case "A":
        suitStrength[card.suit] += 4;
        break;
      case "K":
        suitStrength[card.suit] += 3;
        break;
      case "O":
        suitStrength[card.suit] += 3;
        break;
      case "U":
        suitStrength[card.suit] += 5;
        break;
      // Jack is strong in trump
      case "10":
        suitStrength[card.suit] += 2;
        break;
      case "9":
        suitStrength[card.suit] += 1;
        break;
    }
  });
  let bestSuit = "eicheln";
  let bestScore = 0;
  Object.keys(suitCounts).forEach((suit) => {
    const score = suitCounts[suit] * 2 + suitStrength[suit];
    if (score > bestScore) {
      bestScore = score;
      bestSuit = suit;
    }
  });
  const totalHighCards = hand.filter((c) => ["A", "K", "O"].includes(c.rank)).length;
  const random = Math.random();
  if (totalHighCards >= 5 && random < 0.1) {
    return "oben-abe";
  }
  const totalLowCards = hand.filter((c) => ["6", "7", "8"].includes(c.rank)).length;
  if (totalLowCards >= 5 && random < 0.05) {
    return "unden-ufe";
  }
  const handStrength = Object.values(suitStrength).reduce((a, b) => a + b, 0) + totalHighCards * 2 - totalLowCards;
  const trumpCount = ["eicheln", "schellen", "rosen", "schilten"].reduce((s, su) => s + player.hand.filter((c) => c.suit === su).length, 0);
  let passProb = 0.2;
  if (trumpCount >= 4 || bestScore >= 10) passProb = 0.05;
  if (totalLowCards >= 6) passProb = 0.35;
  if (handStrength < 6 && Math.random() < passProb) {
    return "schieben";
  }
  return bestSuit;
}
function setTrumpAndDetectWeis(state, trump) {
  const st = JSON.parse(JSON.stringify(state));
  if (trump === "schieben") return st;
  st.trump = trump;
  if (trump === "schellen" || trump === "schilten") {
    st.trumpMultiplier = 2;
  } else if (trump === "oben-abe") {
    st.trumpMultiplier = 3;
  } else if (trump === "unden-ufe") {
    st.trumpMultiplier = 4;
  } else {
    st.trumpMultiplier = 1;
  }
  st.weis = {};
  for (const player of st.players) {
    const trumpSuit = trump === "oben-abe" || trump === "unden-ufe" ? null : trump;
    player.weis = detectWeis(player.hand, trumpSuit);
    st.weis[player.id] = player.weis;
  }
  st.phase = "playing";
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
function playCardLocal(state, playerId, cardId) {
  const st = JSON.parse(JSON.stringify(state));
  const player = st.players.find((p) => p.id === playerId);
  const idx = player.hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return st;
  const card = player.hand.splice(idx, 1)[0];
  if (st.currentTrick.length === 0) st.trickLead = card.suit;
  st.currentTrick.push({ ...card, playerId });
  if (st.currentTrick.length === 4) {
    st.pendingResolve = true;
    st.phase = "resolving";
  } else {
    st.currentPlayer = (st.currentPlayer + 1) % 4;
  }
  if (st.players.every((p) => p.hand.length === 0)) {
    st.phase = "finished";
    const team1Players = st.players.filter((p) => p.team === 1);
    const team2Players = st.players.filter((p) => p.team === 2);
    const team1Score = st.scores.team1;
    const team2Score = st.scores.team2;
    team1Players.forEach((p) => p.points = team1Score);
    team2Players.forEach((p) => p.points = team2Score);
  } else {
    st.phase = "playing";
  }
  return st;
}
function rankToNumber(rank) {
  const rankOrder = ["6", "7", "8", "9", "10", "U", "O", "K", "A"];
  return rankOrder.indexOf(rank);
}
function detectWeis(hand, trump) {
  const weis = [];
  const bySuit = {};
  for (const card of hand) {
    if (!bySuit[card.suit]) bySuit[card.suit] = [];
    bySuit[card.suit].push(card);
  }
  for (const suit in bySuit) {
    bySuit[suit].sort((a, b) => rankToNumber(a.rank) - rankToNumber(b.rank));
  }
  for (const suit in bySuit) {
    const cards = bySuit[suit];
    if (cards.length >= 3) {
      const sequences = findSequences(cards);
      for (const seq of sequences) {
        if (seq.length >= 5) {
          weis.push({
            type: "sequence5plus",
            cards: seq,
            points: 100,
            description: `Sequenz ${seq.length} (${seq[0].rank}-${seq[seq.length - 1].rank} ${suit})`
          });
        } else if (seq.length === 4) {
          weis.push({
            type: "sequence4",
            cards: seq,
            points: 50,
            description: `Sequenz 4 (${seq[0].rank}-${seq[seq.length - 1].rank} ${suit})`
          });
        } else if (seq.length === 3) {
          weis.push({
            type: "sequence3",
            cards: seq,
            points: 20,
            description: `Sequenz 3 (${seq[0].rank}-${seq[seq.length - 1].rank} ${suit})`
          });
        }
      }
    }
  }
  const byRank = {};
  for (const card of hand) {
    if (!byRank[card.rank]) byRank[card.rank] = [];
    byRank[card.rank].push(card);
  }
  for (const rank in byRank) {
    if (byRank[rank].length === 4) {
      if (rank === "U") {
        weis.push({
          type: "four_jacks",
          cards: byRank[rank],
          points: 200,
          description: "Vier Buben"
        });
      } else if (rank === "9") {
        weis.push({
          type: "four_nines",
          cards: byRank[rank],
          points: 150,
          description: "Vier Neuner"
        });
      } else if (rank === "A") {
        weis.push({
          type: "four_aces",
          cards: byRank[rank],
          points: 100,
          description: "Vier Asse"
        });
      } else if (rank === "K") {
        weis.push({
          type: "four_kings",
          cards: byRank[rank],
          points: 100,
          description: "Vier K\xF6nige"
        });
      } else if (rank === "O") {
        weis.push({
          type: "four_queens",
          cards: byRank[rank],
          points: 100,
          description: "Vier Damen"
        });
      } else if (rank === "10") {
        weis.push({
          type: "four_tens",
          cards: byRank[rank],
          points: 100,
          description: "Vier Zehner"
        });
      }
    }
  }
  if (trump && byRank["K"] && byRank["O"]) {
    const trumpKing = byRank["K"].find((c) => c.suit === trump);
    const trumpQueen = byRank["O"].find((c) => c.suit === trump);
    if (trumpKing && trumpQueen) {
      weis.push({
        type: "stoeck",
        cards: [trumpKing, trumpQueen],
        points: 20,
        description: `St\xF6ck (${trump})`
      });
    }
  }
  return weis;
}
function findSequences(sortedCards) {
  const sequences = [];
  let currentSeq = [sortedCards[0]];
  for (let i = 1; i < sortedCards.length; i++) {
    const prev = rankToNumber(sortedCards[i - 1].rank);
    const curr = rankToNumber(sortedCards[i].rank);
    if (curr === prev + 1) {
      currentSeq.push(sortedCards[i]);
    } else {
      if (currentSeq.length >= 3) {
        sequences.push(currentSeq);
      }
      currentSeq = [sortedCards[i]];
    }
  }
  if (currentSeq.length >= 3) {
    sequences.push(currentSeq);
  }
  return sequences;
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
function resolveTrick(state) {
  const st = JSON.parse(JSON.stringify(state));
  if (!st.pendingResolve) return st;
  if (!st.currentTrick || st.currentTrick.length !== 4) {
    st.pendingResolve = false;
    return st;
  }
  const lead = st.trickLead;
  const winnerIdx = winnerOfTrick(st.currentTrick, st.trump || void 0, lead);
  const winnerCard = st.currentTrick[winnerIdx];
  const winnerPlayer = winnerCard.playerId;
  const wonCards = st.currentTrick.slice();
  st.lastTrick = wonCards.slice();
  st.players.find((p) => p.id === winnerPlayer).tricks.push(...wonCards.map((c) => ({ id: c.id, suit: c.suit, rank: c.rank })));
  let trickPoints = 0;
  for (const c of wonCards) {
    const isTrump = st.trump && c.suit === st.trump;
    trickPoints += isTrump ? trumpOverride[c.rank] : basePoints[c.rank];
  }
  const isLastTrick = st.players.every((p) => p.hand.length === 0);
  if (isLastTrick) {
    trickPoints += 5;
  }
  const winnerTeam = st.players.find((p) => p.id === winnerPlayer).team;
  if (winnerTeam === 1) st.scores.team1 += trickPoints;
  else st.scores.team2 += trickPoints;
  st.currentTrick = [];
  st.trickLead = null;
  st.currentPlayer = winnerPlayer;
  st.pendingResolve = false;
  if (st.players.every((p) => p.hand.length === 0)) {
    const settled = settleHand(st);
    st.scores = settled.scores;
    st.trumpMultiplier = settled.trumpMultiplier;
    st.matchBonus = settled.matchBonus;
    st.phase = "finished";
    const team1Players = st.players.filter((p) => p.team === 1);
    const team2Players = st.players.filter((p) => p.team === 2);
    const team1Score = st.scores.team1;
    const team2Score = st.scores.team2;
    team1Players.forEach((p) => p.points = team1Score);
    team2Players.forEach((p) => p.points = team2Score);
  } else {
    st.phase = "playing";
  }
  return st;
}
function settleHand(state) {
  const st = JSON.parse(JSON.stringify(state));
  const multiplier = st.trumpMultiplier || 1;
  const weisScore = calculateTeamWeis(st.players);
  const rawTeam1 = st.scores.team1 || 0;
  const rawTeam2 = st.scores.team2 || 0;
  let t1 = rawTeam1 + (weisScore.team1 || 0);
  let t2 = rawTeam2 + (weisScore.team2 || 0);
  t1 = t1 * multiplier;
  t2 = t2 * multiplier;
  try {
    const team1Cards = st.players.filter((p) => p.team === 1).reduce((s, p) => s + (p.tricks?.length || 0), 0);
    const team2Cards = st.players.filter((p) => p.team === 2).reduce((s, p) => s + (p.tricks?.length || 0), 0);
    const matchBonus = st.matchBonus || 100;
    if (team1Cards === 36) {
      t1 += matchBonus * multiplier;
    } else if (team2Cards === 36) {
      t2 += matchBonus * multiplier;
    }
  } catch (e) {
  }
  st.scores.team1 = t1;
  st.scores.team2 = t2;
  return st;
}
function chooseBotCard(state, botId) {
  const legal = getLegalCardsForPlayer(state, botId);
  if (legal.length === 0) return null;
  const bot = state.players.find((p) => p.id === botId);
  const trumpSuit = state.trump;
  const trick = state.currentTrick;
  const isFirstCard = trick.length === 0;
  const isLastCard = trick.length === 3;
  const leadSuit = state.trickLead;
  if (isFirstCard) {
    const trumpCards = legal.filter((c) => c.suit === trumpSuit);
    if (trumpCards.length > 0) {
      const strongTrump = trumpCards.filter((c) => ["O", "K", "A"].includes(c.rank));
      if (strongTrump.length > 0) {
        return strongTrump[Math.floor(Math.random() * strongTrump.length)].id;
      }
      if (trumpCards.some((c) => c.rank === "U") && trumpCards.length <= 2) {
        return trumpCards.find((c) => c.rank === "U").id;
      }
    }
    const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
    if (nonTrump.length > 0) {
      const highCards = nonTrump.filter((c) => ["A", "K", "O"].includes(c.rank));
      if (highCards.length > 0) {
        return highCards[Math.floor(Math.random() * highCards.length)].id;
      }
    }
  }
  if (isLastCard) {
    const canWin = canBotWinTrick(legal, trick, trumpSuit, leadSuit);
    if (canWin.length > 0) {
      const best = canWin.slice().sort((x, y) => {
        const vx = x.suit === trumpSuit ? trumpOverride[x.rank] : basePoints[x.rank];
        const vy = y.suit === trumpSuit ? trumpOverride[y.rank] : basePoints[y.rank];
        if (vx !== vy) return vx - vy;
        return compareCardValue(x, y, trumpSuit, leadSuit);
      })[0];
      return best.id;
    } else {
      const lowest = legal.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0];
      return lowest.id;
    }
  }
  const partner = state.players.find((p) => p.team === bot.team && p.id !== bot.id);
  const currentWinner = getCurrentTrickWinner(trick, trumpSuit, leadSuit);
  const isPartnerWinning = partner && currentWinner?.playerId === partner.id;
  if (isPartnerWinning) {
    const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
    if (nonTrump.length > 0) return nonTrump.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0].id;
    const lowest = legal.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0];
    return lowest.id;
  } else {
    const canWin = canBotWinTrick(legal, trick, trumpSuit, leadSuit);
    if (canWin.length > 0) {
      const nonUBest = canWin.filter((c) => c.rank !== "U");
      if (nonUBest.length > 0) return nonUBest.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0].id;
      return canWin.sort((a, b) => compareCardValue(a, b, trumpSuit, leadSuit))[0].id;
    }
  }
  const pick = legal[Math.floor(Math.random() * legal.length)];
  return pick.id;
}
function canBotWinTrick(legal, trick, trumpContract, leadSuit) {
  if (trick.length === 0) return legal;
  let currentBest = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (isCardBetter(trick[i], currentBest, trumpContract, leadSuit)) {
      currentBest = trick[i];
    }
  }
  return legal.filter((card) => isCardBetter(card, currentBest, trumpContract, leadSuit));
}
function getCurrentTrickWinner(trick, trumpContract, leadSuit) {
  if (trick.length === 0) return null;
  let winner = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (isCardBetter(trick[i], winner, trumpContract, leadSuit)) {
      winner = trick[i];
    }
  }
  return winner;
}
function compareCardValue(a, b, trumpContract, leadSuit) {
  const suitTrump = trumpContract && suits.includes(trumpContract) ? trumpContract : null;
  const aIsTrump = suitTrump ? a.suit === suitTrump : false;
  const bIsTrump = suitTrump ? b.suit === suitTrump : false;
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;
  if (aIsTrump && bIsTrump) {
    const trumpOrder2 = ["6", "7", "8", "O", "K", "10", "A", "9", "U"];
    return trumpOrder2.indexOf(a.rank) - trumpOrder2.indexOf(b.rank);
  }
  const normalOrder2 = ["6", "7", "8", "9", "10", "U", "O", "K", "A"];
  return normalOrder2.indexOf(a.rank) - normalOrder2.indexOf(b.rank);
}
function isCardBetter(a, b, trumpContract, leadSuit) {
  const suitTrump = trumpContract && suits.includes(trumpContract) ? trumpContract : null;
  const aIsTrump = suitTrump ? a.suit === suitTrump : false;
  const bIsTrump = suitTrump ? b.suit === suitTrump : false;
  if (aIsTrump && !bIsTrump) return true;
  if (!aIsTrump && bIsTrump) return false;
  if (aIsTrump && bIsTrump) {
    const trumpOrder2 = ["6", "7", "8", "O", "K", "10", "A", "9", "U"];
    return trumpOrder2.indexOf(a.rank) > trumpOrder2.indexOf(b.rank);
  }
  const aFollows = a.suit === leadSuit;
  const bFollows = b.suit === leadSuit;
  if (aFollows && !bFollows) return true;
  if (!aFollows && bFollows) return false;
  const normalOrder2 = ["6", "7", "8", "9", "10", "U", "O", "K", "A"];
  return normalOrder2.indexOf(a.rank) > normalOrder2.indexOf(b.rank);
}

// scripts/simulate.ts
function sumScores(st) {
  return (st.scores.team1 || 0) + (st.scores.team2 || 0);
}
function runOneHand() {
  let st = startGameLocal();
  while (st.phase === "trump_selection") {
    const p = st.currentPlayer;
    if (p === 0) {
      const t = chooseRandomTrump();
      st = setTrumpAndDetectWeis(st, t);
    } else {
      const t = chooseBotTrump(st, p);
      st = setTrumpAndDetectWeis(st, t);
    }
  }
  while (st.phase !== "finished") {
    if (st.currentPlayer !== 0) {
      const pick = chooseBotCard(st, st.currentPlayer);
      if (!pick) break;
      st = playCardLocal(st, st.currentPlayer, pick);
      if (st.pendingResolve) {
        st = resolveTrick(st);
      }
    } else {
      const legal = getLegalCardsForPlayer(st, 0);
      if (legal.length === 0) break;
      st = playCardLocal(st, 0, legal[0].id);
      if (st.pendingResolve) st = resolveTrick(st);
    }
  }
  return st;
}
function simulate(n = 20) {
  for (let i = 0; i < n; i++) {
    const st = runOneHand();
    const total = sumScores(st);
    const basePoints2 = { "6": 0, "7": 0, "8": 0, "9": 0, "10": 10, "U": 2, "O": 3, "K": 4, "A": 11 };
    const trumpOverride2 = { "U": 20, "9": 14, "A": 11, "10": 10, "K": 4, "O": 3, "8": 0, "7": 0, "6": 0 };
    let sumFromTricks = 0;
    let totalCards = 0;
    for (const p of st.players) {
      for (const c of p.tricks) {
        totalCards += 1;
        const isTrump = st.trump && ["eicheln", "schellen", "rosen", "schilten"].includes(st.trump) ? c.suit === st.trump : false;
        sumFromTricks += isTrump ? trumpOverride2[c.rank] : basePoints2[c.rank];
      }
    }
    const diff = total - sumFromTricks;
    const teamRaw = { 1: 0, 2: 0 };
    for (const p of st.players) {
      for (const c of p.tricks) {
        const isTrump = st.trump && ["eicheln", "schellen", "rosen", "schilten"].includes(st.trump) ? c.suit === st.trump : false;
        const pts = isTrump ? trumpOverride2[c.rank] : basePoints2[c.rank];
        teamRaw[p.team] += pts;
      }
    }
    if (st.players.every((p) => p.hand.length === 0)) {
      const winnerTeam = st.players.find((p) => p.id === st.currentPlayer).team;
      teamRaw[winnerTeam] += 5;
    }
    const settled = { team1: st.scores.team1 || 0, team2: st.scores.team2 || 0 };
    console.log(`Hand ${i + 1}: RawTeam1=${teamRaw[1]} RawTeam2=${teamRaw[2]} RawTotal=${teamRaw[1] + teamRaw[2]} Trump=${st.trump} Mult=${st.trumpMultiplier}`);
    console.log(`  Settled: Team1=${settled.team1} Team2=${settled.team2} Total=${settled.team1 + settled.team2}`);
    console.log(`  Cards counted=${totalCards}, sumFromTricks=${sumFromTricks}, settled-minus-cards=${settled.team1 + settled.team2 - sumFromTricks}`);
    if (total !== 157) {
      console.warn("Total points mismatch (expected 157)");
    }
  }
}
simulate(10);
//# sourceMappingURL=simulate.bundle.cjs.map
