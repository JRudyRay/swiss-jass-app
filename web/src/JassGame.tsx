import React, { useEffect, useState, useRef } from 'react';
import CardCredits from './components/CardCredits';
import ScoreBar, { TEAM_COLORS } from './components/table/ScoreBar';
import { trumpName } from './components/table/SuitBadge';
import PlayerSeat from './components/table/PlayerSeat';
import * as Schieber from './engine/schieber';
import InfoPanels from './components/table/InfoPanels';
import WeisPanel from './components/table/WeisPanel';
import TrickArea from './components/table/TrickArea';
import LastTrick from './components/table/LastTrick';
import SettingsSheet from './components/table/SettingsSheet';
import RulesSheet from './components/table/RulesSheet';
import ResumeCard from './components/setup/ResumeCard';
import {
  readSavedGame,
  writeSavedRounds,
  clearSavedRounds,
  type SavedGameSummary,
} from './components/setup/savedGame';
import { useSettings } from './components/table/useSettings';
import { useLastTrick } from './components/table/useLastTrick';
import Hand from './components/table/Hand';
import TrumpChooser from './components/table/TrumpChooser';
import { API_URL, ONLINE_ENABLED } from './config';
import { io, Socket } from 'socket.io-client';
import { WelcomeCard, MultiInfoCard } from './components/setup/WelcomeCard';
import MatchSetup from './components/setup/MatchSetup';
import VictoryModal from './components/VictoryModal';
import Toast from './components/Toast';
import { messages, type Lang } from './i18n';
import { authFetch } from './authFetch';
import { useLocalGame } from './hooks/useLocalGame';
import { sortHandForDisplay } from './game/handSort';
import { computeTotalsUpdate, clearLocalTotals } from './game/localTotals';
import {
  loadLocalState,
  saveLocalState,
  toGameState,
  type GameState,
  type Player,
} from './game/localState';
export const JassGame: React.FC<{ user?: any; onLogout?: () => void; lang: Lang }> = ({
  user,
  onLogout,
  lang,
}) => {
  // Add CSS animations for victory modal
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes bounceIn {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const t = messages(lang).game;
  const tm = messages(lang).mp;
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hand, setHand] = useState<any[]>([]);
  const [legalCards, setLegalCards] = useState<any[]>([]);
  const [orientedTrick, setOrientedTrick] = useState<any[]>([]); // cards positioned by perspective
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [message, setMessage] = useState(t.welcome);
  const [isLoading, setIsLoading] = useState(false);
  const [usersList, setUsersList] = useState<
    Array<{
      id: string;
      username: string;
      totalPoints: number;
      totalWins?: number;
      totalGames?: number;
    }>
  >([]);
  const [totals, setTotals] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('jassTotals');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  // richer local user store: name -> { totalPoints, gamesPlayed, wins, lastSeen, passwordHash }
  const [jassUsers, setJassUsers] = useState<Record<string, any>>(() => {
    try {
      return JSON.parse(localStorage.getItem('jassUsers') || '{}');
    } catch {
      return {};
    }
  });
  const [gameType, setGameType] = useState<string>('schieber');
  // Restore the last chosen target so a resumed match ends where it was meant to.
  const [maxPoints, setMaxPoints] = useState<number>(() => {
    try {
      const n = Number(JSON.parse(localStorage.getItem('jassLocalOptions') || '{}').maxPoints);
      return n >= 100 ? n : 1000;
    } catch {
      return 1000;
    }
  });
  // The bots for the next local match, shown on the setup screen.
  const [botNames, setBotNames] = useState<string[]>(() => Schieber.pickBotNames());
  const [isLocal, setIsLocal] = useState<boolean>(false);
  const [chosenTrump, setChosenTrump] = useState<string | null>(null);
  const [playDelayMs, setPlayDelayMs] = useState<number>(450);
  const [animatingSwoop, setAnimatingSwoop] = useState<{
    winnerId: number | null;
    cards: any[];
  } | null>(null);
  const [uiPendingResolve, setUiPendingResolve] = useState(false);
  const [teamNames, setTeamNames] = useState<{ 1: string; 2: string }>(() => ({
    1: 'Team 1',
    2: 'Team 2',
  }));
  const [optionsVisible, setOptionsVisible] = useState(true);
  const [setupChoice, setSetupChoice] = useState<'welcome' | 'single' | 'multi'>(
    ONLINE_ENABLED ? 'welcome' : 'single',
  );

  // simplify optional checks used in JSX
  const isAnimating = Boolean(animatingSwoop);
  // Set while the finished trick is shown and collected by its winner.
  const [collect, setCollect] = useState<{ winnerId: number } | null>(null);
  const [matchFinished, setMatchFinished] = useState<boolean>(false);
  const [currentUserName, setCurrentUserName] = useState<string>(user?.username || 'You');

  // multiplayer state
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [savedGame, setSavedGame] = useState<SavedGameSummary | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [tables, setTables] = useState<any[]>([]);
  const [friendsTabData, setFriendsTabData] = useState<{ friends: any[]; requests: any[] }>({
    friends: [],
    requests: [],
  });
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  // New UX components state
  const [showVictory, setShowVictory] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'default' | 'success' | 'error' | 'warning';
  } | null>(null);

  // Toast helper function
  const showToast = (
    message: string,
    type: 'default' | 'success' | 'error' | 'warning' = 'default',
  ) => {
    setToast({ message, type });
    setMessage(message); // Also update old message display for now
  };

  // Ref to avoid stale closure inside initial socket effect
  const activeTableIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeTableIdRef.current = activeTableId;
  }, [activeTableId]);
  // Persist last active table
  useEffect(() => {
    try {
      if (activeTableId) localStorage.setItem('lastActiveTableId', activeTableId);
    } catch {}
  }, [activeTableId]);
  // Restore last active table on mount (before socket join effect)
  useEffect(() => {
    try {
      const prev = localStorage.getItem('lastActiveTableId');
      if (ONLINE_ENABLED && prev && !activeTableId) {
        setMode('multi');
        setActiveTableId(prev);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [multiGameState, setMultiGameState] = useState<any | null>(null);
  // multiplayer table-based game identifiers
  const [multiplayerGameId, setMultiplayerGameId] = useState<string | null>(null);
  const [dealerUserId, setDealerUserId] = useState<string | null>(null);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const mySeatRef = useRef<number | null>(null);
  useEffect(() => {
    mySeatRef.current = mySeat;
  }, [mySeat]);
  const authToken = useRef<string | null>(null);
  const startTableEarly = async (id: string) => {
    if (!authToken.current) return;
    try {
      const res = await fetch(`${API_URL}/api/tables/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken.current}` },
      });
      const data = await res.json();
      if (data.success) {
        setActiveTableId(id);
        setMessage(tm.gameStarting);
      }
      fetchTables();
    } catch {}
  };

  const [roundStarter, setRoundStarter] = useState(0);
  const [roundHistory, setRoundHistory] = useState<
    Array<{ round: number; team1: number; team2: number; trump: string }>
  >([]);
  // Keep the results table across reloads (restored by Continue). Empty lists are cleared explicitly.
  useEffect(() => {
    writeSavedRounds(roundHistory);
  }, [roundHistory]);
  const [weisWinner, setWeisWinner] = useState<{ playerId: number; teamId: number } | null>(null);
  const [weisCompetition, setWeisCompetition] = useState<{
    active: boolean;
    currentPlayer: number;
    bestWeis: any;
    declarations: any[];
  }>({
    active: false,
    currentPlayer: 0,
    bestWeis: null,
    declarations: [],
  });
  const { settings, update: updateSettings, buzz, scale: speedScale } = useSettings();
  const lastTrick = useLastTrick(
    gameState?.currentTrick,
    collect,
    !gameState || gameState.phase === 'trump_selection',
  );
  // helper: map engine player id to a seat around the table
  const seatForId = (id: number) => {
    const seats = ['south', 'west', 'north', 'east'];
    return seats[id] || 'south';
  };
  const positionForPlayerId = (id: number) => {
    const oriented = players.find((p) => p.id === id);
    if (oriented?.position) return oriented.position;
    if (mySeat != null) {
      const rel = (id - mySeat + 4) % 4;
      return rel === 0 ? 'south' : rel === 1 ? 'east' : rel === 2 ? 'north' : 'west';
    }
    return seatForId(id);
  };
  const mapPlayersWithSeats = (pls: any[]) =>
    (pls || []).map((p) => {
      // Normalize tricks array: engine-local uses p.tricks (array of cards).
      // Server may not include p.tricks; try to infer from gameState.playedTricks or stored local state.
      let tricksArr = (p as any).tricks || [];

      // If no tricks on player object, try to recover from current gameState (server payload)
      if ((!tricksArr || tricksArr.length === 0) && (gameState as any)?.playedTricks) {
        try {
          const played = (gameState as any).playedTricks as any[];
          if (Array.isArray(played)) {
            // Flatten and pick cards belonging to this player id
            const flat = played.flatMap((x) => (Array.isArray(x) ? x : []));
            tricksArr = flat
              .filter((c) => c.playerId === p.id)
              .map((c) => ({ id: c.id, suit: c.suit, rank: c.rank }));
          }
        } catch (e) {
          // ignore
        }
      }

      // As a last resort, try localStorage jassLocalState (for local play persisted state)
      if (!tricksArr || tricksArr.length === 0) {
        try {
          const raw = localStorage.getItem('jassLocalState');
          if (raw) {
            const ls = JSON.parse(raw) as any;
            if (ls.players && Array.isArray(ls.players)) {
              const lp = ls.players.find((pp: any) => pp.id === p.id);
              if (lp && lp.tricks && lp.tricks.length) tricksArr = lp.tricks;
            }
          }
        } catch (e) {}
      }

      return {
        id: p.id,
        name: p.name,
        hand: p.hand,
        team: p.team,
        teamName: teamNames[p.team] || `Team ${p.team}`,
        position: seatForId(p.id),
        points: (p as any).points,
        tricks: tricksArr || [],
        weis: (p as any).weis || [],
      };
    });

  const seatPlayer = (pos: string) => players.find((p) => p.position === pos);

  // Compact tricks count for inline display
  function getTricksCount(p: any) {
    return Math.floor((p?.tricks?.length || 0) / 4);
  }

  // Explain why a card is not playable for UI tooltips
  function notPlayableReason(card: any): string | null {
    try {
      // If no game or no trick in progress, no reason
      if (!gameState) return null;
      const trick = gameState.currentTrick || [];
      if (!trick || trick.length === 0) return null;
      const leadSuit = trick[0].suit;
      const handCards = hand || [];
      const hasLeadSuit = handCards.some((h: any) => h.suit === leadSuit);
      const contract = gameState.trumpSuit as any;
      const suitTrump =
        contract && ['eicheln', 'schellen', 'rosen', 'schilten'].includes(contract)
          ? contract
          : null;
      // Trump may always be played, except to undertrump; otherwise follow suit.
      if (suitTrump && card.suit === suitTrump && leadSuit !== suitTrump) return t.noUndertrump;
      if (hasLeadSuit && card.suit !== leadSuit) return t.mustFollowSuit;
      return t.notLegalNow;
    } catch (e) {
      return null;
    }
  }

  // Name plate for a seat; it lights up while that player collects the trick.
  const renderSeat = (pos: string, narrow = false) => {
    const p = players.find((x) => x.position === pos);
    if (!p) return null;
    const active = gameState?.phase === 'playing' || gameState?.phase === 'trump_selection';
    return (
      <PlayerSeat
        lang={lang}
        name={p.name.replace(/\s*\(bot\)$/i, '')}
        team={p.team}
        cardsLeft={p.hand?.length ?? 0}
        tricks={getTricksCount(p)}
        isDealer={gameState?.dealer === p.id}
        isTurn={active && gameState?.currentPlayer === p.id}
        taking={collect?.winnerId === p.id}
        thinking={active && gameState?.currentPlayer === p.id && pos !== 'south'}
        seat={pos}
        narrow={narrow}
      />
    );
  };

  useEffect(() => {
    if (gameId) loadGameState(gameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // On component mount, try to restore any running game.
  // If none is running, show the game options/start UI so user can begin a new match.
  useEffect(() => {
    // If a server-backed game is active, reload it
    if (gameId && !isLocal) {
      loadGameState(gameId);
      setOptionsVisible(false);
      return;
    }

    // A saved, unfinished local match is offered on the welcome screen (Continue / New game).
    const saved = readSavedGame(maxPoints);
    if (saved) setSavedGame(saved);

    // No active game: show options to start a new one and clear transient UI state
    setOptionsVisible(true);
    setGameState(null);
    setPlayers([]);
    setHand([]);
    setLegalCards([]);
    setChosenTrump(null);
    setUiPendingResolve(false);
    setMessage(t.noActiveGame);
  }, []); // Run only on mount

  useEffect(() => {
    if (mode === 'single' && optionsVisible) {
      setMessage(t.singleModeHint);
    } else if (mode === 'multi' && optionsVisible) {
      setMessage(t.multiModeHint);
    }
  }, [lang, mode, optionsVisible]);

  // Load users/totals from server for Rankings and Settings
  useEffect(() => {
    if (!ONLINE_ENABLED) return;
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/api/admin/users`);
        const data = await res.json();
        if (data?.success) setUsersList(data.users || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Update totals when gameState reaches finished (and avoid double-counting)
  useEffect(() => {
    if (!gameState) return;
    // Local matches update totals once, at the end of botsTakeTurns.
    if (isLocal) return;
    if (gameState.phase === 'finished' || gameState.phase === 'scoring') {
      // processed games tracked by id
      const processedRaw = localStorage.getItem('jassProcessedGames');
      const processed: string[] = processedRaw ? JSON.parse(processedRaw) : [];
      if (gameId && processed.includes(gameId)) return; // already processed

      updateTotalsFromGameState(gameState, players, gameId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // show trump indicator always during round
  const currentTrump = gameState?.trumpSuit || chosenTrump;

  // Complete game and update user stats on backend
  const completeGame = async (
    userTeamScore: number,
    opponentTeamScore: number,
    userWon: boolean,
    totalRounds: number,
  ) => {
    if (!gameId || !API_URL) return; // Only for backend games

    try {
      // App stores the JWT under `jassToken`
      const token = localStorage.getItem('jassToken');
      const res = await fetch(`${API_URL}/api/games/${gameId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userTeamScore,
          opponentTeamScore,
          userWon,
          totalRounds,
        }),
      });

      const data = await res.json();
      if (data?.success) {
        console.log(`Game completed: ${data.message}`);
        if (data.pointsEarned > 0) {
          setMessage(`${data.message} (+${data.pointsEarned} points)`);
        }
        // Refresh server user list so Rankings reflects updated totals
        try {
          const r2 = await authFetch(`${API_URL}/api/admin/users`);
          const d2 = await r2.json();
          if (d2?.success) setUsersList(d2.users || []);
        } catch (e) {
          /* ignore */
        }
      }
    } catch (err) {
      console.error('Failed to complete game:', err);
    }
  };

  // Reset game to initial welcome screen state
  const resetToWelcome = () => {
    // Clear all game state
    setGameState(null);
    setPlayers([]);
    setHand([]);
    setLegalCards([]);
    setSelectedCard(null);
    setChosenTrump(null);
    setUiPendingResolve(false);
    setMatchFinished(false);
    setShowVictory(false);
    setRoundHistory([]);
    clearSavedRounds();
    setOrientedTrick([]);
    setAnimatingSwoop(null);
    setCollect(null);

    // Clear multiplayer state
    setMultiGameState(null);
    setMultiplayerGameId(null);
    setActiveTableId(null);
    setMySeat(null);
    setDealerUserId(null);

    // Reset to welcome screen
    setOptionsVisible(true);
    setSetupChoice(ONLINE_ENABLED ? 'welcome' : 'single');
    setIsLocal(false);

    // Clear localStorage (and the Continue card that mirrors it)
    try {
      localStorage.removeItem('jassLocalState');
    } catch {}
    setSavedGame(null);

    setMessage(t.welcome);
  };

  const loadGameState = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/games/${id}`);
      const data = await res.json();
      if (data?.success) {
        setGameState(data.state || null);
        setPlayers(data.players || []);
        setHand(data.hand || []);
        setLegalCards(data.legalCards || []);
        // If the state indicates finished, attempt to update totals immediately
        if (data.state?.phase === 'finished' || data.state?.phase === 'scoring') {
          const processedRaw = localStorage.getItem('jassProcessedGames');
          const processed: string[] = processedRaw ? JSON.parse(processedRaw) : [];
          if (id && !processed.includes(id))
            updateTotalsFromGameState(data.state, data.players || [], id);
        }
      }
    } catch (err) {
      setMessage(tm.loadError);
    }
  };

  // Persist and update per-player totals stored in localStorage
  const updateTotalsFromGameState = (
    state: GameState,
    playersList: Player[],
    maybeGameId?: string | null,
  ) => {
    try {
      const upd = computeTotalsUpdate(state, playersList, maybeGameId);
      if (!upd) return;
      const { newTotals, newUsers, t1, t2 } = upd;
      setMessage(`${messages(lang).game.finalScore}: ${t1} : ${t2}`);

      localStorage.setItem('jassTotals', JSON.stringify(newTotals));
      localStorage.setItem('jassUsers', JSON.stringify(newUsers));
      setTotals(newTotals);
      setJassUsers(newUsers);

      // If there are no server-side users loaded (usersList empty), expose local totals
      // as a lightweight usersList so the Rankings tab shows local players immediately.
      try {
        if (!usersList || usersList.length === 0) {
          const merged = Object.entries(newTotals).map(([name, pts]) => ({
            id: `local-${name}`,
            username: name,
            totalPoints: pts,
          }));
          setUsersList(merged);
        }
      } catch (e) {
        /* ignore */
      }

      // Best-effort: try to sync totals to backend if available and refresh server-side users list
      if (ONLINE_ENABLED)
        (async () => {
          try {
            const token = localStorage.getItem('jassToken');
            // First, try the admin totals sync (adds points to matching usernames)
            const res = await fetch(`${API_URL}/api/admin/totals/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ totals: newTotals }),
            });
            const j = await res.json();
            if (j?.success) {
              // Refresh server user totals for Rankings
              try {
                const r2 = await authFetch(`${API_URL}/api/admin/users`);
                const u = await r2.json();
                if (u?.success) setUsersList(u.users || []);
              } catch (e) {
                /* ignore */
              }
            }

            // If logged-in, try to report the match per-team for TrueSkill updates
            try {
              const token = localStorage.getItem('jassToken');
              if (token && playersList && playersList.length > 0 && state.scores) {
                // Attempt to map local player names to server userId from usersList
                const mapNameToId: Record<string, string> = {};
                (usersList || []).forEach((u: any) => {
                  mapNameToId[u.username] = u.id;
                });
                // Also map a generic 'You' placeholder to the logged-in user (if present)
                const loggedIn = (usersList || []).find((u) => u.username === currentUserName);
                if (loggedIn) {
                  mapNameToId['You'] = loggedIn.id;
                }
                // Debug mapping
                console.log('Mapping player names to IDs', {
                  playersList: playersList.map((p) => p.name),
                  mapNameToId,
                });
                const teamAIds = playersList
                  .filter((p) => p.team === 1)
                  .map((p) => mapNameToId[p.name])
                  .filter(Boolean);
                const teamBIds = playersList
                  .filter((p) => p.team === 2)
                  .map((p) => mapNameToId[p.name])
                  .filter(Boolean);
                if (teamAIds.length > 0 && teamBIds.length > 0) {
                  await fetch(`${API_URL}/api/games/report`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      teamA: teamAIds,
                      teamB: teamBIds,
                      scoreA: (state.scores as any).team1,
                      scoreB: (state.scores as any).team2,
                      rounds: 0,
                    }),
                  });
                  // refresh server users after rating change
                  const r3 = await authFetch(`${API_URL}/api/admin/users`);
                  const u3 = await r3.json();
                  if (u3?.success) setUsersList(u3.users || []);
                } else {
                  console.warn(
                    'Skipping /games/report due to unmapped players; attempting single-user fallback',
                    { teamAIds, teamBIds },
                  );
                  try {
                    const youWon =
                      ((state.scores as any)?.team1 || 0) >= ((state.scores as any)?.team2 || 0);
                    await fetch(`${API_URL}/api/games/user-result`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ won: youWon, points: youWon ? 3 : 0, rounds: 0 }),
                    });
                    const after = await authFetch(`${API_URL}/api/admin/users`);
                    const afterJson = await after.json();
                    if (afterJson?.success) setUsersList(afterJson.users || []);
                  } catch (fe) {
                    /* ignore */
                  }
                }
              }
            } catch (e) {
              // non-blocking
            }
          } catch (e) {
            // ignore network errors — backend may not implement this endpoint yet
            console.warn('Totals sync failed', e);
          }
        })();

      if (maybeGameId) {
        const processedRaw = localStorage.getItem('jassProcessedGames');
        const processed: string[] = processedRaw ? JSON.parse(processedRaw) : [];
        processed.push(maybeGameId);
        localStorage.setItem('jassProcessedGames', JSON.stringify(processed));
      }
    } catch (err) {
      console.error('Failed updating totals', err);
    }
  };

  const {
    clearSavedGame,
    continueSavedGame,
    startLocalGameWithOptions,
    botsTakeTurns,
    submitTrump,
    playLocalCard,
  } = useLocalGame({
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
    setBotNames,
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
    updateTotalsFromGameState,
    selectTrump: (trump: string) => selectTrump(trump),
  });

  const selectTrump = async (trump: string) => {
    if (!gameId && !isLocal) return;
    setIsLoading(true);
    try {
      if (!API_URL || isLocal) {
        // apply locally
        const st = loadLocalState();
        if (!st) return;
        st.trump = trump as any;
        st.phase = 'playing';
        saveLocalState(st);
        setGameState(toGameState(st));
        setMessage(tm.trumpSelected(trumpName(trump, lang)));
        setTimeout(() => botsTakeTurns(), 200);
        return;
      }
      const res = await fetch(`${API_URL}/api/games/${gameId}/trump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trump, playerId: 0 }),
      });
      const data = await res.json();
      if (data?.success) {
        setGameState(data.state || null);
        setPlayers(data.players || []);
        setHand(data.hand || []);
        // If backend provided weis, determine winner for UI display
        try {
          const weisObj = data.state && data.state.weis ? data.state.weis : null;
          if (weisObj) {
            const withWeis = (data.players || []).map((p: any) => ({
              id: p.id,
              team: p.team,
              weis: weisObj[p.id] || [],
            }));
            const ww = Schieber.bestWeis(withWeis, null, null);
            setWeisWinner(ww);
          }
        } catch (e) {}
        setMessage(tm.trumpSelected(trumpName(trump, lang)));
      } else setMessage(data?.message || tm.trumpFailed);
    } catch (err) {
      setMessage(tm.trumpError);
    } finally {
      setIsLoading(false);
    }
  };

  const playCard = async (cardId: string) => {
    // local or single-player
    if (!API_URL || isLocal) {
      playLocalCard(cardId);
      return;
    }
    // Multiplayer via socket
    if (mode === 'multi' && socket && activeTableId && multiplayerGameId) {
      if (mySeat === null || gameState?.currentPlayer !== mySeat) {
        setMessage(t.notYourTurn);
        return;
      }
      socket.emit('game:playCard', {
        tableId: activeTableId,
        gameId: multiplayerGameId,
        playerId: mySeat,
        cardId,
      });
      setSelectedCard(null);
      return;
    }
    if (!gameId || !gameState) return;
    if (gameState.currentPlayer !== 0) {
      setMessage(t.notYourTurn);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/games/${gameId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 0, cardId }),
      });
      const data = await res.json();
      if (data?.success) {
        setGameState(data.state || null);
        setPlayers(data.players || []);
        setHand(data.hand || []);
        setLegalCards(data.legalCards || []);
        setSelectedCard(null);
        setMessage(tm.cardPlayed);
        // If server returned that round finished, update totals
        if (data.state?.phase === 'finished' || data.state?.phase === 'scoring') {
          const processedRaw = localStorage.getItem('jassProcessedGames');
          const processed: string[] = processedRaw ? JSON.parse(processedRaw) : [];
          if (gameId && !processed.includes(gameId))
            updateTotalsFromGameState(data.state, data.players || [], gameId);
        }
      } else setMessage(data?.message || tm.invalidPlay);
    } catch (err) {
      setMessage(tm.playError);
    } finally {
      setIsLoading(false);
    }
  };

  const resetTotals = () => {
    clearLocalTotals();
    setTotals({});
    setJassUsers({});
    setUsersList([]);
  };

  // multiplayer handlers
  useEffect(() => {
    try {
      authToken.current = localStorage.getItem('jassToken');
    } catch {}
    if (mode === 'multi' && !socket) {
      const s = io(API_URL || 'http://localhost:3000', { auth: { token: authToken.current } });
      setSocket(s);
      s.on('connect', () => {});
      s.on('presence:count', (p: any) => setOnlineCount(p.online));
      s.on('tables:updated', () => fetchTables());

      // CRITICAL FIX: Handle table:starting for ALL players (including non-room members)
      s.on('table:starting', (payload: any) => {
        console.debug('[multiplayer] table:starting received', payload);
        // If this is the table we're in, set gameId
        if (payload?.tableId === activeTableIdRef.current) {
          setMode('multi');
          if (payload?.gameId) {
            setMultiplayerGameId(payload.gameId);
          }
          setMessage(tm.gameStarting);
          // Ensure we're in the socket room
          s.emit('table:join', { tableId: payload.tableId });
        }
      });

      s.on('game:dealerAssigned', (data: any) => {
        setMultiplayerGameId(data.gameId);
        setDealerUserId(data.dealerUserId);
        setMessage(`Dealer assigned: ${data.dealerUserId}`);
      });

      s.on('table:started', (payload: any) => {
        // Game started
        // Placeholder: could initialize synchronized game state here
        setMessage(tm.gameStartedTable(payload?.table?.name || ''));
      });
      s.on('friends:update', () => fetchFriends());
      s.on('game:state', (payload: any) => {
        if (payload?.tableId && payload.tableId !== activeTableIdRef.current) {
          console.debug(
            '[multiplayer] Ignoring game:state for other table',
            payload.tableId,
            'expected',
            activeTableIdRef.current,
          );
          return;
        }
        console.debug('[multiplayer] game:state received', {
          table: payload.tableId,
          phase: payload?.state?.phase,
          gameId: payload?.gameId,
        });
        const { state: st, players: pls, tableConfig, gameId: incomingGameId } = payload;
        if (incomingGameId && (!multiplayerGameId || multiplayerGameId !== incomingGameId)) {
          setMultiplayerGameId(incomingGameId);
        }
        // Set core game state
        setGameState({
          phase: st.phase,
          currentPlayer: st.currentPlayer,
          trumpSuit: st.trumpSuit,
          currentTrick: st.currentTrick,
          scores: st.scores,
          roundScores: st.roundScores,
          dealer: st.dealer,
          forehand: st.forehand ?? null,
          weis: st.weis,
        });
        if (tableConfig) {
          try {
            setTeamNames({
              1: tableConfig.team1Name || 'Team 1',
              2: tableConfig.team2Name || 'Team 2',
            });
            if (typeof tableConfig.targetPoints === 'number')
              setMaxPoints(tableConfig.targetPoints);
          } catch {}
        }
        // Load players and hands
        const rawPlayers = pls.map((p: any) => ({
          id: p.id,
          name: p.name,
          hand: p.hand,
          team: p.team,
          position: p.position,
          userId: (p as any).userId,
        }));
        const previousSeatIdx = typeof mySeatRef.current === 'number' ? mySeatRef.current : null;
        const playerByUser = user?.id ? rawPlayers.find((p: any) => p.userId === user.id) : null;
        const previousSeatPlayer =
          previousSeatIdx !== null ? rawPlayers.find((p: any) => p.id === previousSeatIdx) : null;
        const fallbackSeatPlayer = !user?.id ? rawPlayers.find((p: any) => p.id === 0) : null;
        const seatSource = playerByUser || previousSeatPlayer || fallbackSeatPlayer || null;
        const mySeatIdx =
          typeof (playerByUser?.id ?? seatSource?.id ?? previousSeatIdx) === 'number'
            ? (playerByUser?.id ?? seatSource?.id ?? previousSeatIdx)!
            : null;

        if (playerByUser && playerByUser.id !== previousSeatIdx) {
          setMySeat(playerByUser.id);
        } else if (
          !playerByUser &&
          previousSeatIdx === null &&
          typeof seatSource?.id === 'number'
        ) {
          setMySeat(seatSource.id);
        }

        const handSource = playerByUser || seatSource;
        setHand(handSource?.hand || []);
        // Re-orient players so that current user is always south (consistent mapping across clients)
        // CCW mapping: rel 0 -> south, 1 -> east, 2 -> north, 3 -> west
        const remapPosition = (playerId: number): string => {
          if (mySeatIdx === null) return rawPlayers[playerId]?.position || 'south';
          const rel = (playerId - mySeatIdx + 4) % 4;
          return rel === 0 ? 'south' : rel === 1 ? 'east' : rel === 2 ? 'north' : 'west';
        };
        const oriented = rawPlayers.map((p) => ({ ...p, position: remapPosition(p.id) }));
        setPlayers(oriented);
        // Hide options once multiplayer state is active
        if (mode === 'multi') setOptionsVisible(false);
        // Compute perspective oriented trick (map each played card to its seat relative to me)
        const trickRaw = st.currentTrick || [];
        if (trickRaw.length) {
          const oriented = trickRaw.map((pc: any) => {
            if (mySeatIdx === null) {
              const fallbackPos = rawPlayers[pc.playerId]?.position || 'south';
              return { ...pc, pos: fallbackPos };
            }
            const rel = (pc.playerId - mySeatIdx + 4) % 4; // 0 self,1 east,2 north,3 west (CCW mapping used earlier)
            const pos = rel === 0 ? 'south' : rel === 1 ? 'east' : rel === 2 ? 'north' : 'west';
            return { ...pc, pos };
          });
          setOrientedTrick(oriented);
        } else {
          setOrientedTrick([]);
        }

        // Legal cards (simpler, server authority): only evaluate when it's actually my turn
        const computeLegal = () => {
          const myHand = handSource?.hand || [];
          if (!myHand.length) return [] as any[];
          if (st.phase !== 'playing') return [] as any[];
          if (mySeatIdx === null || st.currentPlayer !== mySeatIdx) return [] as any[];
          const trick = st.currentTrick || [];
          if (trick.length === 0) return myHand.slice();
          const leadSuit = trick[0].suit;
          const hasLead = myHand.some((c) => c.suit === leadSuit);
          if (hasLead) return myHand.filter((c) => c.suit === leadSuit);
          // Enforce trump obligation if standard suit trump and player holds trump
          const trumpSuit =
            st.trumpSuit && ['eicheln', 'schellen', 'rosen', 'schilten'].includes(st.trumpSuit)
              ? st.trumpSuit
              : null;
          if (trumpSuit) {
            const tr = myHand.filter((c) => c.suit === trumpSuit);
            if (tr.length) return tr;
          }
          return myHand.slice();
        };
        const lc = computeLegal();
        setLegalCards(lc);
        // Debug window binding
        try {
          (window as any).gameDebug = {
            state: st,
            mySeat: mySeatIdx,
            legal: lc,
            trick: st.currentTrick,
          };
        } catch {}
        if (st.phase && st.phase !== 'waiting') {
          setMessage(`Game phase: ${st.phase}`);
        }
      });
      // If we joined late and haven't received state after 1500ms, request it explicitly
      const lateTimer = setTimeout(() => {
        if (mode === 'multi' && activeTableIdRef.current && !gameState) {
          console.debug('[multiplayer] Late join fallback requesting state');
          s.emit('table:requestState', { tableId: activeTableIdRef.current });
        }
      }, 1500);
      // Periodic retry until we have a phase
      let retryAttempts = 0;
      const retryInterval = setInterval(() => {
        if (gameState?.phase) {
          clearInterval(retryInterval);
          return;
        }
        if (mode !== 'multi' || !activeTableIdRef.current) {
          clearInterval(retryInterval);
          return;
        }
        retryAttempts++;
        if (retryAttempts > 5) {
          clearInterval(retryInterval);
          return;
        }
        console.debug('[multiplayer] Retry requesting state attempt', retryAttempts);
        s.emit('table:requestState', { tableId: activeTableIdRef.current });
      }, 2000);

      return () => {
        s.disconnect();
      };
    }
  }, [mode]);

  // Listen globally for server illegal play errors
  useEffect(() => {
    if (!socket) return;
    const handler = (err: any) => {
      setMessage(err?.message || tm.illegalMove);
    };
    socket.on('game:error', handler);
    return () => {
      socket.off('game:error', handler);
    };
  }, [socket]);

  useEffect(() => {
    if (!user?.id || !players.length) return;
    const seatPlayer = players.find((p: any) => p.userId === user.id);
    if (!seatPlayer) return;
    if (seatPlayer.id !== mySeatRef.current) {
      setMySeat(seatPlayer.id);
    }
    setHand((prev) => {
      const newHand = seatPlayer.hand || [];
      if (
        prev.length === newHand.length &&
        prev.every((card: any, idx: number) => card?.id === newHand[idx]?.id)
      ) {
        return prev;
      }
      return newHand;
    });
  }, [players, user?.id]);

  // Recompute orientedTrick & legal cards on dependency changes (safety net if socket update missed ordering)
  useEffect(() => {
    try {
      if (!gameState) return;
      if (mySeat == null) return;
      const st: any = gameState;
      const trickRaw = st.currentTrick || [];
      if (trickRaw.length) {
        const oriented = trickRaw.map((pc: any) => {
          const rel = (pc.playerId - mySeat + 4) % 4;
          const pos = rel === 0 ? 'south' : rel === 1 ? 'east' : rel === 2 ? 'north' : 'west';
          return { ...pc, pos };
        });
        setOrientedTrick(oriented);
      } else if (orientedTrick.length) {
        setOrientedTrick([]);
      }
      // Recompute legal (same logic as computeLegal) if it's our turn
      const currentPlayer = st.currentPlayer;
      const me = players.find((p) => p.id === mySeat);
      if (me && currentPlayer === mySeat && st.phase === 'playing') {
        const myHand = me.hand || [];
        let lc: any[] = [];
        if (myHand.length) {
          const trick = st.currentTrick || [];
          if (!trick.length) lc = myHand.slice();
          else {
            const leadSuit = trick[0].suit;
            const hasLead = myHand.some((c: any) => c.suit === leadSuit);
            if (hasLead) lc = myHand.filter((c: any) => c.suit === leadSuit);
            else {
              const trumpSuit =
                st.trumpSuit && ['eicheln', 'schellen', 'rosen', 'schilten'].includes(st.trumpSuit)
                  ? st.trumpSuit
                  : null;
              if (trumpSuit) {
                const tr = myHand.filter((c: any) => c.suit === trumpSuit);
                lc = tr.length ? tr : myHand.slice();
              } else lc = myHand.slice();
            }
          }
        }
        setLegalCards(lc);
      }
    } catch {}
  }, [gameState, mySeat, players]);

  // Desync watchdog: if it's a bot's turn for >4s with no trick growth, request state; after 2 failed attempts force soft reload.
  useEffect(() => {
    let attempts = 0;
    let lastTrickLen = gameState?.currentTrick?.length || 0;
    const id = setInterval(() => {
      const st = gameState;
      if (!st) return;
      const trickLen = st.currentTrick?.length || 0;
      const cp = st.currentPlayer;
      if (trickLen !== lastTrickLen) {
        lastTrickLen = trickLen;
        attempts = 0; // progress detected
        return;
      }
      // If stalled and current player is a bot (not us and flagged in players list)
      const curPlayer = players.find((p) => p.id === cp);
      if (
        st.phase === 'playing' &&
        curPlayer &&
        curPlayer.id !== mySeat &&
        /bot_/i.test(curPlayer.name)
      ) {
        attempts++;
        if (attempts === 2 && socket && activeTableId) {
          socket.emit('table:requestState', { tableId: activeTableId });
        }
        if (attempts >= 4) {
          // Soft reload
          console.warn('Desync detected – reloading page');
          window.location.reload();
        }
      }
    }, 2000);
    return () => clearInterval(id);
  }, [gameState, players, mySeat, socket, activeTableId]);

  // Ensure we (re)join the table room whenever activeTableId changes in multiplayer mode
  useEffect(() => {
    if (mode !== 'multi') return;
    if (!socket) return;
    if (!activeTableId) return;
    console.debug('[multiplayer] Emitting table:join', activeTableId);
    socket.emit('table:join', { tableId: activeTableId });
  }, [mode, socket, activeTableId]);

  const fetchTables = async () => {
    if (!authToken.current) return;
    try {
      const res = await fetch(`${API_URL}/api/tables`, {
        headers: { Authorization: `Bearer ${authToken.current}` },
      });
      const data = await res.json();
      if (data.success) setTables(data.tables || []);
    } catch {}
  };

  const fetchFriends = async () => {
    if (!authToken.current) return;
    setFriendsLoading(true);
    try {
      const [friendsRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/api/friends`, {
          headers: { Authorization: `Bearer ${authToken.current}` },
        }),
        fetch(`${API_URL}/api/friends/requests`, {
          headers: { Authorization: `Bearer ${authToken.current}` },
        }),
      ]);
      const fr = await friendsRes.json();
      const rq = await reqRes.json();
      if (fr.success && rq.success)
        setFriendsTabData({ friends: fr.friends, requests: rq.requests });
    } finally {
      setFriendsLoading(false);
    }
  };

  // Trigger initial fetch when switching to multi tabs
  useEffect(() => {
    if (mode === 'multi') {
      fetchTables();
      fetchFriends();
    }
  }, [mode]);

  const handleSwitchMode = (nextMode: 'single' | 'multi') => {
    if (nextMode === mode) return;
    if (nextMode === 'single') {
      setMode('single');
      setOptionsVisible(true);
      setActiveTableId(null);
      setMultiplayerGameId(null);
      setDealerUserId(null);
      setMessage(t.singleModeHint);
      return;
    }

    setMode('multi');
    setOptionsVisible(false);
    setMessage(t.multiModeHint);
  };

  // Unused rendering functions removed (tables/friends/tabs moved to standalone views)

  // Apply multiplayer game state to UI

  // Apply multiplayer game state to UI
  useEffect(() => {
    if (mode === 'multi' && multiGameState) {
      // Map engine state to local state hooks
      setGameState({
        phase: multiGameState.phase,
        currentPlayer: multiGameState.currentPlayer,
        trumpSuit: multiGameState.trump,
        currentTrick: multiGameState.currentTrick,
        scores: multiGameState.scores,
        roundScores: multiGameState.roundScores,
        dealer: multiGameState.dealer,
        forehand: multiGameState.forehand ?? null,
        weis: multiGameState.weis,
      });
      // Map players
      const uiPlayers = multiGameState.players.map((p: any) => ({
        id: p.id,
        name: p.userId === dealerUserId ? 'You (Dealer)' : p.userId,
        hand: p.hand,
        team: p.team,
        position: p.position,
      }));
      setPlayers(uiPlayers);
      // Set hand of this user (id matches first player)
      const me = uiPlayers.find((p) => p.userId === user?.id || p.id === 0);
      setHand(me?.hand || []);
      // Legal cards for current player
      if (multiGameState.currentPlayer === 0) {
        setLegalCards(Schieber.getLegalCardsForPlayer(multiGameState, 0));
      } else {
        setLegalCards([]);
      }
    }
  }, [multiGameState]);

  const choosingTrump =
    gameState?.phase === 'trump_selection' &&
    (mode === 'multi'
      ? mySeat !== null && gameState.currentPlayer === mySeat
      : gameState.currentPlayer === 0);
  const showPlaySurface = !optionsVisible || (mode === 'multi' && !!gameState);

  return (
    <div
      className={`jass-screen${choosingTrump ? ' jass-screen--choosing' : ''}${settings.leftHanded ? ' jass-screen--lefty' : ''}${settings.suitMarks ? ' jass-screen--marks' : ''}${settings.speed === 'off' ? ' jass-screen--noanim' : ''}`}
    >
      <div className="jass-screen__area">
        {/* Game-only HUD: slim score bar with trump pill */}
        {showPlaySurface && (
          <ScoreBar
            lang={lang}
            teamNames={teamNames}
            scores={gameState?.scores || { team1: 0, team2: 0 }}
            target={maxPoints}
            trump={currentTrump}
            myTeam={players.find((p) => p.position === 'south')?.team}
          />
        )}

        <div className="jass-status">
          {showPlaySurface && (
            <div className="jass-status__msg" role="status" aria-live="polite">
              {message}
            </div>
          )}

          {/* Quick action buttons - always available when not on welcome screen */}
          {(showPlaySurface || setupChoice !== 'welcome') && gameState && (
            <button
              className="jass-btn-ghost"
              onClick={() => {
                if (confirm(t.confirmNewGame)) {
                  resetToWelcome();
                }
              }}
            >
              {t.newGame || 'New Game'}
            </button>
          )}
        </div>

        {/* Game-only HUD (scores, trump, history) */}
        {showPlaySurface && (
          <>
            {mode === 'multi' && multiGameState && (
              <div
                style={{
                  margin: '0 auto 16px',
                  maxWidth: 760,
                  background: '#fff',
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Multiplayer State</div>
                  <div style={{ fontSize: 12 }}>Dealer Seat: {multiGameState.dealerSeat}</div>
                  <div style={{ fontSize: 12 }}>
                    Current Player Seat: {multiGameState.currentPlayerSeat}
                  </div>
                  {activeTableId && (
                    <div style={{ fontSize: 12, color: '#374151' }}>Table: {activeTableId}</div>
                  )}
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Your Multiplayer Hand
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(multiGameState.players || [])
                      .find((p: any) => p.userId === user?.id)
                      ?.hand?.map((c: string, i: number) => (
                        <div
                          key={i}
                          style={{
                            padding: '4px 6px',
                            background: '#1A7A4C',
                            color: '#fff',
                            borderRadius: 6,
                            fontSize: 12,
                            letterSpacing: 0.5,
                          }}
                        >
                          {c}
                        </div>
                      )) || <div style={{ fontSize: 12, color: '#6b7280' }}>No hand</div>}
                  </div>
                </div>
              </div>
            )}
            {roundHistory.length > 0 && (
              <details
                style={{
                  maxWidth: 700,
                  margin: '0 auto 10px',
                  background: '#fffaf0',
                  border: '1px solid #e3d7bf',
                  borderRadius: 10,
                  padding: '6px 12px',
                }}
              >
                <summary
                  style={{ fontSize: 13, fontWeight: 600, color: '#3a2e20', cursor: 'pointer' }}
                >
                  {t.roundHistory} ({roundHistory.length})
                </summary>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    margin: '8px 0 4px',
                  }}
                >
                  {roundHistory.map((round, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'white',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        border: '1px solid #e5e7eb',
                        minWidth: 80,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {t.round} {round.round}
                      </div>
                      <div style={{ color: TEAM_COLORS[1] }}>{round.team1}</div>
                      <div style={{ color: TEAM_COLORS[2] }}>{round.team2}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>
                        {trumpName(round.trump, lang)}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {showPlaySurface && (
          <div className="jass-stage">
            <div className="jass-table" data-jass-table>
              {/* Seats: north/south centred, west/east on the sides */}
              <div className="seat-slot seat-slot--north">{renderSeat('north')}</div>
              <div className="seat-slot seat-slot--west">{renderSeat('west', true)}</div>
              <div className="seat-slot seat-slot--east">{renderSeat('east', true)}</div>
              <div className="seat-slot seat-slot--south">{renderSeat('south')}</div>
              {mode === 'single' && (
                <LastTrick lang={lang} last={lastTrick} players={players as any} />
              )}
              {mode === 'single' && (
                <SettingsSheet lang={lang} settings={settings} onChange={updateSettings} />
              )}
              {mode === 'single' && <RulesSheet lang={lang} />}

              {/* Trick: cards nudged toward the player who played them */}
              <div className="trick-zone">
                <TrickArea
                  cards={(gameState?.currentTrick || []).map((c: any, i: number) => ({
                    card: c,
                    seat: positionForPlayerId(c.playerId ?? i),
                  }))}
                  collect={
                    collect
                      ? {
                          winnerSeat: positionForPlayerId(collect.winnerId),
                          winningCardId: String(
                            (gameState?.currentTrick || []).find(
                              (c: any) => c.playerId === collect.winnerId,
                            )?.id ?? '',
                          ),
                        }
                      : null
                  }
                  emptyLabel={uiPendingResolve || isAnimating ? null : t.noCardsPlayed}
                  scale={speedScale()}
                  still={settings.speed === 'off'}
                />
              </div>
            </div>

            {/* Trump selector: show when it's this user's turn (local: player 0; multi: mySeat) */}
            {choosingTrump && gameState && (
              <TrumpChooser
                lang={lang}
                dealerName={
                  players.find((p) => p.id === gameState.dealer)?.name ||
                  `Player ${gameState.dealer}`
                }
                canSchieben={isLocal && gameState.forehand === 0}
                partnerMustChoose={isLocal && gameState.forehand !== 0}
                onPick={submitTrump}
              />
            )}
          </div>
        )}

        {optionsVisible && savedGame && (setupChoice === 'welcome' || setupChoice === 'single') && (
          <ResumeCard
            lang={lang}
            saved={savedGame}
            onContinue={continueSavedGame}
            onNewGame={clearSavedGame}
          />
        )}
        {optionsVisible && (setupChoice === 'welcome' || setupChoice === 'single') && (
          <div className="rules-row">
            <RulesSheet lang={lang} variant="inline" />
          </div>
        )}

        {/* Welcome Screen - shown when user hasn't chosen single or multi yet */}
        {optionsVisible && setupChoice === 'welcome' && (
          <WelcomeCard
            lang={lang}
            onlineCount={onlineCount}
            onSingle={() => {
              setMode('single');
              setSetupChoice('single');
            }}
            onMulti={() => {
              setMode('multi');
              setSetupChoice('multi');
            }}
          />
        )}

        {optionsVisible && setupChoice === 'single' && mode === 'single' && (
          <div style={{ marginTop: 4 }}>
            <MatchSetup
              lang={lang}
              bots={botNames.map((n) => n.replace(/\s*\(bot\)$/, ''))}
              teamNames={teamNames}
              onTeamNames={setTeamNames}
              target={maxPoints}
              onTarget={setMaxPoints}
              onStart={startLocalGameWithOptions}
              onBack={ONLINE_ENABLED ? () => setSetupChoice('welcome') : undefined}
              backLabel={messages(lang).header.home}
            />
          </div>
        )}

        {optionsVisible && setupChoice === 'multi' && mode === 'multi' && (
          <MultiInfoCard
            lang={lang}
            onlineCount={onlineCount}
            blurb={t.multiTablesBlurb}
            onBack={() => setSetupChoice('welcome')}
          />
        )}

        <Hand
          lang={lang}
          cards={sortHandForDisplay(hand, chosenTrump)}
          legalCards={legalCards}
          selectedCard={selectedCard}
          markPlayability={gameState?.phase !== 'trump_selection'}
          reasonFor={notPlayableReason}
          onCardTap={(card, playable, reason) => {
            if (!playable) {
              if (reason) setMessage(reason);
              return;
            }
            if (selectedCard !== card.id) {
              setSelectedCard(card.id);
              return;
            }
            setSelectedCard(null);
            if (isLocal) {
              buzz();
              playLocalCard(card.id);
            } else playCard(card.id);
          }}
        />

        <WeisPanel
          lang={lang}
          weis={gameState?.weis as any}
          players={players as any}
          weisWinner={weisWinner as any}
        />

        <InfoPanels lang={lang} />

        <CardCredits lang={lang} />
      </div>

      {showVictory && (
        <VictoryModal
          isOpen={showVictory}
          lang={lang}
          myTeam={players.find((p) => p.position === 'south')?.team}
          teamNames={teamNames}
          finalScores={{
            team1: gameState?.scores?.team1 || 0,
            team2: gameState?.scores?.team2 || 0,
          }}
          roundHistory={roundHistory}
          onPlayAgain={() => {
            setShowVictory(false);
            setMatchFinished(false);
            if (isLocal) {
              // Start another local game with same settings
              startLocalGameWithOptions();
            } else {
              // For multiplayer, return to welcome to choose again
              resetToWelcome();
            }
          }}
          onClose={() => setShowVictory(false)}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default JassGame;
