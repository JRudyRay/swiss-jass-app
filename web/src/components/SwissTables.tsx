import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { io, Socket } from 'socket.io-client';
import { Loading, Spinner, EmptyState } from './Loading';
import Icon from './Icon';
import './SwissTables.css';

interface SwissTablesProps {
  user: any;
  token: string;
  onJoinGame?: (tableId: string) => void;
}

const SwissTables: React.FC<SwissTablesProps> = ({ user, token, onJoinGame }) => {
  const [tables, setTables] = useState<any[]>([]);
  const [tableName, setTableName] = useState('');
  const [newTableGameType, setNewTableGameType] = useState('schieber');
  const [newTeam1, setNewTeam1] = useState('Rot');
  const [newTeam2, setNewTeam2] = useState('Wiss');
  const [newTargetPoints, setNewTargetPoints] = useState(1000);
  const [creatingTable, setCreatingTable] = useState(false);
  const [joiningTableId, setJoiningTableId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const authToken = useRef(token);

  useEffect(() => {
    authToken.current = token;
  }, [token]);

  // Initialize socket connection
  useEffect(() => {
    if (!API_URL || !user) return;

    const s = io(API_URL, {
      auth: { token: authToken.current },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      console.log('Socket connected for tables view');
      fetchTables();
    });

    s.on('tables:updated', () => {
      fetchTables();
    });

    s.on('online-count', (count: number) => {
      setOnlineCount(count);
    });

    socketRef.current = s;

    return () => {
      s.disconnect();
    };
  }, [user]);

  const fetchTables = async () => {
    if (!API_URL) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/tables`, {
        headers: { Authorization: `Bearer ${authToken.current}` },
      });
      const data = await res.json();
      if (data.success) {
        setTables(data.tables || []);
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createTable = async (nameOverride?: string) => {
    if (!API_URL) return;
    setCreatingTable(true);
    try {
      const res = await fetch(`${API_URL}/api/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken.current}`,
        },
        body: JSON.stringify({
          name: nameOverride || tableName || 'Table',
          maxPlayers: 4,
          gameType: newTableGameType,
          team1Name: newTeam1,
          team2Name: newTeam2,
          targetPoints: newTargetPoints,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTableName('');
        fetchTables();
      }
    } catch (err) {
      console.error('Failed to create table:', err);
    } finally {
      setCreatingTable(false);
    }
  };

  const joinTable = async (id: string) => {
    if (!API_URL) return;
    setJoiningTableId(id);
    try {
      await fetch(`${API_URL}/api/tables/${id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken.current}` },
      });
      if (socketRef.current) {
        socketRef.current.emit('table:join', { tableId: id });
      }
      fetchTables();
      // Optionally notify parent component that game is starting
      if (onJoinGame) {
        onJoinGame(id);
      }
    } catch (err) {
      console.error('Failed to join table:', err);
    } finally {
      setJoiningTableId(null);
    }
  };

  const startTableEarly = async (id: string) => {
    if (!API_URL) return;
    try {
      const res = await fetch(`${API_URL}/api/tables/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken.current}` },
      });
      const data = await res.json();
      if (data.success) {
        console.log('Table started early');
      }
      fetchTables();
    } catch (err) {
      console.error('Failed to start table:', err);
    }
  };

  const statusTheme: Record<string, { pill: string; label: string }> = {
    OPEN: { pill: 'pill--ok', label: 'Offen' },
    STARTING: { pill: 'pill--warn', label: 'Startet' },
    IN_PROGRESS: { pill: 'pill--live', label: 'Am Laufe' },
    COMPLETED: { pill: '', label: 'Fertig' },
    CANCELLED: { pill: '', label: 'Abgseit' },
  };

  if (isLoading && tables.length === 0) {
    return <Loading message="Lade Tische..." />;
  }

  return (
    <div className="page tables">
      <h1 className="page__title tables__title">
        <Icon name="table" size={26} />
        Multiplayer Tische
      </h1>
      <p className="page__sub">
        Hoste än eigene Tisch oder tritt bim ene bstehende Lobby bi. Tische upgradiere automatisch
        zu live Spiel, wenn alli bereit sind.
      </p>

      <form
        className="card tables__form"
        onSubmit={(e) => {
          e.preventDefault();
          createTable(tableName || 'Mein Tisch');
        }}
      >
        <input
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder="Tisch Name"
          className="input tables__name"
        />
        <select
          value={newTableGameType}
          onChange={(e) => setNewTableGameType(e.target.value)}
          className="input"
        >
          <option value="schieber">Schieber</option>
        </select>
        <input
          value={newTeam1}
          onChange={(e) => setNewTeam1(e.target.value)}
          placeholder="Team 1 Name"
          className="input"
        />
        <input
          value={newTeam2}
          onChange={(e) => setNewTeam2(e.target.value)}
          placeholder="Team 2 Name"
          className="input"
        />
        <input
          type="number"
          inputMode="numeric"
          value={newTargetPoints}
          onChange={(e) => setNewTargetPoints(parseInt(e.target.value) || 1000)}
          placeholder="Ziel Punkte"
          className="input tabular"
        />
        <button disabled={creatingTable} className="btn btn--primary tables__create" type="submit">
          {creatingTable ? (
            <>
              <Spinner size="sm" color="#fff" /> Erstelle...
            </>
          ) : (
            <>
              <Icon name="plus" size={18} /> Tisch erstelle
            </>
          )}
        </button>
      </form>

      <div className="tables__bar">
        <span className="pill pill--ok tabular">Online: {onlineCount}</span>
        <button className="btn btn--ghost" onClick={fetchTables}>
          <Icon name="refresh" size={18} />
          Aktualisiere
        </button>
      </div>

      <div className="tables__grid">
        {tables.map((t) => {
          const theme = statusTheme[t.status] || { pill: '', label: t.status };
          const count = t.players?.length || 0;
          const host = t.players?.find((p: any) => p.isHost)?.user?.username || 'Unbekannt';
          const joinable = t.status === 'OPEN' || t.status === 'STARTING';
          return (
            <div key={t.id} className="card table-card">
              <div className="table-card__head">
                <div className="avatar">{String(host).charAt(0).toUpperCase()}</div>
                <div className="row__main">
                  <div className="row__title">{t.name}</div>
                  <div className="row__meta">
                    {t.team1Name || 'Team 1'} vs {t.team2Name || 'Team 2'}
                  </div>
                </div>
                <div className="table-card__side">
                  <span className={`pill ${theme.pill}`}>{theme.label}</span>
                  <span className="table-card__seats tabular">
                    {count}/{t.maxPlayers}
                  </span>
                </div>
              </div>

              <div className="row__meta">
                <strong>Host:</strong> {host} · <strong>Ziel:</strong>{' '}
                <span className="tabular">{t.targetPoints || newTargetPoints}</span> Pkt
              </div>

              {count > 0 && (
                <div className="table-card__players">
                  {t.players.map((p: any) => (
                    <span key={p.id} className={`pill${p.isHost ? ' pill--warn' : ''}`}>
                      {p.user?.username || p.userId}
                      {p.isHost ? ' ★' : ''}
                    </span>
                  ))}
                </div>
              )}

              <div className="table-card__actions">
                <button
                  disabled={joiningTableId === t.id || !joinable}
                  className="btn btn--primary"
                  onClick={() => joinTable(t.id)}
                >
                  {joiningTableId === t.id ? (
                    <>
                      <Spinner size="sm" color="#fff" /> Beitrete...
                    </>
                  ) : (
                    'Beitreten'
                  )}
                </button>
                {t.status === 'OPEN' && t.createdById === user?.id && (
                  <button className="btn" onClick={() => startTableEarly(t.id)}>
                    Jetzt starte
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!tables.length && !isLoading && (
        <EmptyState
          icon={<Icon name="table" size={44} />}
          title="Kei aktivi Tische"
          description="Sei dr Erst wo än öffentliche Tisch erstellt und Fründ iladet zum spiele!"
          action={
            <button
              onClick={() => createTable('Mein Tisch')}
              disabled={creatingTable}
              className="btn btn--primary"
            >
              {creatingTable ? (
                <>
                  <Spinner size="sm" color="#fff" /> Erstelle...
                </>
              ) : (
                '+ Erste Tisch erstelle'
              )}
            </button>
          }
        />
      )}
    </div>
  );
};

export default SwissTables;
