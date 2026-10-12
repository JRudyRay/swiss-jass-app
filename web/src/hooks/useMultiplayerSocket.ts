import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config';

// Multiplayer socket lifecycle and server event handlers (game:state, table:starting, ...).
// Moved out of JassGame.tsx unchanged; shared UI state and setters are passed in through `c`.
export function useMultiplayerSocket(c: any) {
  const {
    mode,
    socket,
    setSocket,
    setOnlineCount,
    fetchTables,
    fetchFriends,
    activeTableIdRef,
    setMode,
    setMultiplayerGameId,
    setMessage,
    tm,
    setDealerUserId,
    multiplayerGameId,
    setGameState,
    setTeamNames,
    setMaxPoints,
    user,
    mySeatRef,
    setMySeat,
    setHand,
    setPlayers,
    setOptionsVisible,
    setOrientedTrick,
    setLegalCards,
    gameState,
    authToken,
  } = c;

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
}
