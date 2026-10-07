import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { io, Socket } from 'socket.io-client';
import { Loading, Spinner, EmptyState } from './Loading';
import Icon from './Icon';
import './SwissTables.css';
import { messages, type Lang } from '../i18n';

interface SwissTablesProps {
  lang: Lang;
  user: any;
  token: string;
  onJoinGame?: (tableId: string) => void;
}

const SwissTables: React.FC<SwissTablesProps> = ({ lang, user, token, onJoinGame }) => {
  const t = messages(lang).tables;
  const [tables, setTables] = useState<any[]>([]);
  const [tableName, setTableName] = useState('');
  const [newTableGameType, setNewTableGameType] = useState('schieber');
  const [newTeam1, setNewTeam1] = useState(t.defaultTeam1);
  const [newTeam2, setNewTeam2] = useState(t.defaultTeam2);
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
    OPEN: { pill: 'pill--ok', label: t.open },
    STARTING: { pill: 'pill--warn', label: t.starting },
    IN_PROGRESS: { pill: 'pill--live', label: t.live },
    COMPLETED: { pill: '', label: t.done },
    CANCELLED: { pill: '', label: t.cancelled },
  };

  if (isLoading && tables.length === 0) {
    return <Loading message={t.loading} />;
  }

  return (
    <div className="page tables">
      <h1 className="page__title tables__title">
        <Icon name="table" size={26} />
        {t.title}
      </h1>
      <p className="page__sub">{t.sub}</p>

      <form
        className="card tables__form"
        onSubmit={(e) => {
          e.preventDefault();
          createTable(tableName || t.defaultName);
        }}
      >
        <input
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder={t.namePh}
          aria-label={t.namePh}
          className="input tables__name"
        />
        <select
          value={newTableGameType}
          aria-label={t.gameType}
          onChange={(e) => setNewTableGameType(e.target.value)}
          className="input"
        >
          <option value="schieber">Schieber</option>
        </select>
        <input
          value={newTeam1}
          onChange={(e) => setNewTeam1(e.target.value)}
          placeholder={t.team1Ph}
          aria-label={t.team1Ph}
          className="input"
        />
        <input
          value={newTeam2}
          onChange={(e) => setNewTeam2(e.target.value)}
          placeholder={t.team2Ph}
          aria-label={t.team2Ph}
          className="input"
        />
        <input
          type="number"
          inputMode="numeric"
          value={newTargetPoints}
          onChange={(e) => setNewTargetPoints(parseInt(e.target.value) || 1000)}
          placeholder={t.targetPh}
          aria-label={t.targetPh}
          className="input tabular"
        />
        <button disabled={creatingTable} className="btn btn--primary tables__create" type="submit">
          {creatingTable ? (
            <>
              <Spinner size="sm" color="#fff" /> {t.creating}
            </>
          ) : (
            <>
              <Icon name="plus" size={18} /> {t.create}
            </>
          )}
        </button>
      </form>

      <div className="tables__bar">
        <span className="pill pill--ok tabular">{t.online(onlineCount)}</span>
        <button className="btn btn--ghost" onClick={fetchTables}>
          <Icon name="refresh" size={18} />
          {t.refresh}
        </button>
      </div>

      <div className="tables__grid">
        {tables.map((tb) => {
          const theme = statusTheme[tb.status] || { pill: '', label: tb.status };
          const count = tb.players?.length || 0;
          const host = tb.players?.find((p: any) => p.isHost)?.user?.username || t.unknown;
          const joinable = tb.status === 'OPEN' || tb.status === 'STARTING';
          return (
            <div key={tb.id} className="card table-card">
              <div className="table-card__head">
                <div className="avatar">{String(host).charAt(0).toUpperCase()}</div>
                <div className="row__main">
                  <div className="row__title">{tb.name}</div>
                  <div className="row__meta">
                    {tb.team1Name || 'Team 1'} vs {tb.team2Name || 'Team 2'}
                  </div>
                </div>
                <div className="table-card__side">
                  <span className={`pill ${theme.pill}`}>{theme.label}</span>
                  <span className="table-card__seats tabular">
                    {count}/{tb.maxPlayers}
                  </span>
                </div>
              </div>

              <div className="row__meta">
                <strong>{t.host}:</strong> {host} · <strong>{t.goal}:</strong>{' '}
                <span className="tabular">{tb.targetPoints || newTargetPoints}</span> {t.pts}
              </div>

              {count > 0 && (
                <div className="table-card__players">
                  {tb.players.map((p: any) => (
                    <span key={p.id} className={`pill${p.isHost ? ' pill--warn' : ''}`}>
                      {p.user?.username || p.userId}
                      {p.isHost ? ' ★' : ''}
                    </span>
                  ))}
                </div>
              )}

              <div className="table-card__actions">
                <button
                  disabled={joiningTableId === tb.id || !joinable}
                  className="btn btn--primary"
                  onClick={() => joinTable(tb.id)}
                >
                  {joiningTableId === tb.id ? (
                    <>
                      <Spinner size="sm" color="#fff" /> {t.joining}
                    </>
                  ) : (
                    t.join
                  )}
                </button>
                {tb.status === 'OPEN' && tb.createdById === user?.id && (
                  <button className="btn" onClick={() => startTableEarly(tb.id)}>
                    {t.startNow}
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
          title={t.emptyTitle}
          description={t.emptyText}
          action={
            <button
              onClick={() => createTable(t.defaultName)}
              disabled={creatingTable}
              className="btn btn--primary"
            >
              {creatingTable ? (
                <>
                  <Spinner size="sm" color="#fff" /> {t.creating}
                </>
              ) : (
                t.firstTable
              )}
            </button>
          }
        />
      )}
    </div>
  );
};

export default SwissTables;
