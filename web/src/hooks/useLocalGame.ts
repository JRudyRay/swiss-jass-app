import { trickGain } from '../game/trickGain';
import { useEffect, useRef } from 'react';
import * as Schieber from '../engine/schieber';
import * as Bot from '../engine/bot';
import { trumpName } from '../components/table/SuitBadge';
import { COLLECT_MS } from '../components/table/TrickArea';
import { readSavedRounds, clearSavedRounds, writeBots } from '../components/setup/savedGame';
import { messages } from '../i18n';
import { API_URL } from '../config';
import { cueForPlay } from '../game/sound';
import { finishMatchOf, recordHandOf, startNewMatch } from '../game/stats';
import { loadLocalState, saveLocalState, toGameState } from '../game/localState';

// Local (single-player) game flow: bot loop, trick resolve/collect, trump and card play,
// resume/clear of the saved match and the stall watchdog. Moved out of JassGame.tsx unchanged;
// shared UI state and setters are passed in through `c`.
export function useLocalGame(c: any) {
  const {
    lang,
    t,
    tm,
    maxPoints,
    gameType,
    gameId,
    botNames,
    playDelayMs,
    speedScale,
    matchFinished,
    uiPendingResolve,
    isLocal,
    mode,
    socket,
    activeTableId,
    multiplayerGameId,
    chosenTrump,
    setMessage,
    setCollect,
    setGameState,
    setPlayers,
    setHand,
    setLegalCards,
    setRoundHistory,
    setShowVictory,
    setMatchFinished,
    setAnimatingSwoop,
    rollBots,
    setSavedGame,
    setMode,
    setMaxPoints,
    setOptionsVisible,
    setIsLocal,
    setChosenTrump,
    setWeisWinner,
    setUiPendingResolve,
    mapPlayersWithSeats,
    completeGame,
    sfx,
    selectTrump,
  } = c;
  const loopGenRef: { current: number } = c.loopGenRef;
  const live = useRef(c);
  live.current = c;
  const botsRef = useRef<() => Promise<void>>(async () => {});
  const progressKey = useRef('');
  const lastProgressAt = useRef<number>(Date.now());

  const schobenMsg = (st: Schieber.State) =>
    st.currentPlayer === 0
      ? t.schobenToYou
      : t.schobenTo(st.players.find((p) => p.id === st.currentPlayer)?.name || '');

  async function startSwoopAndResolve(st: Schieber.State): Promise<Schieber.State> {
    // Highlight the winning card, slide the trick to the winner, then resolve.
    const winner = Schieber.peekTrickWinner(st);
    if (winner === null) return st;
    const gen = loopGenRef.current;
    try {
      const tr = messages(lang).trick;
      setMessage(
        winner === 0 ? tr.youTake : tr.takes(st.players.find((p) => p.id === winner)?.name || ''),
      );
      setCollect({ winnerId: winner, points: trickGain(st) });
      sfx('trick');
      await new Promise((r) => setTimeout(r, COLLECT_MS * speedScale()));
      if (gen !== loopGenRef.current) return st; // game was reset or restarted meanwhile
      const newSt = Schieber.resolveTrick(st);
      saveLocalState(newSt);
      setGameState(toGameState(newSt));
      setPlayers(mapPlayersWithSeats(newSt.players));
      setHand(newSt.players.find((p) => p.id === 0)?.hand || []);
      setLegalCards(Schieber.getLegalCardsForPlayer(newSt, 0));
      // if round finished, show lastTrick for 2s then clear and award totals
      if (newSt.phase === 'finished') {
        // short pause on the empty table before the next deal
        await new Promise((r) => setTimeout(r, 900));
        if (gen !== loopGenRef.current) return newSt;
        // if maxPoints reached by either team, stop; else start a fresh local round
        const t1 = newSt.scores.team1 || 0;
        const t2 = newSt.scores.team2 || 0;
        const base = newSt.handStartScores || { team1: 0, team2: 0 };
        const handNo = (live.current.roundHistory?.length || 0) + 1;
        recordHandOf(newSt, handNo);
        if (Schieber.handSummary(newSt).match.team1 + Schieber.handSummary(newSt).match.team2 > 0)
          sfx('matsch');
        setRoundHistory((h) => [
          ...h,
          {
            round: h.length + 1,
            team1: t1 - base.team1,
            team2: t2 - base.team2,
            trump: String(newSt.trump || ''),
          },
        ]);
        if (
          newSt.matchWinner ||
          t1 >= (newSt.target || maxPoints) ||
          t2 >= (newSt.target || maxPoints)
        ) {
          // The first team to reach the target wins, even mid-hand (the engine sets matchWinner).
          setShowVictory(true);
          setMatchFinished(true);
          setGameState({ ...toGameState(newSt), phase: 'finished' });
          const won = newSt.matchWinner
            ? newSt.players.find((p) => p.id === 0)?.team === newSt.matchWinner
            : newSt.players.find((p) => p.id === 0)?.team === 1
              ? t1 > t2
              : t2 > t1;
          finishMatchOf(newSt, handNo, !!live.current.coach);
          sfx(won ? 'win' : 'lose');

          // Update backend stats if this is an online game
          if (gameId && API_URL) {
            const userTeam = newSt.players.find((p) => p.id === 0)?.team || 1; // User is player 0
            const userTeamScore = userTeam === 1 ? t1 : t2;
            const opponentTeamScore = userTeam === 1 ? t2 : t1;
            const userWon = userTeamScore > opponentTeamScore;

            // Count total rounds played (rough estimate based on score progression)
            const totalRounds = Math.floor((userTeamScore + opponentTeamScore) / 100) + 1;

            completeGame(userTeamScore, opponentTeamScore, userWon, totalRounds);
          }
        } else {
          // Score sheet: the next deal waits until the player has seen it
          setCollect(null);
          await c.showHandSummary(Schieber.handSummary(newSt));
          if (gen !== loopGenRef.current) return newSt;
          // start a new hand (fresh deal) keeping totals and rotating dealer
          const fresh = Schieber.startNewHand(newSt);
          saveLocalState(fresh);
          setPlayers(mapPlayersWithSeats(fresh.players));
          setGameState(toGameState(fresh));
          setHand(fresh.players.find((p) => p.id === 0)?.hand || []);
          setLegalCards(Schieber.getLegalCardsForPlayer(fresh, 0));
          // Callers continue their bot loop with the fresh hand, so don't start another one here.
          if (fresh.currentPlayer !== 0) {
            setMessage(
              messages(lang).game.waitingForTrump(
                fresh.players.find((p) => p.id === fresh.currentPlayer)?.name || '',
              ),
            );
          } else {
            setMessage(t.pleaseChooseTrump);
          }
          return fresh;
        }
      }
      return newSt;
    } finally {
      setCollect(null);
      setAnimatingSwoop(null);
    }
  }

  // Watchdog: if a local game has made no progress while it is a bot's turn (or a trick is
  // waiting to be resolved), restart the bot loop, which also resolves pending tricks.
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const cur = live.current;
        if (!cur.isLocal || cur.optionsVisible || cur.matchFinished) return;
        const st = loadLocalState();
        if (!st || st.phase === 'finished') return;
        const humanTurn = st.currentPlayer === 0 && !st.pendingResolve;
        const key = `${st.phase}|${st.currentPlayer}|${st.currentTrick?.length}|${!!st.pendingResolve}|${st.scores.team1}|${st.scores.team2}`;
        const now = Date.now();
        if (humanTurn || key !== progressKey.current) {
          progressKey.current = key;
          lastProgressAt.current = now;
          return;
        }
        if (now - lastProgressAt.current > 12000) {
          lastProgressAt.current = now;
          botsRef.current();
        }
      } catch {}
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // --- Local play with simple bots ---
  const startLocalGame = (names: string[] = botNames) => {
    loopGenRef.current++;
    const st = Schieber.startGameLocal(undefined, names, maxPoints);
    writeBots(names); // the same opponents for the setup page, a rematch and a resumed match
    // map engine players to our UI players
    setPlayers(mapPlayersWithSeats(st.players));
    setGameState(toGameState(st));
    setHand(st.players.find((p) => p.id === 0)?.hand || []);
    setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
    setMessage(t.localStarted);
    // store engine state in ref-like place (we'll keep in localStorage for now)
    saveLocalState(st);
  };

  // Resume the saved local match chosen on the welcome screen.
  const continueSavedGame = async () => {
    loopGenRef.current++;
    const gen = loopGenRef.current;
    setSavedGame(null);
    setMode('single');
    try {
      let st = loadLocalState();
      if (st) {
        // The match keeps its own target, whatever the setup screen says now.
        if (Number.isFinite(Number(st.target)) && Number(st.target) > 0)
          setMaxPoints(Number(st.target));
        else st.target = maxPoints; // games saved before the target lived in the state
        // A trick that was waiting for its resolve animation when the page closed
        if (st.pendingResolve) {
          st = Schieber.resolveTrick(st);
          saveLocalState(st);
        }
        // Old saves have no rounds: the table then starts empty and fills from here on.
        const rounds = readSavedRounds(st.scores);
        if (st.phase === 'finished') {
          // The hand ended before the page closed. Its round is only missing from the saved
          // rounds when they add up to the scores at the start of the hand; otherwise it was
          // already recorded (e.g. the score sheet was open) and must not be added twice.
          const base = st.handStartScores || { team1: 0, team2: 0 };
          const sum = (k: 'team1' | 'team2') => rounds.reduce((a, r) => a + r[k], 0);
          if (sum('team1') === base.team1 && sum('team2') === base.team2) {
            rounds.push({
              round: rounds.length + 1,
              team1: (st.scores.team1 || 0) - base.team1,
              team2: (st.scores.team2 || 0) - base.team2,
              trump: String(st.trump || ''),
            });
          }
        }
        setRoundHistory(rounds);
        if (st.phase === 'finished' && rounds.length > 0) recordHandOf(st, rounds.length);
        const matchOver =
          st.phase === 'finished' &&
          (!!st.matchWinner || Math.max(st.scores.team1 || 0, st.scores.team2 || 0) >= st.target);
        const show = (s: Schieber.State) => {
          setPlayers(mapPlayersWithSeats(s.players));
          setGameState(toGameState(s));
          setHand(s.players.find((p: any) => p.id === 0)?.hand || []);
          setLegalCards(Schieber.getLegalCardsForPlayer(s, 0));
        };
        show(st);
        setOptionsVisible(false);
        setIsLocal(true);
        if (matchOver) {
          // The saved match was already decided: show the result again instead of dropping it.
          setMatchFinished(true);
          setShowVictory(true);
          finishMatchOf(st, rounds.length, !!live.current.coach);
          return;
        }
        if (st.phase === 'finished') {
          // The score sheet comes back before the next deal, as it was when the page closed.
          setMessage(t.roundFinished);
          await c.showHandSummary(Schieber.handSummary(st));
          if (gen !== loopGenRef.current) return;
          st = Schieber.startNewHand(st);
          saveLocalState(st);
          show(st);
        }
        setMessage(t.resumed);
        // bots don't wait for a click, so restart their loop if it's their turn
        if (st.currentPlayer !== 0) setTimeout(() => botsTakeTurns(), 300);
        return;
      }
    } catch (e) {
      console.warn('Could not resume the saved match', e);
    }

    // Damaged save: fall back to a fresh match setup.
    setOptionsVisible(true);
    clearSavedGame();
  };

  const clearSavedGame = () => {
    try {
      localStorage.removeItem('jassLocalState');
    } catch {}
    clearSavedRounds();
    setSavedGame(null);
    rollBots(); // a new match from the setup brings new opponents
  };

  const startLocalGameWithOptions = () => {
    // persist chosen options for local session
    try {
      localStorage.setItem('jassLocalOptions', JSON.stringify({ gameType, maxPoints }));
    } catch {}
    // A match still offered for Continue is replaced by a new one with new opponents; a rematch
    // (nothing offered) keeps the bots, team names and target.
    const names = live.current.savedGame ? rollBots() : botNames;
    // if a previous match finished, starting a new local game clears it
    setMatchFinished(false);
    setRoundHistory([]);
    clearSavedRounds();
    setSavedGame(null);
    setIsLocal(true);
    startNewMatch();
    startLocalGame(names);
    // let bots take over (they will auto-select trump if needed)
    setTimeout(() => {
      botsTakeTurns();
    }, 200);
    setOptionsVisible(false);
  };

  const botsTakeTurns = async () => {
    // A newer loop (or a reset/restart) supersedes this one: every await below re-checks `gen`.
    const gen = ++loopGenRef.current;
    const stale = () => gen !== loopGenRef.current;
    let st = loadLocalState();
    if (!st) return;
    // A completed trick that was never resolved (tab closed, loop superseded): finish it first.
    if (st.pendingResolve && st.phase !== 'finished') {
      setUiPendingResolve(true);
      try {
        st = await startSwoopAndResolve(st);
      } finally {
        setUiPendingResolve(false);
      }
      if (stale()) return;
    }
    while (st.phase !== 'finished') {
      // if trump selection phase, let bots choose only when it's their turn
      if (st.phase === 'trump_selection') {
        if (st.currentPlayer === 0) {
          // player's turn to pick trump — update UI and wait for human
          setGameState(toGameState(st));
          setMessage(t.pleaseChooseTrump);
          break;
        }
        // let engine pick a smart trump for bots
        const chooser = st.players.find((p) => p.id === st.currentPlayer);
        const chosen = Bot.chooseTrump(st, st.currentPlayer);
        const newState = Schieber.setTrumpAndDetectWeis(st, chosen);
        st = newState;
        if (chosen === 'schieben') {
          setMessage(schobenMsg(newState));
        } else {
          setChosenTrump(chosen);
          setWeisWinner(
            Schieber.bestWeis(st.players, st.trump as Schieber.TrumpContract, st.forehand),
          );
          setMessage(t.botChose(chooser?.name || 'Bot', trumpName(chosen, lang)));
        }
        saveLocalState(newState);
        setGameState(toGameState(st));
        // update UI players and hand
        setPlayers(mapPlayersWithSeats(st.players));
        setHand(st.players.find((p) => p.id === 0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
        await new Promise((r) => setTimeout(r, playDelayMs * speedScale()));
        if (stale()) return;
        continue;
      } // if it's a bot's turn (0 is our south player), let bots play automatically
      if (st.currentPlayer !== 0) {
        const id = st.currentPlayer;
        const pick = Bot.chooseCard(st, id);
        if (!pick) break;
        const before = st;
        const first = (before.players.find((p) => p.id === id)?.hand.length || 0) === 9;
        st = Schieber.playCardLocal(st, id, pick);
        sfx('card');
        const cue = cueForPlay(before as any, st as any, id, first);
        if (cue) sfx(cue);
        saveLocalState(st);
        setGameState(toGameState(st));
        setPlayers(mapPlayersWithSeats(st.players));
        // refresh human's hand and legal cards
        setHand(st.players.find((p) => p.id === 0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
        // if trick completed and pendingResolve flagged, pause so UI shows last card, then resolve
        if (st.pendingResolve) {
          setUiPendingResolve(true);
          try {
            // compute animation positions and perform swoop then resolve and retrieve resulting state
            st = await startSwoopAndResolve(st);
          } finally {
            setUiPendingResolve(false);
          }
          if (stale()) return;
          continue;
        }
        await new Promise((r) => setTimeout(r, playDelayMs * speedScale()));
        if (stale()) return;
        continue;
      }

      // if it's our turn (0), wait for player action — return to let UI handle double-click plays
      if (st.currentPlayer === 0) {
        // update UI to reflect it's player's turn
        setGameState(toGameState(st));
        setHand(st.players.find((p) => p.id === 0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
        if (st.phase === 'playing' && !st.pendingResolve) sfx('turn');
        break;
      }
    }

    if (st.phase !== 'finished') return;
    setMessage(t.roundFinished);
  };

  botsRef.current = botsTakeTurns;

  const submitTrump = (override?: string) => {
    const choice = override ?? chosenTrump;
    // If local, write trump into local state and advance to playing
    if (isLocal) {
      const st = loadLocalState();
      if (!st) return;
      if (!choice) return setMessage(t.chooseTrumpFirst);

      // Schieben: the engine hands the choice to the partner, who must then choose.
      if (choice === 'schieben') {
        const passed = Schieber.setTrumpAndDetectWeis(st, 'schieben');
        setMessage(schobenMsg(passed));
        saveLocalState(passed);
        setGameState(toGameState(passed));
        setChosenTrump(null);
        setTimeout(() => botsTakeTurns(), 200);
        return;
      }
      setChosenTrump(choice);

      // The engine applies the contract (declarer, multiplier, Weis, Stöck, forehand leads). It
      // only does so during trump selection, so the state must not be touched before.
      const updatedSt = Schieber.setTrumpAndDetectWeis(st, choice as any);
      if (updatedSt.phase !== 'playing') return;

      // Determine Weis winner (authentic Swiss Jass competition)
      const weisWinnerResult = Schieber.bestWeis(
        updatedSt.players,
        updatedSt.trump as Schieber.TrumpContract,
        updatedSt.forehand,
      );
      setWeisWinner(weisWinnerResult);

      saveLocalState(updatedSt);
      setPlayers(mapPlayersWithSeats(updatedSt.players));
      setGameState(toGameState(updatedSt));

      // Weis stay unannounced until each player's first card.
      setMessage(`${messages(lang).scoreBar.trump}: ${trumpName(choice, lang)}`);
      // start bots playing
      setTimeout(() => botsTakeTurns(), 200);
      return;
    }

    // If server-backed multiplayer game, emit via socket
    if (!choice) return setMessage(t.chooseTrumpFirst);
    if (mode === 'multi' && socket && activeTableId && multiplayerGameId) {
      socket.emit('game:selectTrump', {
        tableId: activeTableId,
        gameId: multiplayerGameId,
        trump: choice,
      });
      setMessage(tm.trumpSubmitted(trumpName(choice, lang)));
      return;
    }
    // Fallback to HTTP API legacy flow
    selectTrump(choice);
  };

  const playLocalCard = async (cardId: string) => {
    // prevent playing while UI is resolving a trick or when match finished
    if (matchFinished) return setMessage(t.matchFinished);
    // prevent playing while UI is resolving a trick
    if (uiPendingResolve) return;
    const st = loadLocalState();
    if (!st) return;
    if (st.phase !== 'playing') return setMessage(t.notPlaying);
    if (st.currentPlayer !== 0) return setMessage(t.notYourTurn);
    const legal = Schieber.getLegalCardsForPlayer(st, 0).map((c) => c.id);
    if (!legal.includes(cardId)) return setMessage(t.illegalCard);
    const gen = loopGenRef.current;
    const first = (st.players.find((p) => p.id === 0)?.hand.length || 0) === 9;
    const newSt = Schieber.playCardLocal(st, 0, cardId);
    sfx('card');
    const cue = cueForPlay(st as any, newSt as any, 0, first);
    if (cue) sfx(cue);
    // if this play completes a trick, the engine will set pendingResolve
    if (newSt.pendingResolve) {
      setUiPendingResolve(true);
      try {
        // save immediate state so UI shows the just-played card
        saveLocalState(newSt);
        setGameState(toGameState(newSt));
        setPlayers(mapPlayersWithSeats(newSt.players));
        setHand(newSt.players.find((p) => p.id === 0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(newSt, 0));
        // perform swoop animation then resolve and retrieve resulting state
        const resolved = await startSwoopAndResolve(newSt);
        if (gen !== loopGenRef.current) return;
        // update newSt to the resolved state so later logic uses correct state
        // (resolved may be same object)
        // ensure we persist resolved state
        saveLocalState(resolved);
        // refresh UI with resolved state so trick counters update
        setPlayers(mapPlayersWithSeats(resolved.players));
        setGameState(toGameState(resolved));
        setHand(resolved.players.find((p) => p.id === 0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(resolved, 0));
      } finally {
        setUiPendingResolve(false);
      }
      // after resolution, let bots continue
      setTimeout(() => botsTakeTurns(), 80);
      return;
    }
    // normal play: persist and update UI, then let bots act
    saveLocalState(newSt);
    setPlayers(mapPlayersWithSeats(newSt.players));
    setGameState(toGameState(newSt));
    setHand(newSt.players.find((p) => p.id === 0)?.hand || []);
    setLegalCards(Schieber.getLegalCardsForPlayer(newSt, 0));
    // let bots respond
    setTimeout(() => botsTakeTurns(), 200);
  };

  return {
    startLocalGame,
    continueSavedGame,
    clearSavedGame,
    startLocalGameWithOptions,
    botsTakeTurns,
    submitTrump,
    playLocalCard,
  };
}
