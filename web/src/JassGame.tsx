import React, { useEffect, useState, useRef } from 'react';
import { SwissCard } from './SwissCard';
import * as Schieber from './engine/schieber';
import YouTubePlayer from './YouTubePlayer';
import { API_URL } from './config';

// Allow API override at build-time via Vite env (VITE_API_URL).
// When the app is served from GitHub Pages (not localhost) there is no backend available,
// so default to empty string to indicate local-only mode.
const _meta = (import.meta as any);

type GameState = {
  phase: string;
  currentPlayer: number;
  trumpSuit?: string | null;
  currentTrick?: any[];
  scores?: { team1: number; team2: number };
  roundScores?: { team1: number; team2: number };
  dealer?: number;
  weis?: Record<number, any[]>; // playerId -> Weis declarations
};

type Player = { id: number; name: string; hand: any[]; team: number; position: string };

const suitSymbols: { [key: string]: string } = {
  eicheln: '🌰',
  schellen: '🔔',
  rosen: '🌹',
  schilten: '🛡️',
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { fontFamily: 'Segoe UI, Arial, sans-serif', minHeight: '100vh', background: 'linear-gradient(180deg,#f8fafc,#fffef0)', paddingBottom: 40 },
  header: { background: '#b91c1c', color: 'white', padding: '1rem 0.8rem', textAlign: 'center' as const, fontSize: 20, fontWeight: 700 },
  gameArea: { maxWidth: 1100, margin: '1.5rem auto', background: 'white', borderRadius: 14, padding: 18, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' },
  controls: { display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' as const },
  button: { background: '#b91c1c', color: 'white', border: 'none', padding: '0.6rem 1.1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600 },
  message: { padding: 10, marginBottom: 12, background: '#eef2ff', borderRadius: 10 },
  hand: { display: 'flex', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'center', padding: '12px 8px' },
  table: { padding: 14, background: '#f1fff4', borderRadius: 10, minHeight: 140, marginBottom: 12 },
};

export const JassGame: React.FC<{ user?: any; onLogout?: () => void }> = ({ user, onLogout }) => {
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

  const ytRef = useRef<any>(null);
  const [lang, setLang] = useState<'en'|'ch'>('en');

  const T: Record<string, Record<string,string>> = {
    en: {
      currentTrump: 'Current Trump',
      roundScores: 'Round — Team1',
      yourHand: 'Your Hand',
      launchLocal: 'Launch Local Game',
      launchServer: 'Launch Server Game',
      selectTrump: 'Select Trump',
      submitTrump: 'Submit Trump',
      scoringDetails: 'Scoring Details',
      musicPlaylist: 'Mountain Music Playlist',
    },
    ch: {
      currentTrump: 'Trump jetzt',
      roundScores: 'Rundi — Team1',
      yourHand: 'Dini Chart',
      launchLocal: 'Lokal starte',
      launchServer: 'Server starte',
      selectTrump: 'Trump wähle',
      submitTrump: 'Trump bestätigt',
      scoringDetails: 'Punktetabelle',
      musicPlaylist: 'Bärgmusig Playlist',
    }
  };
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hand, setHand] = useState<any[]>([]);
  const [legalCards, setLegalCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [message, setMessage] = useState('Welcome to Swiss Jass!');
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<'game'|'rankings'|'settings'>('game');
  const [usersList, setUsersList] = useState<Array<{ id: string; username: string; totalPoints: number }>>([]);
  const [totals, setTotals] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('jassTotals');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [gameType, setGameType] = useState<string>('schieber');
  const [maxPoints, setMaxPoints] = useState<number>(1000);
  const [isLocal, setIsLocal] = useState<boolean>(false);
  const [chosenTrump, setChosenTrump] = useState<string | null>(null);
  const [playDelayMs, setPlayDelayMs] = useState<number>(450);
  const [animatingSwoop, setAnimatingSwoop] = useState<{ winnerId: number | null; cards: any[] } | null>(null);
  const [uiPendingResolve, setUiPendingResolve] = useState(false);
  const centerRef = useRef<HTMLDivElement | null>(null);
  const seatRefs = {
    south: useRef<HTMLDivElement | null>(null),
    north: useRef<HTMLDivElement | null>(null),
    west: useRef<HTMLDivElement | null>(null),
    east: useRef<HTMLDivElement | null>(null),
  };
  const [animPositions, setAnimPositions] = useState<Record<string, { left:number; top:number; rot:number }> | null>(null);
  const [dialect, setDialect] = useState<'zurich'|'grisons'|'lucerne'>('zurich');
  const [teamNames, setTeamNames] = useState<{1:string;2:string}>(() => ({ 1: 'Team 1', 2: 'Team 2' }));
  const [optionsVisible, setOptionsVisible] = useState(true);

  // simplify optional checks used in JSX
  const animCards = animatingSwoop?.cards ?? [];
  const isAnimating = Boolean(animatingSwoop);
  const [winnerFlash, setWinnerFlash] = useState<{ id: number; emoji: string } | null>(null);
  const headerEmojis = ['🇨🇭','🧀','🫕','🏔️','🐄','🍫'];
  const [showLastTrick, setShowLastTrick] = useState<(any[] ) | null>(null);
  const [matchFinished, setMatchFinished] = useState<boolean>(false);
  const [roundStarter, setRoundStarter] = useState(0);
  // helper: map engine player id to a seat around the table
  const seatForId = (id: number) => {
    const seats = ['south', 'west', 'north', 'east'];
    return seats[id] || 'south';
  };
  const mapPlayersWithSeats = (pls: any[]) => (pls || []).map(p => ({ id: p.id, name: p.name, hand: p.hand, team: p.team, teamName: teamNames[p.team] || `Team ${p.team}`, position: seatForId(p.id), points: (p as any).points }));

  const seatPlayer = (pos: string) => players.find(p => p.position === pos);
  const northPlayer = seatPlayer('north');
  const westPlayer = seatPlayer('west');
  const eastPlayer = seatPlayer('east');
  const southPlayer = seatPlayer('south');

  function sortHandForDisplay(hand: any[], trump?: string|null) {
    if (!hand || !hand.length) return hand.slice();
    const trumpSuit = trump || null;
    // Use engine rank codes: U = Unter (jack), O = Ober (queen)
    const normalRankOrder = ['6','7','8','9','10','U','O','K','A'];
    const trumpRankOrder = ['U','9','A','10','K','O','8','7','6'];
    const rankWeight = new Map(normalRankOrder.map((r,i)=>[r,i]));
    const trumpWeight = new Map(trumpRankOrder.map((r,i)=>[r,i]));
    const normal = hand.filter(c=>c.suit !== trumpSuit).slice();
    const trumps = hand.filter(c=>c.suit === trumpSuit).slice();
    normal.sort((a,b)=>{
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return (rankWeight.get(a.rank) ?? 0) - (rankWeight.get(b.rank) ?? 0);
    });
    // For trumps show best-to-worst (highest first on the right side) so sort by trumpWeight ascending
    trumps.sort((a,b)=> (trumpWeight.get(a.rank) ?? 0) - (trumpWeight.get(b.rank) ?? 0));
    return [...normal, ...trumps];
  }

  function renderTrickStack(p: any) {
    const count = p?.tricks?.length || 0;
    const stack = [] as any[];
    for (let i=0;i<Math.min(count,4);i++) stack.push(i);
    return (
      <div style={{ display:'flex', gap:4, alignItems:'center', justifyContent:'center', flexDirection: 'column' }}>
        <div style={{ position:'relative', width:32, height:44 }}>
          {stack.map((s,i)=> (
            <div key={i} style={{ position:'absolute', left: i*2, top: -i*1.5, width:32, height:44, background:'#111827', borderRadius:3, boxShadow:'0 2px 6px rgba(0,0,0,0.2)', opacity:0.9 }} />
          ))}
        </div>
        <div style={{ fontSize: 11, color:'#374151', textAlign: 'center', whiteSpace: 'nowrap' }}>{count} Stiche</div>
      </div>
    );
  }

  async function startSwoopAndResolve(st: Schieber.State): Promise<Schieber.State> {
    // lightweight UX: flash an emoji next to the winner instead of a heavy DOM animation
    const winner = Schieber.peekTrickWinner(st);
    if (winner === null) return st;
    const emoji = headerEmojis[Math.floor(Math.random()*headerEmojis.length)];
  try {
  setWinnerFlash({ id: winner, emoji });
  // keep the played cards visible in the middle so users can see the trick
  await new Promise(r=>setTimeout(r, 1000));
  const newSt = Schieber.resolveTrick(st);
      saveLocalState(newSt);
      setGameState({ phase: newSt.phase, currentPlayer: newSt.currentPlayer, trumpSuit: newSt.trump || null, currentTrick: newSt.currentTrick || [], scores: newSt.scores });
      setPlayers(mapPlayersWithSeats(newSt.players));
      setHand(newSt.players.find(p=>p.id===0)?.hand || []);
      setLegalCards(Schieber.getLegalCardsForPlayer(newSt, 0));
      // if round finished, show lastTrick for 2s then clear and award totals
      if (newSt.phase === 'finished') {
        // show the final trick for 2s before clearing
        setShowLastTrick(newSt.lastTrick || null);
        await new Promise(r=>setTimeout(r, 2000));
        setShowLastTrick(null);
        // award points to winning team players (use team scores)
        const team1 = newSt.scores.team1 || 0;
        const team2 = newSt.scores.team2 || 0;
        const winningTeam = team1 >= team2 ? 1 : 2;
        const winners = newSt.players.filter(p=>p.team === winningTeam);
        const addPts = Math.max(team1, team2);
        try {
          const cur = JSON.parse(localStorage.getItem('jassTotals')||'{}');
          winners.forEach(w=> { cur[w.name] = (cur[w.name]||0) + addPts; });
          localStorage.setItem('jassTotals', JSON.stringify(cur));
          setTotals(cur);
        } catch (e) {}
        // if maxPoints reached by either team, stop; else start a fresh local round
        const t1 = newSt.scores.team1 || 0; const t2 = newSt.scores.team2 || 0;
        if (t1 >= maxPoints || t2 >= maxPoints) {
          setMessage('Match finished — max points reached');
          // mark match finished and update state so UI can react
          setMatchFinished(true);
          setGameState({ phase: 'finished', currentPlayer: newSt.currentPlayer, trumpSuit: newSt.trump || null, currentTrick: newSt.currentTrick || [], scores: newSt.scores });
        } else {
          // start a new round (fresh deal) keeping totals and rotating dealer
          const fresh = Schieber.startNewHand(newSt);
          saveLocalState(fresh);
          setPlayers(mapPlayersWithSeats(fresh.players));
          setGameState({ phase: fresh.phase, currentPlayer: fresh.currentPlayer, trumpSuit: fresh.trump || null, currentTrick: fresh.currentTrick || [], scores: fresh.scores, dealer: fresh.dealer });
          setHand(fresh.players.find(p=>p.id===0)?.hand || []);
          setLegalCards(Schieber.getLegalCardsForPlayer(fresh, 0));
        }
      }
      return newSt;
    } finally {
      setWinnerFlash(null);
      setAnimatingSwoop(null);
    }
  }

  useEffect(() => {
    if (gameId) loadGameState(gameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Load users/totals from server for Rankings and Settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/users`);
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

  const createGame = async () => {
    setIsLoading(true);
    try {
  // starting a new game clears any previous match-finished flag
  setMatchFinished(false);
      if (!API_URL) {
        // no backend available (e.g. GitHub Pages) — start local game instead
        startLocalGameWithOptions();
        setMessage('No backend detected — running local game');
        return;
      }
      const res = await fetch(`${API_URL}/api/games/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerNames: ['You', 'Anna (bot)', 'Reto (bot)', 'Fritz (bot)'], gameType }) });
      const data = await res.json();
      if (data?.success) {
        setGameId(data.gameId);
        setGameState(data.state || null);
  setPlayers(mapPlayersWithSeats(data.players || []));
        setHand(data.hand || []);
        setMessage('Game created');
  setOptionsVisible(false);
      } else {
        setMessage(data?.message || 'Failed to create game');
      }
    } catch (err) {
      setMessage('Could not create game — is backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const createGameWithOptions = async (opts?: { gameType?: string; maxPoints?: number }) => {
    setIsLoading(true);
    try {
  // clear previous finished flag when explicitly creating a game
  setMatchFinished(false);
      const body = { playerNames: ['You', 'Anna (bot)', 'Reto (bot)', 'Fritz (bot)'], gameType: opts?.gameType || gameType, maxPoints: opts?.maxPoints || maxPoints };
      if (!API_URL) {
        // run local flow instead
        startLocalGameWithOptions();
        setMessage('No backend detected — running local game');
        return;
      }
      const res = await fetch(`${API_URL}/api/games/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data?.success) {
        setGameId(data.gameId);
        setGameState(data.state || null);
  setPlayers(mapPlayersWithSeats(data.players || []));
        setHand(data.hand || []);
        setMessage('Game created');
  setOptionsVisible(false);
      } else {
        setMessage(data?.message || 'Failed to create game');
      }
    } catch (err) {
      setMessage('Could not create game — is backend running?');
    } finally {
      setIsLoading(false);
    }
  setIsLocal(false);
  };

  // --- Local play with simple bots ---
  const startLocalGame = () => {
    const st = Schieber.startGameLocal();
    // map engine players to our UI players
  setPlayers(mapPlayersWithSeats(st.players));
    setGameState({ phase: st.phase, currentPlayer: st.currentPlayer, trumpSuit: st.trump || null, currentTrick: st.currentTrick || [], scores: st.scores, dealer: st.dealer });
    setHand(st.players.find(p=>p.id===0)?.hand || []);
    setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
    setMessage('Local game started — select trump or have bots choose');
    // store engine state in ref-like place (we'll keep in localStorage for now)
    localStorage.setItem('jassLocalState', JSON.stringify(st));
  };

  const startLocalGameWithOptions = () => {
    // persist chosen options for local session
    try { localStorage.setItem('jassLocalOptions', JSON.stringify({ gameType, maxPoints })); } catch {};
  // if a previous match finished, starting a new local game clears it
  setMatchFinished(false);
  setIsLocal(true);
  startLocalGame();
  // let bots take over (they will auto-select trump if needed)
  setTimeout(() => { botsTakeTurns(); }, 200);
  setOptionsVisible(false);
  };

  const loadLocalState = (): Schieber.State | null => {
    try {
      const raw = localStorage.getItem('jassLocalState');
      if (!raw) return null;
      return JSON.parse(raw) as Schieber.State;
    } catch { return null; }
  };

  const saveLocalState = (st: Schieber.State) => {
    localStorage.setItem('jassLocalState', JSON.stringify(st));
  };

  const botsTakeTurns = async () => {
  // loop until finished
  let st = loadLocalState();
  if (!st) return;
  while (st.phase !== 'finished') {
  if (matchFinished) break;
      // if trump selection phase, let bots choose only when it's their turn
      if (st.phase === 'trump_selection') {
  if (st.currentPlayer === 0) {
          // player's turn to pick trump — update UI and wait for human
          setGameState({ phase: st.phase, currentPlayer: st.currentPlayer, trumpSuit: st.trump || null, currentTrick: st.currentTrick || [], scores: st.scores });
          setMessage('Please choose trump');
          break;
        }
  // let engine pick a random trump for bots to avoid getting stuck
  const chosen = Schieber.chooseRandomTrump();
  st.trump = chosen;
  setChosenTrump(chosen);
        st.phase = 'playing';
        setMessage(`Local bots chose trump: ${chosen}`);
        saveLocalState(st);
        setGameState({ phase: st.phase, currentPlayer: st.currentPlayer, trumpSuit: st.trump || null, currentTrick: st.currentTrick || [], scores: st.scores });
  // update UI players and hand
  setPlayers(mapPlayersWithSeats(st.players));
  setHand(st.players.find(p=>p.id===0)?.hand || []);
  setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
  await new Promise(r=>setTimeout(r, playDelayMs));
        continue;
      }

      // if it's a bot's turn (0 is our south player), let bots play automatically
      if (st.currentPlayer !== 0) {
        const id = st.currentPlayer;
        const pick = Schieber.chooseBotCard(st, id);
        if (!pick) break;
  st = Schieber.playCardLocal(st, id, pick);
        saveLocalState(st);
        setGameState({ phase: st.phase, currentPlayer: st.currentPlayer, trumpSuit: st.trump || null, currentTrick: st.currentTrick || [], scores: st.scores });
  setPlayers(mapPlayersWithSeats(st.players));
        // refresh human's hand and legal cards
        setHand(st.players.find(p=>p.id===0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
        // if trick completed and pendingResolve flagged, pause so UI shows last card, then resolve
        if (st.pendingResolve) {
          setUiPendingResolve(true);
          try {
            // compute animation positions and perform swoop then resolve
            st = await startSwoopAndResolve(st);
            if (matchFinished) break;
          } finally {
            setUiPendingResolve(false);
          }
          continue;
        }
        await new Promise(r=>setTimeout(r, playDelayMs));
        continue;
      }

      // if it's our turn (0), wait for player action — return to let UI handle double-click plays
      if (st.currentPlayer === 0) {
        // update UI to reflect it's player's turn
        setGameState({ phase: st.phase, currentPlayer: st.currentPlayer, trumpSuit: st.trump || null, currentTrick: st.currentTrick || [], scores: st.scores });
        setHand(st.players.find(p=>p.id===0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
        break;
      }
    }

    // finished
    setMessage('Local round finished — updating totals');
    // compute per-player points based on st.scores distribution
  updateTotalsFromGameState({ phase: 'finished', currentPlayer: st.currentPlayer, trumpSuit: st.trump, scores: st.scores }, st.players as any, 'local-'+Date.now());
  };

  const submitTrump = () => {
    // If local, write trump into local state and advance to playing
    if (isLocal) {
      const st = loadLocalState();
      if (!st) return;
      if (!chosenTrump) return setMessage('Choose a trump first');
      
      // Handle "schieben" (pass) - pass trump decision to partner
      if (chosenTrump === 'schieben') {
        const partnerId = st.currentPlayer === 0 ? 2 : (st.currentPlayer + 2) % 4; // Partner is across the table
        st.currentPlayer = partnerId;
        setMessage(`Trump decision passed to ${st.players.find(p => p.id === partnerId)?.name || 'partner'} (Schieben)`);
        saveLocalState(st);
        setGameState({ phase: st.phase, currentPlayer: st.currentPlayer, trumpSuit: st.trump || null, currentTrick: st.currentTrick || [], scores: st.scores });
        setChosenTrump(null); // Reset selection
        // Let bot partner choose trump
        setTimeout(()=>botsTakeTurns(), 200);
        return;
      }
      
      st.trump = chosenTrump;
      st.phase = 'playing';
      
      // Detect Weis for all players now that trump is known
      const updatedSt = Schieber.setTrumpAndDetectWeis(st, chosenTrump);
      saveLocalState(updatedSt);
      setPlayers(mapPlayersWithSeats(updatedSt.players));
      setGameState({ phase: updatedSt.phase, currentPlayer: updatedSt.currentPlayer, trumpSuit: updatedSt.trump || null, currentTrick: updatedSt.currentTrick || [], scores: updatedSt.scores, weis: updatedSt.weis });
      setMessage(`Trump set: ${chosenTrump} - Weis detected for all players`);
      // start bots playing
      setTimeout(()=>botsTakeTurns(), 200);
      return;
    }

    // If server-backed game, submit chosenTrump via API
    if (!chosenTrump) return setMessage('Choose a trump first');
    selectTrump(chosenTrump);
  };

  const playLocalCard = async (cardId: string) => {
  // prevent playing while UI is resolving a trick or when match finished
  if (matchFinished) return setMessage('Match has finished — start a new game to continue');
  // prevent playing while UI is resolving a trick
    if (uiPendingResolve) return;
    const st = loadLocalState();
    if (!st) return;
    if (st.phase !== 'playing') return setMessage('Game not in playing phase');
    if (st.currentPlayer !== 0) return setMessage("It's not your turn");
    const legal = Schieber.getLegalCardsForPlayer(st, 0).map(c=>c.id);
    if (!legal.includes(cardId)) return setMessage('Illegal card');
    const newSt = Schieber.playCardLocal(st, 0, cardId);
    // if this play completes a trick, the engine will set pendingResolve
    if (newSt.pendingResolve) {
      setUiPendingResolve(true);
      try {
        // save immediate state so UI shows the just-played card
        saveLocalState(newSt);
        setGameState({ phase: newSt.phase, currentPlayer: newSt.currentPlayer, trumpSuit: newSt.trump || null, currentTrick: newSt.currentTrick || [], scores: newSt.scores });
        setHand(newSt.players.find(p=>p.id===0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(newSt, 0));
  // perform swoop animation then resolve and retrieve resulting state
  const resolved = await startSwoopAndResolve(newSt);
  // update newSt to the resolved state so later logic uses correct state
  // (resolved may be same object)
  // ensure we persist resolved state
  saveLocalState(resolved);
      } finally {
        setUiPendingResolve(false);
      }
      // after resolution, let bots continue
      setTimeout(()=>botsTakeTurns(), 80);
      return;
    }
    // normal play: persist and update UI, then let bots act
    saveLocalState(newSt);
    setGameState({ phase: newSt.phase, currentPlayer: newSt.currentPlayer, trumpSuit: newSt.trump || null, currentTrick: newSt.currentTrick || [], scores: newSt.scores });
    setHand(newSt.players.find(p=>p.id===0)?.hand || []);
    setLegalCards(Schieber.getLegalCardsForPlayer(newSt, 0));
    // let bots respond
    setTimeout(()=>botsTakeTurns(), 200);
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
          if (id && !processed.includes(id)) updateTotalsFromGameState(data.state, data.players || [], id);
        }
      }
    } catch (err) {
      setMessage('Error loading game state');
    }
  };

  // Persist and update per-player totals stored in localStorage
  const updateTotalsFromGameState = (state: GameState, playersList: Player[], maybeGameId?: string | null) => {
    try {
      const currentTotalsRaw = localStorage.getItem('jassTotals');
      const currentTotals: Record<string, number> = currentTotalsRaw ? JSON.parse(currentTotalsRaw) : {};

      // Determine per-player points from state
      const additions: Record<string, number> = {};

      // If playersList contains per-player points, use that
      if (playersList && playersList.length && playersList.every(p => typeof (p as any).points === 'number')) {
        playersList.forEach(p => { additions[p.name] = (p as any).points || 0; });
      } else if (state.scores && (state.scores as any).team1 !== undefined) {
        // Distribute team scores to team members evenly if per-player scores absent
        const team1 = (state.scores as any).team1 || 0;
        const team2 = (state.scores as any).team2 || 0;
        const team1Players = playersList.filter(p => p.team === 1);
        const team2Players = playersList.filter(p => p.team === 2);
        const per1 = team1Players.length ? Math.round(team1 / team1Players.length) : 0;
        const per2 = team2Players.length ? Math.round(team2 / team2Players.length) : 0;
        team1Players.forEach(p => additions[p.name] = per1);
        team2Players.forEach(p => additions[p.name] = per2);
      }

      // Apply additions to totals
      const newTotals = { ...currentTotals };
      Object.keys(additions).forEach(name => {
        newTotals[name] = (newTotals[name] || 0) + (additions[name] || 0);
      });

      localStorage.setItem('jassTotals', JSON.stringify(newTotals));
      setTotals(newTotals);

      // Best-effort: try to sync totals to backend if available and refresh server-side users list
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/admin/totals/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ totals: newTotals }) });
          const j = await res.json();
          if (j?.success) {
            // Refresh server user totals for Rankings
            try {
              const r2 = await fetch(`${API_URL}/api/admin/users`);
              const u = await r2.json();
              if (u?.success) setUsersList(u.users || []);
            } catch (e) { /* ignore */ }
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

  const selectTrump = async (trump: string) => {
    if (!gameId && !isLocal) return;
    setIsLoading(true);
    try {
      if (!API_URL || isLocal) {
        // apply locally
        const st = loadLocalState();
        if (!st) return;
        st.trump = trump;
        st.phase = 'playing';
        saveLocalState(st);
        setGameState({ phase: st.phase, currentPlayer: st.currentPlayer, trumpSuit: st.trump || null, currentTrick: st.currentTrick || [], scores: st.scores });
        setMessage(`Trump selected: ${trump}`);
        setTimeout(()=>botsTakeTurns(),200);
        return;
      }
      const res = await fetch(`${API_URL}/api/games/${gameId}/trump`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trump, playerId: 0 }) });
      const data = await res.json();
      if (data?.success) {
        setGameState(data.state || null);
        setPlayers(data.players || []);
        setHand(data.hand || []);
        setMessage(`Trump selected: ${trump}`);
      } else setMessage(data?.message || 'Failed to select trump');
    } catch (err) {
      setMessage('Error selecting trump');
    } finally {
      setIsLoading(false);
    }
  };

  const playCard = async (cardId: string) => {
    // if no backend, route to local play APIs
    if (!API_URL || isLocal) {
      playLocalCard(cardId);
      return;
    }
    if (!gameId || !gameState) return;
    if (gameState.currentPlayer !== 0) {
      setMessage("It's not your turn");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/games/${gameId}/play`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: 0, cardId }) });
      const data = await res.json();
      if (data?.success) {
        setGameState(data.state || null);
        setPlayers(data.players || []);
        setHand(data.hand || []);
        setLegalCards(data.legalCards || []);
        setSelectedCard(null);
        setMessage('Card played');
        // If server returned that round finished, update totals
        if (data.state?.phase === 'finished' || data.state?.phase === 'scoring') {
          const processedRaw = localStorage.getItem('jassProcessedGames');
          const processed: string[] = processedRaw ? JSON.parse(processedRaw) : [];
          if (gameId && !processed.includes(gameId)) updateTotalsFromGameState(data.state, data.players || [], gameId);
        }
      } else setMessage(data?.message || 'Invalid play');
    } catch (err) {
      setMessage('Error playing card');
    } finally {
      setIsLoading(false);
    }
  };

  const resetTotals = () => {
    localStorage.removeItem('jassTotals');
    localStorage.removeItem('jassProcessedGames');
    setTotals({});
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Swiss Jass <span style={{ marginLeft: 8 }}>🇨🇭 🧀🫕🏔️🐄🍫</span></div>
      <div style={styles.gameArea}>
        <div style={styles.message}>{message}</div>
        {/* Compact top info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 18, color: '#374151' }}>{T[lang].currentTrump}: <strong>{currentTrump ? `${suitSymbols[currentTrump] || ''} ${currentTrump}` : '—'}</strong></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{teamNames[1] || 'Team 1'}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#111827' }}>{gameState?.scores?.team1 ?? 0}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{teamNames[2] || 'Team 2'}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#111827' }}>{gameState?.scores?.team2 ?? 0}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={lang} onChange={e=>setLang(e.target.value as any)} style={{ padding:6, borderRadius:6 }} title="Language">
              <option value="en">🇺🇸 English</option>
              <option value="ch">🇨🇭 Schwiizerdütsch</option>
            </select>
          </div>
        </div>

        <div style={styles.controls}>
          <button style={styles.button} onClick={() => setTab('game')}>Game</button>
          <button style={styles.button} onClick={() => setTab('rankings')}>Rankings</button>
          <button style={styles.button} onClick={() => setTab('settings')}>Settings</button>
          <button style={styles.button} onClick={createGame} disabled={isLoading}>{gameId ? 'New Game' : 'Start Game'}</button>
          {gameId && <button style={styles.button} onClick={() => loadGameState(gameId)} disabled={isLoading}>Refresh</button>}
          {onLogout && <button style={{ ...styles.button, background: '#374151' }} onClick={onLogout}>Logout</button>}
        </div>

        {tab === 'game' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <div style={{ width: 800, height: 480, position: 'relative', background: '#f8fafc', borderRadius: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', padding: 12 }}>
              {/* North player (id 2) */}
              <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontWeight: '600', fontSize: 14, marginBottom: 2 }}>{players.find(p=>p.position==='north')?.name || 'North'} {winnerFlash?.id === (players.find(p=>p.position==='north')?.id) ? <span style={{ marginLeft:8, fontSize: '1.6rem', lineHeight: '1rem' }}>{winnerFlash?.emoji}</span> : null}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.2 }}>Karten: {players.find(p=>p.position==='north')?.hand?.length ?? 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.2, marginBottom: 4 }}>Mannschaft: {players.find(p=>p.position==='north')?.team ?? '-'}</div>
                <div style={{ marginTop: 8 }}>{renderTrickStack(players.find(p=>p.position==='north'))}</div>
              </div>

              {/* West player (id 1) */}
              <div style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontWeight: '600', fontSize: 14, marginBottom: 2 }}>{players.find(p=>p.position==='west')?.name || 'West'} {winnerFlash?.id === (players.find(p=>p.position==='west')?.id) ? <span style={{ marginLeft:8, fontSize: '1.6rem', lineHeight: '1rem' }}>{winnerFlash?.emoji}</span> : null}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.2 }}>Karten: {players.find(p=>p.position==='west')?.hand?.length ?? 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.2, marginBottom: 4 }}>Mannschaft: {players.find(p=>p.position==='west')?.team ?? '-'}</div>
                <div style={{ marginTop: 8 }}>{renderTrickStack(players.find(p=>p.position==='west'))}</div>
              </div>

              {/* East player (id 3) */}
              <div style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontWeight: '600', fontSize: 14, marginBottom: 2 }}>{players.find(p=>p.position==='east')?.name || 'East'} {winnerFlash?.id === (players.find(p=>p.position==='east')?.id) ? <span style={{ marginLeft:8, fontSize: '1.6rem', lineHeight: '1rem' }}>{winnerFlash?.emoji}</span> : null}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.2 }}>Karten: {players.find(p=>p.position==='east')?.hand?.length ?? 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.2, marginBottom: 4 }}>Mannschaft: {players.find(p=>p.position==='east')?.team ?? '-'}</div>
                <div style={{ marginTop: 8 }}>{renderTrickStack(players.find(p=>p.position==='east'))}</div>
              </div>

              {/* South player (human) */}
              <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontWeight: '700', fontSize: 14, marginBottom: 2 }}>{players.find(p=>p.position==='south')?.name || 'You'} {winnerFlash?.id === (players.find(p=>p.position==='south')?.id) ? <span style={{ marginLeft:8, fontSize: '1.6rem', lineHeight: '1rem' }}>{winnerFlash?.emoji}</span> : null}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.2 }}>Karten: {players.find(p=>p.position==='south')?.hand?.length ?? 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.2, marginBottom: 4 }}>Mannschaft: {players.find(p=>p.position==='south')?.team ?? '-'}</div>
                <div style={{ marginTop: 8 }}>{renderTrickStack(players.find(p=>p.position==='south'))}</div>
              </div>

              {/* Center trick area - show played cards near origin seat, pointing inward */}
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 360, height: 360 }}>
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  {/* If showing last trick at round end, render that first (override) */}
                  {showLastTrick && showLastTrick.length > 0 ? (
                    showLastTrick.map((c:any, i:number) => {
                      const seat = seatForId(c.playerId ?? i);
                      const posMap = {
                        south: { left: '50%', top: '82%', rot: 0 },
                        north: { left: '50%', top: '18%', rot: 180 },
                        west:  { left: '18%', top: '50%', rot: 90 },
                        east:  { left: '82%', top: '50%', rot: -90 },
                      };
                      const pos = posMap[seat] || { left: '50%', top: '50%', rot: 0 };
                      return (
                        <div key={c.id || i} style={{ position: 'absolute', left: pos.left, top: pos.top, transform: `translate(-50%,-50%) rotate(${pos.rot}deg)`, textAlign: 'center' as const }}>
                          <SwissCard card={c} />
                          <div style={{ fontSize: 11, color: '#374151' }}>{players.find(p=>p.id===c.playerId)?.name ?? 'Player'}</div>
                        </div>
                      );
                    })
                  ) : (
                    // Render current trick cards - show them during resolving so all 4 cards remain visible
                    !isAnimating && gameState?.currentTrick && gameState.currentTrick.length > 0 && (
                      gameState.currentTrick.map((c:any, i:number) => {
                        const seat = seatForId(c.playerId ?? i);
                          const posMap = {
                            south: { left: '50%', top: '82%', rot: 0 },
                            north: { left: '50%', top: '18%', rot: 180 },
                            west:  { left: '18%', top: '50%', rot: 90 },
                            east:  { left: '82%', top: '50%', rot: -90 },
                          };
                        const pos = posMap[seat] || { left: '50%', top: '50%', rot: 0 };
                        const isSwooping = animCards.findIndex((ac:any) => ac.id === c.id) !== -1;
                        const swoopStyle: React.CSSProperties = isSwooping && (animatingSwoop?.winnerId ?? null) !== null
                          ? { transition: 'transform 700ms ease, left 700ms ease, top 700ms ease', zIndex: 40 }
                          : {};
                        return (
                          <div key={c.id || i} style={{ position: 'absolute', left: pos.left, top: pos.top, transform: `translate(-50%,-50%) rotate(${pos.rot}deg)`, textAlign: 'center' as const, ...swoopStyle }}>
                            <SwissCard card={c} />
                            <div style={{ fontSize: 11, color: '#374151' }}>{players.find(p=>p.id===c.playerId)?.name ?? 'Player'}</div>
                          </div>
                        );
                      })
                      )
                    )}

                  {isAnimating && (
                    <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', color: '#6b7280' }}>Resolving...</div>
                  )}

                  {!gameState?.currentTrick?.length && !uiPendingResolve && !isAnimating && (
                    <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', color: '#6b7280' }}>No cards played</div>
                  )}
                </div>
    {/* team scores removed from center table to avoid duplication */}
              </div>
            </div>
          </div>
        )}

  {tab === 'game' && optionsVisible && (
          <div style={{ marginTop: 12 }}>
            <h4>Game Options</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label>Type:
                <select value={gameType} onChange={e=>setGameType(e.target.value)} style={{ marginLeft: 8 }}>
                  <option value="schieber">Schieber</option>
                </select>
              </label>
              <label style={{ marginLeft: 12 }}>Dialect:
                <select value={dialect} onChange={e=>setDialect(e.target.value as any)} style={{ marginLeft: 8 }}>
                  <option value="zurich">Züridütsch</option>
                  <option value="grisons">Bündnerdütsch</option>
                  <option value="lucerne">Luzernerdütsch</option>
                </select>
              </label>
              <label style={{ marginLeft: 12 }}>Team 1 name:
                <input value={teamNames[1]} onChange={e=>setTeamNames(s=>({...s,1:e.target.value}))} style={{ marginLeft: 8 }} />
              </label>
              <label style={{ marginLeft: 12 }}>Team 2 name:
                <input value={teamNames[2]} onChange={e=>setTeamNames(s=>({...s,2:e.target.value}))} style={{ marginLeft: 8 }} />
              </label>
              <label style={{ marginLeft: 12 }}>Max Points:
                <input type="number" value={maxPoints} onChange={e=>setMaxPoints(Number(e.target.value))} style={{ marginLeft: 8, width: 100 }} />
              </label>
              <button style={styles.button} onClick={startLocalGameWithOptions}>{T[lang].launchLocal}</button>
              <button style={styles.button} onClick={() => createGameWithOptions({ gameType, maxPoints })}>{T[lang].launchServer}</button>
            </div>
          </div>
        )}

        {tab === 'rankings' && (
          <div style={{ marginTop: 8 }}>
            <h3>Player Rankings & Statistics</h3>
            <div style={{ marginBottom: 8 }}>
              <button style={styles.button} onClick={() => { setTab('game'); }}>Back to Game</button>
              <button style={{ ...styles.button, background: '#ef4444', marginLeft: 8 }} onClick={resetTotals}>Reset Totals</button>
            </div>
            
            {/* Enhanced Statistics Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ background: '#f3f4f6', padding: 12, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>🏆 Total Points Rankings</h4>
                {usersList.length > 0 ? (
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {usersList.sort((a,b) => b.totalPoints - a.totalPoints).map((u, idx) => (
                      <li key={u.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: idx === 0 ? '700' : '500', color: idx === 0 ? '#059669' : '#374151' }}>
                          {u.username}: {u.totalPoints} pts
                        </span>
                        {idx === 0 && <span style={{ marginLeft: 8, fontSize: '1.2rem' }}>👑</span>}
                      </li>
                    ))}
                  </ol>
                ) : Object.keys(totals).length === 0 ? (
                  <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No games played yet. Start playing to see rankings!</div>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {Object.entries(totals).sort((a,b) => b[1]-a[1]).map(([name, pts], idx) => (
                      <li key={name} style={{ marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: idx === 0 ? '700' : '500', color: idx === 0 ? '#059669' : '#374151' }}>
                          {name}: {pts} pts
                        </span>
                        {idx === 0 && <span style={{ marginLeft: 8, fontSize: '1.2rem' }}>👑</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              
              <div style={{ background: '#e0f2fe', padding: 12, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e' }}>📊 Game Statistics</h4>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <div><strong>Games Played:</strong> {localStorage.getItem('jassProcessedGames') ? JSON.parse(localStorage.getItem('jassProcessedGames')!).length : 0}</div>
                  <div><strong>Average Score:</strong> {Object.keys(totals).length > 0 ? Math.round(Object.values(totals).reduce((a,b) => a+b, 0) / Object.keys(totals).length) : 0} pts</div>
                  <div><strong>Highest Score:</strong> {Object.keys(totals).length > 0 ? Math.max(...Object.values(totals)) : 0} pts</div>
                  <div><strong>Total Points Awarded:</strong> {Object.values(totals).reduce((a,b) => a+b, 0)} pts</div>
                </div>
              </div>
            </div>
            
            <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#166534' }}>🎯 Swiss Jass Mastery Tips</h4>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#374151' }}>
                <div>• <strong>Weis Strategy:</strong> Save sequences and four-of-a-kinds for trump selection advantage</div>
                <div>• <strong>Trump Selection:</strong> Choose wisely - your team's Weis only counts if you have the best!</div>
                <div>• <strong>Team Play:</strong> Coordinate with your partner - if they're winning a trick, play low to conserve good cards</div>
                <div>• <strong>Last Trick Bonus:</strong> Remember the +5 points for winning the final trick!</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ marginTop: 8 }}>
            <h3>Settings</h3>
            <div style={{ marginTop: 8 }}>
              <label>Delete User: </label>
              <select id="delete-user-select" style={{ marginLeft: 8 }}>
                <option value="">-- Select user --</option>
                {usersList.map(u => <option key={u.id} value={u.id}>{u.username} ({u.totalPoints} pts)</option>)}
              </select>
              <button style={{ ...styles.button, marginLeft: 8 }} onClick={async () => {
                const sel = (document.getElementById('delete-user-select') as HTMLSelectElement).value;
                if (!sel) return setMessage('Select a user to delete');
                try {
                  const res = await fetch(`${API_URL}/api/admin/users/${sel}`, { method: 'DELETE' });
                  const d = await res.json();
                  setMessage(d?.message || 'Deleted');
                  // refresh list
                  const r2 = await fetch(`${API_URL}/api/admin/users`);
                  const j2 = await r2.json();
                  if (j2?.success) setUsersList(j2.users || []);
                } catch (e) { setMessage('Failed to delete user'); }
              }}>Delete</button>
            </div>
          </div>
        )}

        {/* Hand */}
        <div>
          <h3>{T[lang].yourHand}</h3>
          <div style={styles.hand}>
            {hand.length ? sortHandForDisplay(hand, chosenTrump).map(card => (
              <div key={card.id} onClick={() => setSelectedCard(card.id)} onDoubleClick={() => { if (isLocal) playLocalCard(card.id); else playCard(card.id); }}>
                <SwissCard card={card} isSelected={selectedCard === card.id} isPlayable={legalCards.some((c: any) => c.id === card.id)} />
              </div>
            )) : <div style={{ color: '#6b7280' }}>No cards</div>}
          </div>
        </div>

        {/* Simple trump selector if phase requests it */}
        {gameState?.phase === 'trump_selection' && (
          <div style={{ marginTop: 12 }}>
            <h4>Select Trump - Current Player: {players.find(p => p.id === gameState.currentPlayer)?.name || `Player ${gameState.currentPlayer}`}</h4>
            <div style={{ marginBottom: 8, fontSize: 14, color: '#374151' }}>
              Dealer: {players.find(p => p.id === gameState.dealer)?.name || `Player ${gameState.dealer}`} • 
              Trump Selector: {players.find(p => p.id === gameState.currentPlayer)?.name || `Player ${gameState.currentPlayer}`}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {['eicheln', 'schellen', 'rosen', 'schilten', 'obenabe', 'undenufe'].map(t => (
                <button key={t} style={{ ...styles.button, border: chosenTrump===t ? '2px solid #000' : undefined }} onClick={() => { setChosenTrump(t); setMessage(`Selected trump ${t}`); }}>
                  {t === 'obenabe' ? 'Obenabe' : t === 'undenufe' ? 'Undenufe' : `${suitSymbols[t]} ${t}`}
                </button>
              ))}
              <button style={{ ...styles.button, background: '#6b7280' }} onClick={() => { setChosenTrump('schieben'); setMessage('Passed trump decision to partner (Schieben)'); }}>
                🔄 Schieben (Pass)
              </button>
              <button style={styles.button} onClick={submitTrump}>Submit Trump</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
              In Schieber Jass, you can "schieben" (pass) the trump decision to your partner if you have a mediocre hand.
            </div>
          </div>
        )}

        {/* Display Weis (melds) after trump has been selected */}
        {gameState?.weis && Object.keys(gameState.weis).length > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#0c4a6e' }}>🎯 Detected Weis (Melds)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 8 }}>
              {Object.entries(gameState.weis).map(([playerId, weis]) => {
                const player = players.find(p => p.id === parseInt(playerId));
                if (!weis || weis.length === 0) return null;
                
                return (
                  <div key={playerId} style={{ padding: 8, background: 'white', borderRadius: 6, border: '1px solid #e0e7ff' }}>
                    <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: 4 }}>
                      {player?.name || `Player ${playerId}`} (Team {player?.team || '?'})
                    </div>
                    {weis.map((w: any, idx: number) => (
                      <div key={idx} style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>
                        <span style={{ fontWeight: '500', color: '#059669' }}>{w.points}pts</span> - {w.description}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Victory Celebration Modal */}
        {matchFinished && gameState?.phase === 'finished' && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.5s ease-in-out'
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
              padding: 32, borderRadius: 16, textAlign: 'center', maxWidth: 500,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '3px solid #f59e0b',
              animation: 'bounceIn 0.6s ease-out'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: 16, animation: 'pulse 2s infinite' }}>🏆</div>
              <h2 style={{ margin: '0 0 16px 0', color: '#92400e', fontSize: '2rem', fontWeight: '800' }}>
                {gameState.scores!.team1 > gameState.scores!.team2 ? 'Team 1 Wins!' : 'Team 2 Wins!'}
              </h2>
              <div style={{ fontSize: '1.2rem', marginBottom: 20, color: '#451a03' }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Final Score:</strong> Team 1: {gameState.scores!.team1} - Team 2: {gameState.scores!.team2}
                </div>
                <div style={{ fontSize: '1rem', color: '#78716c' }}>
                  Victory achieved in authentic Swiss Jass style! 🇨🇭
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button 
                  style={{ 
                    ...styles.button, 
                    background: '#059669', color: 'white', 
                    padding: '12px 24px', fontSize: '1rem', fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)'
                  }} 
                  onClick={() => { setMatchFinished(false); createGame(); }}
                >
                  🎮 Play Again
                </button>
                <button 
                  style={{ 
                    ...styles.button, 
                    background: '#dc2626', color: 'white',
                    padding: '12px 24px', fontSize: '1rem', fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(220,38,38,0.3)'
                  }} 
                  onClick={() => { setMatchFinished(false); setTab('rankings'); }}
                >
                  📊 View Rankings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom info: Scoring details + Music player as two columns */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
          <div style={{ background: '#fffaf0', border: '1px solid #fde2b6', padding: 12, borderRadius: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Scoring Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 14 }}>
              <div><strong>Non-trump</strong></div><div></div>
              <div>A</div><div>11 pts</div>
              <div>10</div><div>10 pts</div>
              <div>K</div><div>4 pts</div>
              <div>O</div><div>3 pts</div>
              <div>U</div><div>2 pts</div>
              <div>9/8/7/6</div><div>0 pts</div>
              <div style={{ marginTop: 6 }}><strong>Trump</strong></div><div></div>
              <div>U (Unter)</div><div>20 pts</div>
              <div>9</div><div>14 pts</div>
              <div>A</div><div>11 pts</div>
              <div>10</div><div>10 pts</div>
              <div>K</div><div>4 pts</div>
              <div>O</div><div>3 pts</div>
              <div>8/7/6</div><div>0 pts</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>
              Winner of trick becomes next starter. Last trick awards +5 bonus points. Total per round: 157 points (152 + 5).
            </div>
          </div>

          <div style={{ width: 320 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Mountain Music Playlist</div>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb', padding: 8, background: '#fff' }}>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <button style={{ ...styles.button, background:'#374151' }} onClick={() => ytRef.current?.prev()}>Prev</button>
                <button style={{ ...styles.button, background:'#059669' }} onClick={() => ytRef.current?.play()}>Play</button>
                <button style={{ ...styles.button, background:'#ef4444' }} onClick={() => ytRef.current?.pause()}>Pause</button>
                <button style={{ ...styles.button, background:'#111827' }} onClick={() => ytRef.current?.next()}>Next</button>
              </div>
              <div style={{ borderRadius: 6, overflow: 'hidden' }}>
                <YouTubePlayer ref={ytRef} playlistId={'PL4-gXKkSsfQpRt16x8SUGSz6wLk2Lyxdp'} width={320} height={200} autoplay={true} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JassGame;
