import React, { useEffect, useState, useRef } from 'react';
import logo from './assets/logo.png';
import { SwissCard } from './SwissCard';
import * as Schieber from './engine/schieber';
import YouTubePlayer from './YouTubePlayer';
import { API_URL } from './config';
import { io, Socket } from 'socket.io-client';

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
  'oben-abe': '⬆️',
  'unden-ufe': '⬇️'
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { fontFamily: '"Helvetica Neue", "Arial", sans-serif', minHeight: '100vh', background: '#f5f2e8', paddingBottom: 40 },
  header: { background: '#D42E2C', color: 'white', padding: '1rem 1rem', textAlign: 'center' as const, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  gameArea: { maxWidth: 1200, margin: '2rem auto', background: 'rgba(255, 255, 255, 0.8)', borderRadius: 20, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.05)' },
  controls: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const, justifyContent: 'center' },
  button: { 
    background: '#1A7A4C', 
    color: 'white', 
    border: 'none', 
    padding: '10px 18px', 
    borderRadius: 8, 
    cursor: 'pointer', 
    fontWeight: 600, 
    fontSize: 14,
    boxShadow: '0 2px 8px rgba(26, 122, 76, 0.3)',
    transition: 'all 0.2s ease'
  },
  message: { textAlign: 'center' as const, marginBottom: 16, fontSize: 16, fontWeight: 600, color: '#3a2e20', padding: '12px 16px', background: 'rgba(255,255,255,0.7)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)' },
  hand: { display: 'flex', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'center', padding: '12px 8px' },
  table: { padding: 14, background: 'rgba(25, 122, 76, 0.1)', borderRadius: 10, minHeight: 140, marginBottom: 12 },
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
  const [lang, setLang] = useState<'en'|'ch'>('ch');

  const T: Record<string, Record<string,string>> = {
    en: {
  welcome: 'Welcome to Swiss Jass!',
  noCardsPlayed: 'No cards played',
  weisPoints: 'Weis points',
  weisNotCount: '(does not count)',
  weisRulesTitle: 'Weis Rules',
  weisRulesDesc: 'Only the team with the best Weis scores points. Weis are declared during the first trick and are detected automatically after trump is chosen.',
      currentTrump: 'Current Trump',
      roundScores: 'Round — Team1',
      yourHand: 'Your Hand',
      launchLocal: 'Launch Local Game',
      launchServer: 'Launch Server Game',
      selectTrump: 'Select Trump',
      submitTrump: 'Submit Trump',
      scoringDetails: 'Scoring Details',
      musicPlaylist: 'Mountain Music Playlist',
      cards: 'Cards',
      team: 'Team',
      tricks: 'Tricks',
      game: 'Game',
      rankings: 'Rankings',
      settings: 'Settings',
      startGame: 'Start Game',
      newGame: 'New Game',
      refresh: 'Refresh',
      logout: 'Logout',
      chooseTeam: 'Choose Team',
      dealer: 'Dealer',
      trumpSelector: 'Trump Selector',
      itsYourTurn: "It's your turn",
      matchFinished: 'Match finished — start a new game to continue',
      pleaseChooseTrump: 'Please choose trump',
  playAgain: 'Play Again',
  backToGame: 'Back to Game',
  profile: 'Profile',
  changePassword: 'Change Password',
  username: 'Username',
  newPassword: 'New password',
  savePassword: 'Save Password'
    },
    ch: {
  welcome: 'Willkomme bi Swiss Jass!',
  noCardsPlayed: 'Keini Chart gspielt',
  weisPoints: 'Weis Punkt',
  weisNotCount: '(zählt nicht)',
  weisRulesTitle: 'Weis Regle',
  weisRulesDesc: 'Nur d Team mit em bestä Weis kassiert Punkt. Weis wärend em erschte Stich angekündigt und werdet automatisch nach Trump-Auswahl entdeckt.',
      currentTrump: 'Trump jetzt',
      roundScores: 'Rundi — Team1',
      yourHand: 'Dini Chart',
      launchLocal: 'Lokal starte',
      launchServer: 'Server starte',
      selectTrump: 'Trump wähle',
      submitTrump: 'Trump bestätigt',
      scoringDetails: 'Punktetabelle',
      musicPlaylist: 'Bärgmusig Playlist',
      cards: 'Charte',
      team: 'Mannschaft',
      tricks: 'Stich',
      game: 'Spiel',
      rankings: 'Rangliste',
      settings: 'Iistellige',
      startGame: 'Spiel starte',
      newGame: 'Neus Spiel',
      refresh: 'Aktualisiere',
      logout: 'Abmelde',
      chooseTeam: 'Mannschaft wähle',
      dealer: 'Gäber',
      trumpSelector: 'Trump-Wähler',
      itsYourTurn: 'Du bisch dra',
      matchFinished: 'Spiel fertig — start es neus Spiel',
      pleaseChooseTrump: 'Bitte wähl en Trump',
  playAgain: 'Nomol spiele',
  backToGame: 'Zrugg zum Spiel',
  profile: 'Profil',
  changePassword: 'Passwort ändere',
  username: 'Benutzername',
  newPassword: 'Neus Passwort',
  savePassword: 'Speichere'
    }
  };
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hand, setHand] = useState<any[]>([]);
  const [legalCards, setLegalCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [message, setMessage] = useState(T[lang].welcome);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<'game'|'rankings'|'settings'|'profile'|'tables'|'friends'>('game');
  const [usersList, setUsersList] = useState<Array<{ id: string; username: string; totalPoints: number; totalWins?: number; totalGames?: number }>>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; username: string; totalWins: number; totalGames: number; totalPoints: number; winRate: number }>>([]);
  const [totals, setTotals] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('jassTotals');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  // richer local user store: name -> { totalPoints, gamesPlayed, wins, lastSeen, passwordHash }
  const [jassUsers, setJassUsers] = useState<Record<string, any>>(() => {
    try { return JSON.parse(localStorage.getItem('jassUsers') || '{}'); } catch { return {}; }
  });
  const [gameType, setGameType] = useState<string>('schieber');
  const [maxPoints, setMaxPoints] = useState<number>(1000);
  const [isLocal, setIsLocal] = useState<boolean>(false);
  const [chosenTrump, setChosenTrump] = useState<string | null>(null);
  const [playDelayMs, setPlayDelayMs] = useState<number>(450);
  const [animatingSwoop, setAnimatingSwoop] = useState<{ winnerId: number | null; cards: any[] } | null>(null);
  const [uiPendingResolve, setUiPendingResolve] = useState(false);
  // Recovery helpers to avoid dead-end states
  const prevPlayerRef = useRef<number | null>(null);
  const lastProgressAt = useRef<number>(Date.now());
  const centerRef = useRef<HTMLDivElement | null>(null);
  const seatRefs = {
    south: useRef<HTMLDivElement | null>(null),
    north: useRef<HTMLDivElement | null>(null),
    west: useRef<HTMLDivElement | null>(null),
    east: useRef<HTMLDivElement | null>(null),
  };
  const [animPositions, setAnimPositions] = useState<Record<string, { left:number; top:number; rot:number }> | null>(null);
  // dialect selection removed - translations handled via `lang` ('en'|'ch')
  const [teamNames, setTeamNames] = useState<{1:string;2:string}>(() => ({ 1: 'Team 1', 2: 'Team 2' }));
  const [optionsVisible, setOptionsVisible] = useState(true);

  // simplify optional checks used in JSX
  const animCards = animatingSwoop?.cards ?? [];
  const isAnimating = Boolean(animatingSwoop);
  const [winnerFlash, setWinnerFlash] = useState<{ id: number; emoji: string } | null>(null);
  const headerEmojis = ['🇨🇭','🧀','🫕','🏔️','🐄','🍫'];
  const [showLastTrick, setShowLastTrick] = useState<(any[] ) | null>(null);
  const [matchFinished, setMatchFinished] = useState<boolean>(false);
  const [currentUserName, setCurrentUserName] = useState<string>(user?.username || 'You');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // multiplayer state
  const [mode, setMode] = useState<'single'|'multi'>('single');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [tables, setTables] = useState<any[]>([]);
  const [creatingTable, setCreatingTable] = useState(false);
  const [joiningTableId, setJoiningTableId] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');
  const [friendsTabData, setFriendsTabData] = useState<{friends:any[]; requests:any[]}>({ friends: [], requests: [] });
  const [friendsLoading, setFriendsLoading] = useState(false);
  const authToken = useRef<string | null>(null);
  const startTableEarly = async (id: string) => {
    if (!authToken.current) return;
    try {
      await fetch(`${API_URL}/api/tables/${id}/start`, { method: 'POST', headers: { Authorization: `Bearer ${authToken.current}` }});
      fetchTables();
    } catch {}
  };

  // simple SHA-256 helper for local password hashing
  async function sha256(text: string) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  const handleChangePassword = async () => {
    if (!currentUserName) return setProfileMessage('No user');
    if (!newPasswordInput || newPasswordInput.length < 6) return setProfileMessage('Password must be at least 6 chars');
    const h = await sha256(newPasswordInput);
    const users = { ...jassUsers };
    if (!users[currentUserName]) users[currentUserName] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
    users[currentUserName].passwordHash = h;
    localStorage.setItem('jassUsers', JSON.stringify(users));
    setJassUsers(users);
    setProfileMessage('Password updated locally');
    setNewPasswordInput('');
    setTimeout(()=>setProfileMessage(null), 3000);
  };
  const [roundStarter, setRoundStarter] = useState(0);
  const [roundHistory, setRoundHistory] = useState<Array<{round: number, team1: number, team2: number, trump: string}>>([]);
  const [weisWinner, setWeisWinner] = useState<{playerId: number, teamId: number} | null>(null);
  const [weisCompetition, setWeisCompetition] = useState<{active: boolean, currentPlayer: number, bestWeis: any, declarations: any[]}>({
    active: false, currentPlayer: 0, bestWeis: null, declarations: []
  });
  // helper: map engine player id to a seat around the table
  const seatForId = (id: number) => {
    const seats = ['south', 'west', 'north', 'east'];
    return seats[id] || 'south';
  };
  const mapPlayersWithSeats = (pls: any[]) => (pls || []).map(p => {
    // Normalize tricks array: engine-local uses p.tricks (array of cards).
    // Server may not include p.tricks; try to infer from gameState.playedTricks or stored local state.
    let tricksArr = (p as any).tricks || [];

    // If no tricks on player object, try to recover from current gameState (server payload)
    if ((!tricksArr || tricksArr.length === 0) && (gameState as any)?.playedTricks) {
      try {
        const played = (gameState as any).playedTricks as any[];
        if (Array.isArray(played)) {
          // Flatten and pick cards belonging to this player id
          const flat = played.flatMap(x => Array.isArray(x) ? x : []);
          tricksArr = flat.filter(c => c.playerId === p.id).map(c => ({ id: c.id, suit: c.suit, rank: c.rank }));
        }
      } catch (e) {
        // ignore
      }
    }

    // As a last resort, try localStorage jassLocalState (for local play persisted state)
    if ((!tricksArr || tricksArr.length === 0)) {
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

    return { id: p.id, name: p.name, hand: p.hand, team: p.team, teamName: teamNames[p.team] || `Team ${p.team}`, position: seatForId(p.id), points: (p as any).points, tricks: tricksArr || [], weis: (p as any).weis || [] };
  });

  const seatPlayer = (pos: string) => players.find(p => p.position === pos);
  const northPlayer = seatPlayer('north');
  const westPlayer = seatPlayer('west');
  const eastPlayer = seatPlayer('east');
  const southPlayer = seatPlayer('south');

  function sortHandForDisplay(hand: any[], trump?: string|null) {
    if (!hand || !hand.length) return hand.slice();
    const trumpSuit = trump || null;
    
    // Swiss Jass trump order: U(Jack)=20, 9=14, A=11, 10=10, K=4, O(Queen)=3, 8=0, 7=0, 6=0
    // Normal order: A=11, 10=10, K=4, O=3, U=2, 9=0, 8=0, 7=0, 6=0
    const normalRankOrder = ['6','7','8','9','10','U','O','K','A'];
    const trumpRankOrder = ['6','7','8','O','K','10','A','9','U']; // Proper Swiss trump order (best to worst)
    
    const normalCards = hand.filter(c => c.suit !== trumpSuit);
    const trumpCards = hand.filter(c => c.suit === trumpSuit);
    
    // Sort normal cards by suit, then by rank
    normalCards.sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return normalRankOrder.indexOf(a.rank) - normalRankOrder.indexOf(b.rank);
    });
    
    // Sort trump cards by proper Swiss trump value (highest first for easy selection)
    trumpCards.sort((a, b) => {
      return trumpRankOrder.indexOf(b.rank) - trumpRankOrder.indexOf(a.rank);
    });
    
    return [...normalCards, ...trumpCards];
  }

  function renderTrickStack(p: any) {
    // Count actual tricks won (every 4 cards = 1 trick)
    const tricksWon = Math.floor((p?.tricks?.length || 0) / 4);
    const stack = [] as any[];
    for (let i = 0; i < Math.min(tricksWon, 4); i++) stack.push(i);
    
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ position: 'relative', width: 24, height: 32 }}>
          {stack.map((s, i) => (
            <div key={i} style={{ 
              position: 'absolute', 
              left: i * 1.5, 
              top: -i * 1, 
              width: 24, 
              height: 32, 
              background: '#111827', 
              borderRadius: 2, 
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)', 
              opacity: 0.9 
            }} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#4b5563', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: '600' }}>
          {tricksWon} {T[lang].tricks}
        </div>
      </div>
    );
  }

  // Compact tricks count for inline display
  function getTricksCount(p: any) {
    return Math.floor((p?.tricks?.length || 0) / 4);
  }

  // Explain why a card is not playable for UI tooltips
  function notPlayableReason(card: any): string | null {
    try {
      // If no game or no trick in progress, no reason
      if (!gameState) return null;
      const trick = (gameState.currentTrick || []);
      if (!trick || trick.length === 0) return null;
      const leadSuit = trick[0].suit;
      const handCards = hand || [];
      const hasLeadSuit = handCards.some((h:any) => h.suit === leadSuit);
      // If player has lead suit but card isn't of that suit -> must follow suit
      if (hasLeadSuit && card.suit !== leadSuit) return T[lang].pleaseChooseTrump ? 'Must follow suit' : 'Must follow suit';
      // If player has lead suit and this card is of that suit but not in legalCards -> must beat current winner
      if (hasLeadSuit && card.suit === leadSuit && !legalCards.some((c:any) => c.id === card.id)) return 'Must beat current winning card (Stichzwang)';
      // If no lead suit but a suit-trump exists and player has trumps, require trump
      const suitTrump = gameState.trumpSuit && ['eicheln','schellen','rosen','schilten'].includes(gameState.trumpSuit) ? gameState.trumpSuit : null;
      if (!hasLeadSuit && suitTrump) {
        const hasTrump = handCards.some((h:any) => h.suit === suitTrump);
        if (hasTrump && card.suit !== suitTrump) return 'Must play trump when void in lead suit';
      }
      return 'Card not legal right now';
    } catch (e) { return null; }
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
  // Totals are updated once by the end-of-round flow (botsTakeTurns) using updateTotalsFromGameState.
  // Do not update totals here to avoid double-counting when the same finished state is processed elsewhere.
        // if maxPoints reached by either team, stop; else start a fresh local round
        const t1 = newSt.scores.team1 || 0; const t2 = newSt.scores.team2 || 0;
        if (t1 >= maxPoints || t2 >= maxPoints) {
          setMessage('Match finished — max points reached');
          // mark match finished and update state so UI can react
          setMatchFinished(true);
          setGameState({ phase: 'finished', currentPlayer: newSt.currentPlayer, trumpSuit: newSt.trump || null, currentTrick: newSt.currentTrick || [], scores: newSt.scores });
          
          // Update backend stats if this is an online game
          if (gameId && API_URL) {
            const userTeam = newSt.players.find(p => p.id === 0)?.team || 1; // User is player 0
            const userTeamScore = userTeam === 1 ? t1 : t2;
            const opponentTeamScore = userTeam === 1 ? t2 : t1;
            const userWon = userTeamScore > opponentTeamScore;
            
            // Count total rounds played (rough estimate based on score progression)
            const totalRounds = Math.floor((userTeamScore + opponentTeamScore) / 100) + 1;
            
            completeGame(userTeamScore, opponentTeamScore, userWon, totalRounds);
          }
        } else {
          // start a new hand (fresh deal) keeping totals and rotating dealer
          const fresh = Schieber.startNewHand(newSt);
          saveLocalState(fresh);
          setPlayers(mapPlayersWithSeats(fresh.players));
          setGameState({ phase: fresh.phase, currentPlayer: fresh.currentPlayer, trumpSuit: fresh.trump || null, currentTrick: fresh.currentTrick || [], scores: fresh.scores, dealer: fresh.dealer });
          setHand(fresh.players.find(p=>p.id===0)?.hand || []);
          setLegalCards(Schieber.getLegalCardsForPlayer(fresh, 0));
          // If the new dealer isn't the human (player 0), immediately let bots proceed to choose trump
          if (fresh.currentPlayer !== 0) {
            setTimeout(() => { botsTakeTurns(); }, 150);
            setMessage(`Waiting for ${fresh.players.find(p=>p.id===fresh.currentPlayer)?.name || 'dealer'} to choose trump...`);
          } else {
            setMessage('Your turn to choose trump');
          }
        }
      }
      return newSt;
    } finally {
      setWinnerFlash(null);
      setAnimatingSwoop(null);
    }
  }

  // Helper to render a prominent dealer badge and animated winner emoji
  const renderPlayerBadge = (playerId?: number) => {
    const isDealer = gameState?.dealer === playerId;
    const isWinner = winnerFlash?.id === playerId;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: isDealer ? 'linear-gradient(90deg,#fde68a,#fca5a5)' : 'transparent', padding: isDealer ? '6px 10px' : '2px 6px', borderRadius: 14, boxShadow: isDealer ? '0 6px 18px rgba(0,0,0,0.12)' : 'none', border: isDealer ? '2px solid rgba(0,0,0,0.06)' : '1px dashed rgba(0,0,0,0.04)', opacity: isDealer ? 1 : 0.6 }}>
          <span style={{ fontWeight: 800, color: isDealer ? '#7c2d12' : '#6b7280', fontSize: 12 }}>{T[lang].dealer}</span>
          <span style={{ fontSize: 18 }}>{isDealer ? '🎩' : ' '}</span>
        </div>
        {isWinner && winnerFlash && (
          <span style={{ fontSize: 28, lineHeight: 1, display: 'inline-block', animation: 'bounceIn 550ms ease, pulse 1200ms infinite', transformOrigin: 'center' }}>{winnerFlash.emoji}</span>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (gameId) loadGameState(gameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // When the user switches back to the Game tab, try to restore any running game.
  // If none is running, show the game options/start UI so user can begin a new match.
  useEffect(() => {
    if (tab !== 'game') return;

    // If a server-backed game is active, reload it
    if (gameId && !isLocal) {
      loadGameState(gameId);
      setOptionsVisible(false);
      return;
    }

    // Try to resume a local game from localStorage
    const st = loadLocalState();
    if (st) {
      // If the stored local game already finished, start a fresh hand instead of resuming finished state
      if (st.phase === 'finished') {
        const fresh = Schieber.startNewHand(st);
        saveLocalState(fresh);
        setPlayers(mapPlayersWithSeats(fresh.players));
        setGameState({ phase: fresh.phase, currentPlayer: fresh.currentPlayer, trumpSuit: fresh.trump || null, currentTrick: fresh.currentTrick || [], scores: fresh.scores, dealer: fresh.dealer });
        setHand(fresh.players.find((p: any) => p.id === 0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(fresh, 0));
        setOptionsVisible(false);
        setIsLocal(true);
        setMessage('Previous match finished — new round started');
        return;
      }

      setGameState({ phase: st.phase, currentPlayer: st.currentPlayer, trumpSuit: st.trump || null, currentTrick: st.currentTrick || [], scores: st.scores, dealer: st.dealer, weis: st.weis });
      setPlayers(mapPlayersWithSeats(st.players));
      setHand(st.players.find((p: any) => p.id === 0)?.hand || []);
      setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
      setOptionsVisible(false);
      setIsLocal(true);
      setMessage('Resumed local game');
      return;
    }

    // No active game: show options to start a new one and clear transient UI state
    setOptionsVisible(true);
    setGameState(null);
    setPlayers([]);
    setHand([]);
    setLegalCards([]);
    setChosenTrump(null);
    setUiPendingResolve(false);
    setMessage('No active game — start a new one');
  }, [tab]);

  // Watchdog: detect stalled local games or UI pending states and recover.
  useEffect(() => {
    const id = setInterval(() => {
      try {
        // If UI is waiting for a pending resolve for too long, force resolve by calling resolveTrick
        if (uiPendingResolve) {
          const st = loadLocalState();
          if (st && st.pendingResolve) {
            const age = Date.now() - ((st as any)._lastActionAt || Date.now());
            if (age > 8000) {
              // Force a resolveTrick to advance the game
              const resolved = Schieber.resolveTrick(st);
              saveLocalState(resolved);
              setGameState({ phase: resolved.phase, currentPlayer: resolved.currentPlayer, trumpSuit: resolved.trump || null, currentTrick: resolved.currentTrick || [], scores: resolved.scores });
              setPlayers(mapPlayersWithSeats(resolved.players));
              setHand(resolved.players.find((p:any)=>p.id===0)?.hand || []);
              setLegalCards(Schieber.getLegalCardsForPlayer(resolved, 0));
              setUiPendingResolve(false);
              setMessage('Auto-resolved stalled trick');
            }
          }
        }

        // If no visible progress (player didn't change) for long, attempt gentle auto-recovery then hint
        const st = loadLocalState();
        if (st) {
          const now = Date.now();
          if (prevPlayerRef.current !== st.currentPlayer) {
            prevPlayerRef.current = st.currentPlayer;
            lastProgressAt.current = now;
          } else {
            const idleMs = now - lastProgressAt.current;
            if (idleMs > 15000) {
              // Attempt auto-play if it's a bot's turn and not waiting on user
              if (st.currentPlayer !== 0 && st.phase === 'playing' && !st.pendingResolve) {
                try {
                  const pick = Schieber.chooseBotCard(st, st.currentPlayer);
                  if (pick) {
                    const progressed = Schieber.playCardLocal(st, st.currentPlayer, pick);
                    saveLocalState(progressed);
                    setGameState({ phase: progressed.phase, currentPlayer: progressed.currentPlayer, trumpSuit: progressed.trump || null, currentTrick: progressed.currentTrick || [], scores: progressed.scores });
                    setPlayers(mapPlayersWithSeats(progressed.players));
                    setHand(progressed.players.find((p:any)=>p.id===0)?.hand || []);
                    setLegalCards(Schieber.getLegalCardsForPlayer(progressed, 0));
                    lastProgressAt.current = Date.now();
                    return; // skip message if we advanced
                  }
                } catch {}
              }
              // If trick is stuck with 4 cards but not resolved
              if ((st.currentTrick?.length || 0) === 4 && !st.pendingResolve) {
                try {
                  const resolved = Schieber.resolveTrick(st);
                  saveLocalState(resolved);
                  setGameState({ phase: resolved.phase, currentPlayer: resolved.currentPlayer, trumpSuit: resolved.trump || null, currentTrick: resolved.currentTrick || [], scores: resolved.scores });
                  setPlayers(mapPlayersWithSeats(resolved.players));
                  setHand(resolved.players.find((p:any)=>p.id===0)?.hand || []);
                  setLegalCards(Schieber.getLegalCardsForPlayer(resolved, 0));
                  lastProgressAt.current = Date.now();
                  return;
                } catch {}
              }
              if (idleMs > 20000) {
                setMessage('Game appears idle — you can Force Resume or Reset Local to recover');
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }, 2500);
    return () => clearInterval(id);
  }, [uiPendingResolve]);

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

  // Fetch leaderboard when rankings tab is opened
  useEffect(() => {
    if (tab === 'rankings' && API_URL) {
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/admin/leaderboard`);
          const j = await res.json();
          if (j?.success && Array.isArray(j.leaderboard)) setLeaderboard(j.leaderboard);
        } catch (e) { /* ignore */ }
      })();
    }
  }, [tab]);

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

  // Complete game and update user stats on backend
  const completeGame = async (userTeamScore: number, opponentTeamScore: number, userWon: boolean, totalRounds: number) => {
    if (!gameId || !API_URL) return; // Only for backend games

    try {
      // App stores the JWT under `jassToken`
      const token = localStorage.getItem('jassToken');
      const res = await fetch(`${API_URL}/api/games/${gameId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userTeamScore,
          opponentTeamScore,
          userWon,
          totalRounds
        })
      });

      const data = await res.json();
      if (data?.success) {
        console.log(`Game completed: ${data.message}`);
        if (data.pointsEarned > 0) {
          setMessage(`${data.message} (+${data.pointsEarned} points)`);
        }
        // Refresh server user list so Rankings reflects updated totals
        try {
          const r2 = await fetch(`${API_URL}/api/admin/users`);
          const d2 = await r2.json();
          if (d2?.success) setUsersList(d2.users || []);
        } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.error('Failed to complete game:', err);
    }
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
  saveLocalState(st);
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
      const parsed = JSON.parse(raw) as Schieber.State & { _lastActionAt?: number };
      // Backfill missing timestamp to avoid huge age values
      if (!parsed._lastActionAt) parsed._lastActionAt = Date.now();
      return parsed as Schieber.State;
    } catch { return null; }
  };

  const saveLocalState = (st: Schieber.State) => {
    try {
      // annotate with last action timestamp used by UI watchdog
      try { (st as any)._lastActionAt = Date.now(); } catch (e) {}
      localStorage.setItem('jassLocalState', JSON.stringify(st));
    } catch (e) {
      // ignore storage errors
    }
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
          setMessage(T[lang].pleaseChooseTrump);
          break;
        }
        // let engine pick a smart trump for bots
        const chosen = Schieber.chooseBotTrump(st, st.currentPlayer);
        const newState = Schieber.setTrumpAndDetectWeis(st, chosen);
        st = newState;
        setChosenTrump(chosen);
        const botPlayer = newState.players.find(p => p.id === newState.currentPlayer);
        setMessage(`${botPlayer?.name || 'Bot'} chose trump: ${chosen}`);
        saveLocalState(newState);
        setGameState({ phase: st.phase, currentPlayer: st.currentPlayer, trumpSuit: st.trump || null, currentTrick: st.currentTrick || [], scores: st.scores });
        // update UI players and hand
        setPlayers(mapPlayersWithSeats(st.players));
        setHand(st.players.find(p=>p.id===0)?.hand || []);
        setLegalCards(Schieber.getLegalCardsForPlayer(st, 0));
        await new Promise(r=>setTimeout(r, playDelayMs));
        continue;
      }      // if it's a bot's turn (0 is our south player), let bots play automatically
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
      
      st.trump = chosenTrump as any;
      st.phase = 'playing';
      
      // Detect Weis for all players now that trump is known
      const updatedSt = Schieber.setTrumpAndDetectWeis(st, chosenTrump as any);
      
      // Determine Weis winner (authentic Swiss Jass competition)
      const weisWinnerResult = determineWeisWinner(updatedSt.weis || {});
      setWeisWinner(weisWinnerResult);
      
      saveLocalState(updatedSt);
      setPlayers(mapPlayersWithSeats(updatedSt.players));
      setGameState({ phase: updatedSt.phase, currentPlayer: updatedSt.currentPlayer, trumpSuit: updatedSt.trump || null, currentTrick: updatedSt.currentTrick || [], scores: updatedSt.scores, weis: updatedSt.weis });
      
      if (weisWinnerResult) {
  const winnerName = updatedSt.players.find((p:any) => p.id === weisWinnerResult.playerId)?.name;
        setMessage(`Trump: ${chosenTrump} | Weis Winner: ${winnerName} (Team ${weisWinnerResult.teamId})`);
      } else {
        setMessage(`Trump set: ${chosenTrump} - No Weis declared`);
      }
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
  if (matchFinished) return setMessage(T[lang].matchFinished);
  // prevent playing while UI is resolving a trick
    if (uiPendingResolve) return;
    const st = loadLocalState();
    if (!st) return;
    if (st.phase !== 'playing') return setMessage('Game not in playing phase');
    if (st.currentPlayer !== 0) return setMessage(T[lang].itsYourTurn);
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
    setPlayers(mapPlayersWithSeats(newSt.players));
    setHand(newSt.players.find(p=>p.id===0)?.hand || []);
    setLegalCards(Schieber.getLegalCardsForPlayer(newSt, 0));
  // perform swoop animation then resolve and retrieve resulting state
  const resolved = await startSwoopAndResolve(newSt);
  // update newSt to the resolved state so later logic uses correct state
  // (resolved may be same object)
  // ensure we persist resolved state
  saveLocalState(resolved);
    // refresh UI with resolved state so trick counters update
    setPlayers(mapPlayersWithSeats(resolved.players));
    setGameState({ phase: resolved.phase, currentPlayer: resolved.currentPlayer, trumpSuit: resolved.trump || null, currentTrick: resolved.currentTrick || [], scores: resolved.scores });
    setHand(resolved.players.find(p=>p.id===0)?.hand || []);
    setLegalCards(Schieber.getLegalCardsForPlayer(resolved, 0));
      } finally {
        setUiPendingResolve(false);
      }
      // after resolution, let bots continue
      setTimeout(()=>botsTakeTurns(), 80);
      return;
    }
    // normal play: persist and update UI, then let bots act
    saveLocalState(newSt);
  setPlayers(mapPlayersWithSeats(newSt.players));
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
  // Prevent double-processing the same finished game (by id)
  if (maybeGameId) {
    try {
      const processedRawCheck = localStorage.getItem('jassProcessedGames');
      const processedCheck: string[] = processedRawCheck ? JSON.parse(processedRawCheck) : [];
      if (processedCheck.includes(maybeGameId)) return; // already applied
    } catch (e) { /* ignore parse errors */ }
  }
  const currentTotalsRaw = localStorage.getItem('jassTotals');
  const currentTotals: Record<string, number> = currentTotalsRaw ? JSON.parse(currentTotalsRaw) : {};
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
            const hasMultiplier = (state as any).trumpMultiplier !== undefined && (state as any).trumpMultiplier !== null;
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
        const team1Players = playersList.filter(p => p.team === 1);
        const team2Players = playersList.filter(p => p.team === 2);
        
  // In Swiss Jass, each player gets their team's FULL score (not divided)
  team1Players.forEach(p => additions[p.name] = team1Score);
  team2Players.forEach(p => additions[p.name] = team2Score);
      } else if (playersList && playersList.length && playersList.every(p => typeof (p as any).points === 'number')) {
        // Fallback: if per-player points are already calculated
        playersList.forEach(p => { additions[p.name] = (p as any).points || 0; });
      }

      // Apply additions to totals and to user records
      const newTotals = { ...currentTotals };
      const newUsers = { ...currentUsers };
      Object.keys(additions).forEach(name => {
        const pts = additions[name] || 0;
        newTotals[name] = (newTotals[name] || 0) + pts;
        if (!newUsers[name]) newUsers[name] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
        newUsers[name].totalPoints = (newUsers[name].totalPoints || 0) + pts;
        newUsers[name].gamesPlayed = (newUsers[name].gamesPlayed || 0) + 1;
      });
      // determine winning team and credit wins
      const t1 = (state.scores as any)?.team1 || 0;
      const t2 = (state.scores as any)?.team2 || 0;
      const winningTeam = t1 >= t2 ? 1 : 2;
      playersList.filter(p => p.team === winningTeam).forEach(p => {
        const nm = p.name;
        if (!newUsers[nm]) newUsers[nm] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
        newUsers[nm].wins = (newUsers[nm].wins || 0) + 1;
      });
      // update lastSeen timestamp for all players
      const now = Date.now();
      playersList.forEach(p => {
        const nm = p.name;
        if (!newUsers[nm]) newUsers[nm] = { totalPoints: 0, gamesPlayed: 0, wins: 0, lastSeen: null };
        newUsers[nm].lastSeen = now;
      });

      // Debug message to confirm points are being updated
      if (Object.keys(additions).length > 0) {
        // Sum points per team for a clearer message (previously only picked first entry)
        const team1Total = Object.entries(additions).reduce((acc, [name, pts]) => acc + (playersList.find(p => p.name === name)?.team === 1 ? pts : 0), 0);
        const team2Total = Object.entries(additions).reduce((acc, [name, pts]) => acc + (playersList.find(p => p.name === name)?.team === 2 ? pts : 0), 0);

        console.log('Swiss Jass: Team scores - Team 1:', team1Total, 'Team 2:', team2Total);
        setMessage(`Game finished! Team 1: ${team1Total} pts, Team 2: ${team2Total} pts`);
      }

  localStorage.setItem('jassTotals', JSON.stringify(newTotals));
  localStorage.setItem('jassUsers', JSON.stringify(newUsers));
  setTotals(newTotals);
  setJassUsers(newUsers);

  // If there are no server-side users loaded (usersList empty), expose local totals
  // as a lightweight usersList so the Rankings tab shows local players immediately.
  try {
    if (!usersList || usersList.length === 0) {
      const merged = Object.entries(newTotals).map(([name, pts]) => ({ id: `local-${name}`, username: name, totalPoints: pts }));
      setUsersList(merged);
    }
  } catch (e) { /* ignore */ }

      // Best-effort: try to sync totals to backend if available and refresh server-side users list
      (async () => {
        try {
          const token = localStorage.getItem('jassToken');
          // First, try the admin totals sync (adds points to matching usernames)
          const res = await fetch(`${API_URL}/api/admin/totals/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify({ totals: newTotals }) });
          const j = await res.json();
          if (j?.success) {
            // Refresh server user totals for Rankings
            try {
              const r2 = await fetch(`${API_URL}/api/admin/users`);
              const u = await r2.json();
              if (u?.success) setUsersList(u.users || []);
            } catch (e) { /* ignore */ }
            // Always refresh leaderboard after totals sync (wins may have changed via other players)
            try {
              const lb = await fetch(`${API_URL}/api/admin/leaderboard`);
              const lbJson = await lb.json();
              if (lbJson?.success && Array.isArray(lbJson.leaderboard)) setLeaderboard(lbJson.leaderboard);
            } catch (_) { /* ignore */ }
          }

          // If logged-in, try to report the match per-team for TrueSkill updates
          try {
            const token = localStorage.getItem('jassToken');
            if (token && playersList && playersList.length > 0 && state.scores) {
              // Attempt to map local player names to server userIds from usersList
              const mapNameToId: Record<string,string> = {};
              (usersList || []).forEach((u:any) => { mapNameToId[u.username] = u.id; });
              // Also map a generic 'You' placeholder to the logged-in user (if present)
              const loggedIn = (usersList || []).find(u => u.username === currentUserName);
              if (loggedIn) {
                mapNameToId['You'] = loggedIn.id;
              }
              // Debug mapping
              console.log('Mapping player names to IDs', { playersList: playersList.map(p=>p.name), mapNameToId });
              const teamAIds = playersList.filter(p => p.team === 1).map(p => mapNameToId[p.name]).filter(Boolean);
              const teamBIds = playersList.filter(p => p.team === 2).map(p => mapNameToId[p.name]).filter(Boolean);
              if (teamAIds.length > 0 && teamBIds.length > 0) {
                await fetch(`${API_URL}/api/games/report`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ teamA: teamAIds, teamB: teamBIds, scoreA: (state.scores as any).team1, scoreB: (state.scores as any).team2, rounds: 0 }) });
                // refresh server users after rating change
                const r3 = await fetch(`${API_URL}/api/admin/users`);
                const u3 = await r3.json();
                if (u3?.success) setUsersList(u3.users || []);
                // fetch leaderboard for wins ranking
                try {
                  const lb = await fetch(`${API_URL}/api/admin/leaderboard`);
                  const lbJson = await lb.json();
                  if (lbJson?.success && Array.isArray(lbJson.leaderboard)) setLeaderboard(lbJson.leaderboard);
                } catch (_) { /* ignore */ }
              } else {
                console.warn('Skipping /games/report due to unmapped players; attempting single-user fallback', { teamAIds, teamBIds });
                try {
                  const youWon = ((state.scores as any)?.team1 || 0) >= ((state.scores as any)?.team2 || 0);
                  await fetch(`${API_URL}/api/games/user-result`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ won: youWon, points: youWon ? 3 : 0, rounds: 0 }) });
                  const after = await fetch(`${API_URL}/api/admin/users`);
                  const afterJson = await after.json();
                  if (afterJson?.success) setUsersList(afterJson.users || []);
                  const lb2 = await fetch(`${API_URL}/api/admin/leaderboard`);
                  const lb2Json = await lb2.json();
                  if (lb2Json?.success && Array.isArray(lb2Json.leaderboard)) setLeaderboard(lb2Json.leaderboard);
                } catch (fe) { /* ignore */ }
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
        // If backend provided weis, determine winner for UI display
        try {
          const weisObj = (data.state && data.state.weis) ? data.state.weis : null;
          if (weisObj) {
            const ww = determineWeisWinner(weisObj as Record<number, any[]>);
            setWeisWinner(ww);
          }
        } catch (e) {}
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

  // Determine Weis winner according to authentic Swiss Jass rules
  const determineWeisWinner = (weis: Record<number, any[]>): {playerId: number, teamId: number} | null => {
    let bestWeis: any = null;
    let bestPlayer: number | null = null;
    let bestTeam: number | null = null;

    // Find the highest value Weis
    Object.entries(weis).forEach(([playerId, playerWeis]) => {
      if (!playerWeis || playerWeis.length === 0) return;
      
      const player = players.find(p => p.id === parseInt(playerId));
      if (!player) return;
      
      playerWeis.forEach((w: any) => {
        if (!bestWeis || w.points > bestWeis.points || 
           (w.points === bestWeis.points && compareWeisEquality(w, bestWeis, player.team))) {
          bestWeis = w;
          bestPlayer = parseInt(playerId);
          bestTeam = player.team;
        }
      });
    });

    return (bestPlayer !== null && bestTeam !== null) ? { playerId: bestPlayer, teamId: bestTeam } : null;
  };

  // Compare Weis of equal value according to Swiss Jass rules
  const compareWeisEquality = (w1: any, w2: any, team: number): boolean => {
    // Same points: longer sequence wins, then higher cards, then trump suit, then position
    if (w1.points !== w2.points) return false;
    
    // For sequences, longer wins
    if (w1.type.includes('sequence') && w2.type.includes('sequence')) {
      return w1.cards.length > w2.cards.length;
    }
    
    // For equal sequences, trump sequences win
    const w1InTrump = w1.cards.some((c: any) => c.suit === gameState?.trumpSuit);
    const w2InTrump = w2.cards.some((c: any) => c.suit === gameState?.trumpSuit);
    
    return w1InTrump && !w2InTrump;
  };

  const resetTotals = () => {
  localStorage.removeItem('jassTotals');
  localStorage.removeItem('jassProcessedGames');
  localStorage.removeItem('jassUsers');
  setTotals({});
  setJassUsers({});
  setUsersList([]);
  };

  // multiplayer handlers
  useEffect(() => {
    try { authToken.current = localStorage.getItem('jassToken'); } catch {}
    if (mode === 'multi' && !socket) {
      const s = io(API_URL || 'http://localhost:3000', { auth: { token: authToken.current } });
      setSocket(s);
      s.on('connect', () => {});
      s.on('presence:count', (p: any) => setOnlineCount(p.online));
      s.on('tables:updated', () => fetchTables());
      s.on('friends:update', () => fetchFriends());
      return () => { s.disconnect(); };
    }
  }, [mode]);

  const fetchTables = async () => {
    if (!authToken.current) return;
    try {
      const res = await fetch(`${API_URL}/api/tables`, { headers: { Authorization: `Bearer ${authToken.current}` }});
      const data = await res.json();
      if (data.success) setTables(data.tables || []);
    } catch {}
  };

  const createTable = async (nameOverride?: string) => {
    if (!authToken.current) return; setCreatingTable(true);
    try {
      const res = await fetch(`${API_URL}/api/tables`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${authToken.current}` }, body: JSON.stringify({ name: nameOverride || 'Table', maxPlayers: 4 }) });
      const data = await res.json();
      if (!data.success) {
        setMessage(data.message || 'Failed to create table');
      } else {
        setMessage(`Table '${data.table?.name || nameOverride || 'Table'}' created`);
        setTableName('');
      }
      fetchTables();
    } catch (e) {
      setMessage('Error creating table');
    } finally { setCreatingTable(false); }
  };

  const joinTable = async (id: string) => {
    if (!authToken.current) return; setJoiningTableId(id);
    try {
      await fetch(`${API_URL}/api/tables/${id}/join`, { method: 'POST', headers: { Authorization: `Bearer ${authToken.current}` }});
      fetchTables();
    } finally { setJoiningTableId(null); }
  };

  const fetchFriends = async () => {
    if (!authToken.current) return; setFriendsLoading(true);
    try {
      const [friendsRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/api/friends`, { headers: { Authorization: `Bearer ${authToken.current}` }}),
        fetch(`${API_URL}/api/friends/requests`, { headers: { Authorization: `Bearer ${authToken.current}` }})
      ]);
      const fr = await friendsRes.json();
      const rq = await reqRes.json();
      if (fr.success && rq.success) setFriendsTabData({ friends: fr.friends, requests: rq.requests });
    } finally { setFriendsLoading(false); }
  };

  const sendFriendRequest = async (username: string) => {
    if (!authToken.current || !username) return;
    await fetch(`${API_URL}/api/friends/request`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${authToken.current}` }, body: JSON.stringify({ username }) });
    fetchFriends();
  };

  const respondFriendRequest = async (id: string, accept: boolean) => {
    if (!authToken.current) return;
    await fetch(`${API_URL}/api/friends/requests/${id}/respond`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${authToken.current}` }, body: JSON.stringify({ accept }) });
    fetchFriends();
  };

  // Trigger initial fetch when switching to multi tabs
  useEffect(() => { if (mode==='multi') { fetchTables(); fetchFriends(); } }, [mode]);

  // Rendering helpers
  const renderModeSwitcher = () => (
    <div style={{ display:'flex', gap:8, justifyContent:'center', margin:'12px 0' }}>
      <button style={{ ...styles.button, background: mode==='single'? '#1A7A4C':'#64748b' }} onClick={()=>setMode('single')}>Single Player</button>
      <button style={{ ...styles.button, background: mode==='multi'? '#1A7A4C':'#64748b' }} onClick={()=>setMode('multi')}>Multiplayer</button>
      {mode==='multi' && <span style={{ alignSelf:'center', fontSize:12, color:'#374151' }}>Online: {onlineCount}</span>}
    </div>
  );

  const renderTables = () => {
    return (
      <div style={{ padding:12 }}>
        <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
          <input value={tableName} onChange={e=>setTableName(e.target.value)} placeholder='Table name' style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }} />
          <button disabled={creatingTable} style={styles.button} onClick={() => createTable(tableName || 'Table')}>{creatingTable? 'Creating...':'Create Table'}</button>
          <button style={styles.button} onClick={fetchTables}>Refresh</button>
          <div style={{ fontSize:12, color:'#555' }}>Online: {onlineCount}</div>
        </div>
        <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))' }}>
          {tables.map(t => (
            <div key={t.id} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:10, background:'#fff', position:'relative' }}>
              <div style={{ fontWeight:600 }}>{t.name}</div>
              <div style={{ fontSize:12, color:'#555' }}>Players: {t.players?.length || 0}/{t.maxPlayers}</div>
              <div style={{ fontSize:12, color:'#555' }}>Status: {t.status}</div>
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                <button disabled={joiningTableId===t.id} style={{ ...styles.button, flex:1 }} onClick={()=>joinTable(t.id)}>{joiningTableId===t.id? 'Joining...':'Join'}</button>
                {t.status==='OPEN' && t.createdById === user?.id && (
                  <button style={{ ...styles.button, background:'#f59e0b' }} onClick={()=>startTableEarly(t.id)}>Start Now</button>
                )}
              </div>
            </div>
          ))}
          {!tables.length && <div style={{ fontSize:14, color:'#555' }}>No open tables</div>}
        </div>
      </div>
    );
  };

  const [friendInput, setFriendInput] = useState('');
  const renderFriends = () => (
    <div style={{ padding:12 }}>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
        <input value={friendInput} onChange={e=>setFriendInput(e.target.value)} placeholder='Friend username' style={{ flex:1, padding:8, border:'1px solid #ddd', borderRadius:6 }} />
        <button style={styles.button} onClick={()=>{ sendFriendRequest(friendInput); setFriendInput(''); }}>Add</button>
        <button style={styles.button} onClick={fetchFriends}>Refresh</button>
      </div>
      {friendsLoading && <div style={{ fontSize:12 }}>Loading...</div>}
      <h4 style={{ margin:'8px 0 4px' }}>Friends</h4>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {friendsTabData.friends.map(f => <div key={f.id} style={{ background:'#fff', padding:'6px 10px', borderRadius:20, fontSize:12, border:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:4, background: f.online? '#10b981':'#9ca3af', display:'inline-block' }} />
          {f.username}
        </div>)}
        {!friendsTabData.friends.length && <div style={{ fontSize:12, color:'#555' }}>No friends yet</div>}
      </div>
      <h4 style={{ margin:'12px 0 4px' }}>Requests</h4>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {friendsTabData.requests.map(r => (
          <div key={r.id} style={{ background:'#fff', padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:12 }}>
              {r.senderId === user?.id ? `To ${r.receiver?.username}` : `From ${r.sender?.username}`} – {r.status}
            </div>
            {r.status==='PENDING' && r.receiverId === user?.id && (
              <div style={{ display:'flex', gap:6 }}>
                <button style={{ ...styles.button, background:'#1A7A4C' }} onClick={()=>respondFriendRequest(r.id,true)}>Accept</button>
                <button style={{ ...styles.button, background:'#D42E2C' }} onClick={()=>respondFriendRequest(r.id,false)}>Decline</button>
              </div>
            )}
          </div>
        ))}
        {!friendsTabData.requests.length && <div style={{ fontSize:12, color:'#555' }}>No requests</div>}
      </div>
    </div>
  );

  // Integrate into existing tab bar: add 'tables' and 'friends'
  const renderTabs = () => {
    const baseSingle = ['game','rankings','settings','profile'];
    const multiExtra = ['tables','friends'];
    const keys = mode === 'multi' ? ['game','tables','friends','rankings','settings','profile'] : baseSingle;
    return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, justifyContent: 'center', flexWrap:'wrap' }}>
      {keys.map(key => {
        const labels: Record<string,string> = {
          game: T[lang].game,
          rankings: T[lang].rankings,
          settings: T[lang].settings,
          profile: T[lang].profile,
          tables: '🏓 Tables',
          friends: '👥 Friends'
        };
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => {
              setTab(key as any);
              if (key==='game') setOptionsVisible(true); else setOptionsVisible(false);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 24,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '.5px',
              cursor: 'pointer',
              border: active ? '2px solid #1A7A4C' : '1px solid #d1d5db',
              background: active ? '#1A7A4C' : '#ffffff',
              color: active ? '#ffffff' : '#1f2937',
              boxShadow: active ? '0 4px 10px rgba(26,122,76,0.35)' : '0 2px 4px rgba(0,0,0,0.08)',
              transition: 'background 120ms, color 120ms, box-shadow 150ms, border-color 150ms'
            }}
            onMouseEnter={e=>{ if(!active)(e.currentTarget.style.background='#f3f4f6'); }}
            onMouseLeave={e=>{ if(!active)(e.currentTarget.style.background='#ffffff'); }}
          >{labels[key]}</button>
        );
      })}
      {gameId && tab==='game' && <button style={{ ...styles.button, background:'#2563eb' }} onClick={() => loadGameState(gameId)} disabled={isLoading}>{T[lang].refresh}</button>}
      {onLogout && <button style={{ ...styles.button, background: '#374151' }} onClick={onLogout}>{T[lang].logout}</button>}
      {/* Recovery controls to avoid dead-ends (local only) */}
      {isLocal && (
        <>
          <button style={{ ...styles.button, background: '#f59e0b' }} onClick={() => {
        // Force resume: attempt to advance stalled local game
        const st = loadLocalState();
        if (st && st.pendingResolve) {
          const resolved = Schieber.resolveTrick(st);
          saveLocalState(resolved);
          setGameState({ phase: resolved.phase, currentPlayer: resolved.currentPlayer, trumpSuit: resolved.trump || null, currentTrick: resolved.currentTrick || [], scores: resolved.scores });
          setPlayers(mapPlayersWithSeats(resolved.players));
          setHand(resolved.players.find((p:any)=>p.id===0)?.hand || []);
          setLegalCards(Schieber.getLegalCardsForPlayer(resolved, 0));
          setMessage('Force-resolved trick');
        } else {
          setMessage('No pending action to force-resume');
        }
      }}>Force Resume</button>
          <button style={{ ...styles.button, background: '#ef4444' }} onClick={() => {
            localStorage.removeItem('jassLocalState');
            setGameState(null);
            setPlayers([]);
            setHand([]);
            setLegalCards([]);
            setOptionsVisible(true);
            setMessage('Local state reset');
          }}>Reset Local</button>
        </>
      )}
    </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <img src={logo} alt="Swiss Jass Logo" style={{ height: 50, borderRadius: 8 }} />
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em' }}>Swiss Jass</h1>
      </div></div>
      <div style={styles.gameArea}>
        <div style={styles.message}>{message}</div>
        
        {/* Language selector in top right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <select value={lang} onChange={e=>setLang(e.target.value as any)} style={{ padding:6, borderRadius:6 }} title="Language">
            <option value="en">🇺🇸 English</option>
            <option value="ch">🇨🇭 Schwiizerdütsch</option>
          </select>
        </div>

        {renderModeSwitcher()}

        {renderTabs()}

        {/* Tab content injection for new multiplayer features */}
        {tab === 'tables' && mode==='multi' && (
          <div style={{ marginBottom:24 }}>{renderTables()}</div>
        )}
        {tab === 'friends' && mode==='multi' && (
          <div style={{ marginBottom:24 }}>{renderFriends()}</div>
        )}

        {/* Game-only HUD (scores, trump, history) */}
        {tab==='game' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 80, marginTop: 12, marginBottom: 16 }}>
              <div style={{ textAlign: 'center', background: '#fff', borderRadius: 12, padding: '12px 20px', border: '2px solid #D42E2C', boxShadow: '0 4px 8px rgba(212, 46, 44, 0.15)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#A42423', marginBottom: 2 }}>{teamNames[1] || 'Team 1'}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#D42E2C' }}>{gameState?.scores?.team1 ?? 0}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>Punkte</div>
              </div>
              <div style={{ textAlign: 'center', background: '#fff', borderRadius: 12, padding: '12px 20px', border: '2px solid #1A7A4C', boxShadow: '0 4px 8px rgba(26, 122, 76, 0.15)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#135A38', marginBottom: 2 }}>{teamNames[2] || 'Team 2'}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#1A7A4C' }}>{gameState?.scores?.team2 ?? 0}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>Punkte</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ background: currentTrump ? '#fff' : '#f3f4f6', border: currentTrump ? '2px solid #1A7A4C' : '2px solid #9ca3af', borderRadius: 12, padding: '10px 18px', fontSize: 16, fontWeight: 700, color: currentTrump ? '#135A38' : '#6b7280', boxShadow: currentTrump ? '0 4px 12px rgba(26, 122, 76, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)', minWidth: 200, textAlign: 'center' as const }}>
                <span style={{ fontSize: 12, display: 'block', marginBottom: 2, opacity: 0.8 }}>{T[lang].currentTrump}</span>
                <span style={{ fontSize: 18 }}>{currentTrump ? `${suitSymbols[currentTrump] || ''} ${currentTrump.toUpperCase()}` : '—'}</span>
              </div>
            </div>
            {roundHistory.length > 0 && (
              <div style={{ marginBottom: 16, background: '#f9fafb', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>Round History</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {roundHistory.map((round, idx) => (
                    <div key={idx} style={{ background: 'white', borderRadius: 6, padding: '4px 8px', fontSize: 12, border: '1px solid #e5e7eb', minWidth: 80, textAlign: 'center' }}>
                      <div style={{ fontWeight: 600 }}>Round {round.round}</div>
                      <div style={{ color: '#dc2626' }}>{round.team1}</div>
                      <div style={{ color: '#2563eb' }}>{round.team2}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{round.trump}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

  {tab === 'game' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <div style={{ width: 700, height: 420, position: 'relative', background: 'radial-gradient(circle, rgba(25,122,76,1) 0%, rgba(19,93,58,1) 100%)', borderRadius: 16, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), 0 8px 25px rgba(0,0,0,0.2)', padding: 8, border: '4px solid #135A38' }}>
              
              {/* North player (id 2) - Compact layout */}
              <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', minWidth: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  {renderPlayerBadge(players.find(p=>p.position==='north')?.id)}
                  <div>
                    <div style={{ fontWeight: '700', fontSize: 13, color: '#1f2937', marginBottom: 1 }}>
                      {players.find(p=>p.position==='north')?.name || 'North'}
                      {winnerFlash?.id === (players.find(p=>p.position==='north')?.id) ? <span style={{ marginLeft: 4, fontSize: '1.2rem' }}>{winnerFlash?.emoji}</span> : null}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <span>{players.find(p=>p.position==='north')?.hand?.length ?? 0} {T[lang].cards}</span>
                      <span>{T[lang].team} {players.find(p=>p.position==='north')?.team ?? '-'} • {getTricksCount(players.find(p=>p.position==='north'))} {T[lang].tricks}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* West player (id 1) - Compact layout */}
              <div style={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', textAlign: 'center', minWidth: 80 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {renderPlayerBadge(players.find(p=>p.position==='west')?.id)}
                    <div>
                      <div style={{ fontWeight: '700', fontSize: 13, color: '#1f2937', marginBottom: 1 }}>
                        {players.find(p=>p.position==='west')?.name || 'West'}
                        {winnerFlash?.id === (players.find(p=>p.position==='west')?.id) ? <span style={{ marginLeft: 4, fontSize: '1.2rem' }}>{winnerFlash?.emoji}</span> : null}
                      </div>
                      <div style={{ fontSize: 9, color: '#6b7280' }}>
                        <div>{players.find(p=>p.position==='west')?.hand?.length ?? 0} {T[lang].cards}</div>
                        <div>{T[lang].team} {players.find(p=>p.position==='west')?.team ?? '-'} • {getTricksCount(players.find(p=>p.position==='west'))} {T[lang].tricks}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* East player (id 3) - Compact layout */}
              <div style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', textAlign: 'center', minWidth: 80 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: 13, color: '#1f2937', marginBottom: 1 }}>
                        {players.find(p=>p.position==='east')?.name || 'East'}
                        {winnerFlash?.id === (players.find(p=>p.position==='east')?.id) ? <span style={{ marginLeft: 4, fontSize: '1.2rem' }}>{winnerFlash?.emoji}</span> : null}
                      </div>
                      <div style={{ fontSize: 9, color: '#6b7280' }}>
                        <div>{players.find(p=>p.position==='east')?.hand?.length ?? 0} {T[lang].cards}</div>
                        <div>{T[lang].team} {players.find(p=>p.position==='east')?.team ?? '-'} • {getTricksCount(players.find(p=>p.position==='east'))} {T[lang].tricks}</div>
                      </div>
                    </div>
                    {renderPlayerBadge(players.find(p=>p.position==='east')?.id)}
                  </div>
                </div>
              </div>

              {/* South player (human) - Compact layout */}
              <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', minWidth: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: 13, color: '#1f2937', marginBottom: 1 }}>
                      {players.find(p=>p.position==='south')?.name || 'You'}
                      {winnerFlash?.id === (players.find(p=>p.position==='south')?.id) ? <span style={{ marginLeft: 4, fontSize: '1.2rem' }}>{winnerFlash?.emoji}</span> : null}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <span>{players.find(p=>p.position==='south')?.hand?.length ?? 0} {T[lang].cards}</span>
                      <span>{T[lang].team} {players.find(p=>p.position==='south')?.team ?? '-'} • {getTricksCount(players.find(p=>p.position==='south'))} {T[lang].tricks}</span>
                    </div>
                  </div>
                  {renderPlayerBadge(players.find(p=>p.position==='south')?.id)}
                </div>
              </div>

              {/* Center trick area - more compact design */}
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 280, height: 280 }}>
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  {/* If showing last trick at round end, render that first (override) */}
                  {showLastTrick && showLastTrick.length > 0 ? (
                    showLastTrick.map((c:any, i:number) => {
                      const seat = seatForId(c.playerId ?? i);
                      const posMap = {
                        south: { left: '50%', top: '75%', rot: 0 },
                        north: { left: '50%', top: '25%', rot: 180 },
                        west:  { left: '25%', top: '50%', rot: 90 },
                        east:  { left: '75%', top: '50%', rot: -90 },
                      };
                      const pos = posMap[seat] || { left: '50%', top: '50%', rot: 0 };
                      return (
                        <div key={c.id || i} style={{ position: 'absolute', left: pos.left, top: pos.top, transform: `translate(-50%,-50%) rotate(${pos.rot}deg)`, textAlign: 'center' as const }}>
                          <SwissCard card={c} />
                          <div style={{ fontSize: 9, color: '#374151', fontWeight: '600', marginTop: 2 }}>
                            {players.find(p=>p.id===c.playerId)?.name ?? 'Player'}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Render current trick cards - show them during resolving so all 4 cards remain visible
                    !isAnimating && gameState?.currentTrick && gameState.currentTrick.length > 0 && (
                      gameState.currentTrick.map((c:any, i:number) => {
                        const seat = seatForId(c.playerId ?? i);
                          const posMap = {
                            south: { left: '50%', top: '75%', rot: 0 },
                            north: { left: '50%', top: '25%', rot: 180 },
                            west:  { left: '25%', top: '50%', rot: 90 },
                            east:  { left: '75%', top: '50%', rot: -90 },
                          };
                        const pos = posMap[seat] || { left: '50%', top: '50%', rot: 0 };
                        const isSwooping = animCards.findIndex((ac:any) => ac.id === c.id) !== -1;
                        const swoopStyle: React.CSSProperties = isSwooping && (animatingSwoop?.winnerId ?? null) !== null
                          ? { transition: 'transform 700ms ease, left 700ms ease, top 700ms ease', zIndex: 40 }
                          : {};
                        return (
                          <div key={c.id || i} style={{ position: 'absolute', left: pos.left, top: pos.top, transform: `translate(-50%,-50%) rotate(${pos.rot}deg)`, textAlign: 'center' as const, ...swoopStyle }}>
                            <SwissCard card={c} />
                            <div style={{ fontSize: 9, color: '#374151', fontWeight: '600', marginTop: 2 }}>
                              {players.find(p=>p.id===c.playerId)?.name ?? 'Player'}
                            </div>
                          </div>
                        );
                      })
                      )
                    )}

                  {isAnimating && (
                    <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', color: '#6b7280', fontWeight: '600', fontSize: 14 }}>
                      Resolving...
                    </div>
                  )}

                  {!gameState?.currentTrick?.length && !uiPendingResolve && !isAnimating && (
                    <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', color: '#6b7280', fontWeight: '500', fontSize: 12 }}>
                      {T[lang].noCardsPlayed}
                    </div>
                  )}
                </div>
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
              {/* Dialect selection removed - translations use `lang` (en | ch) */}
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
              <button style={styles.button} onClick={() => { setTab('game'); }}>{T[lang].backToGame}</button>
              <button style={{ ...styles.button, background: '#ef4444', marginLeft: 8 }} onClick={resetTotals}>Reset Totals</button>
            </div>
            
            {/* Enhanced Statistics Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ background: '#f3f4f6', padding: 12, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>🏆 Wins Rankings</h4>
                {leaderboard.length > 0 && (
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {leaderboard.map((u, idx) => (
                      <li key={u.id} style={{ marginBottom: 6 }}>
                        <span style={{ fontWeight: idx === 0 ? '700' : '500', color: idx === 0 ? '#d97706' : '#374151' }}>
                          {u.username}: {u.totalWins} wins ({u.totalGames} games, {(u.winRate * 100).toFixed(0)}% WR)
                        </span>
                        {idx === 0 && <span style={{ marginLeft: 6 }}>🥇</span>}
                      </li>
                    ))}
                  </ol>
                )}
                <h4 style={{ margin: '12px 0 8px 0', color: '#374151' }}>💯 Total Points Rankings</h4>
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
                    {((Object.entries(totals) as [string, number][]).sort((a,b) => b[1]-a[1])).map(([name, pts], idx) => (
                      <li key={name} style={{ marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: idx === 0 ? '700' : '500', color: idx === 0 ? '#059669' : '#374151' }}>
                          {name}: {pts} pts
                        </span>
                        {idx === 0 && <span style={{ marginLeft: 8, fontSize: '1.2rem' }}>👑</span>}
                      </li>
                    ))}
                  </ol>
                )}
                {/* Local detailed user stats */}
                {Object.keys(jassUsers).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h5 style={{ margin: '6px 0' }}>Local Player Stats</h5>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {Object.entries(jassUsers).sort((a:any,b:any)=> (b[1].totalPoints||0)-(a[1].totalPoints||0)).map(([name, info]: any) => (
                        <li key={name} style={{ marginBottom: 6 }}>
                          <strong>{name}</strong>: {info.totalPoints || 0} pts • {info.gamesPlayed || 0} games • {info.wins || 0} wins
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div style={{ background: '#e0f2fe', padding: 12, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e' }}>📊 Game Statistics</h4>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <div><strong>Games Played:</strong> {localStorage.getItem('jassProcessedGames') ? JSON.parse(localStorage.getItem('jassProcessedGames')!).length : 0}</div>
                  <div><strong>Average Score:</strong> {(Object.keys(totals).length > 0 ? Math.round((Object.values(totals) as number[]).reduce((a,b) => a+b, 0) / Object.keys(totals).length) : 0)} pts</div>
                  <div><strong>Highest Score:</strong> {Object.keys(totals).length > 0 ? Math.max(...(Object.values(totals) as number[])) : 0} pts</div>
                  <div><strong>Total Points Awarded:</strong> {(Object.values(totals) as number[]).reduce((a,b) => a+b, 0)} pts</div>
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

        {tab === 'profile' && (
          <div style={{ marginTop: 8 }}>
            <h3>{T[lang].profile}</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, background: '#fff', padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{currentUserName}</div>
                <div style={{ color: '#6b7280', marginTop: 8 }}>Total Points: {jassUsers[currentUserName]?.totalPoints ?? 0}</div>
                <div style={{ color: '#6b7280' }}>Games Played: {jassUsers[currentUserName]?.gamesPlayed ?? 0}</div>
                <div style={{ color: '#6b7280' }}>Wins: {jassUsers[currentUserName]?.wins ?? 0}</div>
                <div style={{ color: '#6b7280' }}>Last Seen: {jassUsers[currentUserName]?.lastSeen ? new Date(jassUsers[currentUserName].lastSeen).toLocaleString() : '—'}</div>
              </div>
              <div style={{ width: 360, background: '#fff', padding: 12, borderRadius: 8 }}>
                <h4>{T[lang].changePassword}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label>{T[lang].username}
                    <input value={currentUserName} onChange={e=>setCurrentUserName(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
                  </label>
                  <label>{T[lang].newPassword}
                    <input type="password" value={newPasswordInput} onChange={e=>setNewPasswordInput(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={styles.button} onClick={handleChangePassword}>{T[lang].savePassword}</button>
                    <button style={{ ...styles.button, background: '#6b7280' }} onClick={()=>{ setProfileMessage(null); setNewPasswordInput(''); }}>{T[lang].backToGame}</button>
                  </div>
                  {profileMessage && <div style={{ color: '#065f46', marginTop: 6 }}>{profileMessage}</div>}
                </div>
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
            {hand.length ? sortHandForDisplay(hand, chosenTrump).map(card => {
              const playable = legalCards.some((c: any) => c.id === card.id);
              const reason = !playable ? notPlayableReason(card) : null;
              return (
                <div key={card.id} style={{ position: 'relative' }}>
                  <div title={reason || undefined} onClick={() => { if (playable) setSelectedCard(card.id); else if (reason) setMessage(reason); }} onDoubleClick={() => {
                    if (!playable) { if (reason) setMessage(reason); return; }
                    if (isLocal) playLocalCard(card.id); else playCard(card.id);
                  }}>
                    <SwissCard card={card} isSelected={selectedCard === card.id} isPlayable={playable} />
                  </div>
                </div>
              );
            }) : <div style={{ color: '#6b7280' }}>No cards</div>}
          </div>
        </div>

  {/* Trump selector only when it's the human dealer's turn */}
  {gameState?.phase === 'trump_selection' && gameState.currentPlayer === 0 && (
          <div style={{ marginTop: 12 }}>
            <h4>{T[lang].selectTrump} — Dealer: {players.find(p => p.id === gameState.dealer)?.name || `Player ${gameState.dealer}`}</h4>
            <div style={{ marginBottom: 8, fontSize: 14, color: '#374151' }}>
              {T[lang].dealer}: {players.find(p => p.id === gameState.dealer)?.name || `Player ${gameState.dealer}`} (chooses trump)
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {['eicheln', 'schellen', 'rosen', 'schilten', 'oben-abe', 'unden-ufe'].map(t => (
                <button key={t} style={{ ...styles.button, border: chosenTrump===t ? '2px solid #000' : undefined }} onClick={() => { setChosenTrump(t); setMessage(`Selected trump ${t}`); }}>
                  {t === 'oben-abe' ? 'Oben-abe' : t === 'unden-ufe' ? 'Unden-ufe' : `${suitSymbols[t]} ${t}`}
                </button>
              ))}
              <button style={styles.button} onClick={submitTrump}>{T[lang].submitTrump}</button>
              {/* Allow dealer to pass (schieben) to partner when choosing trump */}
              {/* If this local human is the dealer, allow them to schieben (pass) to partner */}
              {isLocal && gameState?.dealer === 0 && (
                <button style={{ ...styles.button, background: '#6b7280' }} onClick={() => { setChosenTrump('schieben'); setMessage('Dealer passed trump decision to partner (Schieben)'); }}>
                  🔄 Schieben (Pass)
                </button>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
              {lang === 'ch' ? 'Der Dealer wählt de Trump in däm Modus; er cha de Entscheid a sin Partner witerge (schiebe).' : 'Dealer chooses trump; they may pass the decision to their partner (schieben).'}
            </div>
          </div>
        )}

        {/* Enhanced Weis (Melds) Display with Swiss Authenticity */}
        {gameState?.weis && Object.keys(gameState.weis).length > 0 && (
          <div style={{ marginTop: 16, padding: 16, background: '#f0f9ff', border: '2px solid #10b981', borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#064e3b', fontSize: '18px', textAlign: 'center' }}>
              🎯 Weis (Melds) - Swiss Jass Tradition
            </h4>
            
            {weisWinner && (
              <div style={{ 
                background: '#d1fae5', 
                border: '1px solid #10b981', 
                borderRadius: 8, 
                padding: 8, 
                marginBottom: 12,
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: '#064e3b'
              }}>
                🏆 Weis Winner: {players.find(p => p.id === weisWinner.playerId)?.name} (Team {weisWinner.teamId})
                <br />
                <span style={{ fontSize: '12px', fontWeight: '400' }}>
                  Only this team's Weis count for scoring (authentic Swiss Jass rules)
                </span>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {Object.entries(gameState.weis as Record<string, any[]>).map(([playerId, weis]) => {
                const player = players.find(p => p.id === parseInt(playerId));
                const weisArr = weis as any[];
                if (!weisArr || weisArr.length === 0) return null;
                
                const isWinningTeam = weisWinner?.teamId === player?.team;
                
                return (
                  <div key={playerId} style={{ 
                    padding: 12, 
                    background: isWinningTeam ? '#ecfdf4' : 'white', 
                    borderRadius: 8, 
                    border: isWinningTeam ? '2px solid #10b981' : '1px solid #e5e7eb',
                    opacity: weisWinner && !isWinningTeam ? 0.6 : 1
                  }}>
                    <div style={{ 
                      fontWeight: '700', 
                      color: isWinningTeam ? '#064e3b' : '#1e40af', 
                      marginBottom: 6,
                      fontSize: 15
                    }}>
                      {player?.name || `Player ${playerId}`} (Team {player?.team || '?'})
                      {isWinningTeam && <span style={{ marginLeft: 8 }}>👑</span>}
                    </div>
                    {weisArr.map((w: any, idx: number) => (
                      <div key={idx} style={{ 
                        fontSize: 13, 
                        color: '#374151', 
                        marginBottom: 3,
                        padding: '4px 8px',
                        background: isWinningTeam ? '#f0fdf4' : '#f9fafb',
                        borderRadius: 4,
                        border: `1px solid ${isWinningTeam ? '#bbf7d0' : '#e5e7eb'}`
                      }}>
                        <span style={{ 
                          fontWeight: '600', 
                          color: isWinningTeam ? '#059669' : '#6b7280',
                          marginRight: 8
                        }}>
                          {w.points} {T[lang].weisPoints}
                        </span>
                        {w.description}
                        {weisWinner && !isWinningTeam && (
                          <span style={{ color: '#ef4444', fontSize: 11, fontStyle: 'italic' }}> {T[lang].weisNotCount}</span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            
            <div style={{ 
              marginTop: 12, 
              padding: 8, 
              background: '#fef3c7', 
              borderRadius: 6, 
              fontSize: 12, 
              color: '#92400e',
              textAlign: 'center'
            }}>
              <strong>{T[lang].weisRulesTitle}:</strong> {T[lang].weisRulesDesc}
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
                  🎮 {T[lang].playAgain}
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
          <div style={{ background: '#fffaf0', border: '1px solid #fde2b6', padding: 8, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{T[lang].scoringDetails}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px 8px', fontSize: 12, lineHeight: 1.3 }}>
              <div style={{ fontWeight: 600, fontSize: 11 }}>Non-trump</div><div></div><div style={{ fontWeight: 600, fontSize: 11 }}>Trump</div><div></div>
              <div>A: 11</div><div>K: 4</div><div>U: 20</div><div>A: 11</div>
              <div>10: 10</div><div>O: 3</div><div>9: 14</div><div>10: 10</div>
              <div>U: 2</div><div>9,8,7,6: 0</div><div>K: 4</div><div>O,8,7,6: 0</div>
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: '#6b7280', lineHeight: 1.3 }}>
              Last trick: +5 bonus • Total: 157 pts (152+5)
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
