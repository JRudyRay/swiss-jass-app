import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { io, Socket } from 'socket.io-client';
import { Loading, Spinner, EmptyState } from './Loading';
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
      transports: ['websocket', 'polling']
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
        headers: { Authorization: `Bearer ${authToken.current}` }
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
          Authorization: `Bearer ${authToken.current}`
        },
        body: JSON.stringify({
          name: nameOverride || tableName || 'Table',
          maxPlayers: 4,
          gameType: newTableGameType,
          team1Name: newTeam1,
          team2Name: newTeam2,
          targetPoints: newTargetPoints
        })
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
        headers: { Authorization: `Bearer ${authToken.current}` }
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
        headers: { Authorization: `Bearer ${authToken.current}` }
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

  const statusTheme: Record<string, { bg: string; color: string; label: string }> = {
    OPEN: { bg: '#dcfce7', color: '#166534', label: 'Offen' },
    STARTING: { bg: '#fef9c3', color: '#92400e', label: 'Startet' },
    IN_PROGRESS: { bg: '#e0f2fe', color: '#1d4ed8', label: 'Am Laufe' },
    COMPLETED: { bg: '#ede9fe', color: '#5b21b6', label: 'Fertig' },
    CANCELLED: { bg: '#fee2e2', color: '#b91c1c', label: 'Abgseit' }
  };

  if (isLoading && tables.length === 0) {
    return <Loading message="Lade Tische..." />;
  }

  return (
    <div className="swiss-tables-container">
      <div className="swiss-tables-header">
        <div className="header-title">
          <span className="header-icon">🎲</span>
          <h1>Multiplayer Tische</h1>
        </div>
        <div className="header-subtitle">
          Hoste än eigene Tisch oder tritt bim ene bstehende Lobby bi. Tische upgradiere automatisch zu live Spiel, wenn alli bereit sind.
        </div>
      </div>

      <div className="table-creation-form">
        <input
          value={tableName}
          onChange={e => setTableName(e.target.value)}
          placeholder="Tisch Name"
          className="form-input"
        />
        <select
          value={newTableGameType}
          onChange={e => setNewTableGameType(e.target.value)}
          className="form-select"
        >
          <option value="schieber">Schieber</option>
        </select>
        <input
          value={newTeam1}
          onChange={e => setNewTeam1(e.target.value)}
          placeholder="Team 1 Name"
          className="form-input"
        />
        <input
          value={newTeam2}
          onChange={e => setNewTeam2(e.target.value)}
          placeholder="Team 2 Name"
          className="form-input"
        />
        <input
          type="number"
          value={newTargetPoints}
          onChange={e => setNewTargetPoints(parseInt(e.target.value) || 1000)}
          placeholder="Ziel Punkte"
          className="form-input form-input-number"
        />
        <button
          disabled={creatingTable}
          className={`btn-create ${creatingTable ? 'loading' : ''}`}
          onClick={() => createTable(tableName || 'Mein Tisch')}
        >
          {creatingTable ? (
            <>
              <Spinner size="sm" /> Erstelle...
            </>
          ) : (
            '+ Tisch erstelle'
          )}
        </button>
        <button className="btn-refresh" onClick={fetchTables}>
          🔄 Aktualisiere
        </button>
        <div className="online-indicator">
          <span className="online-dot"></span>
          Online: {onlineCount}
        </div>
      </div>

      <div className="tables-grid">
        {tables.map(t => (
          <div key={t.id} className="table-card">
            <div className="table-card-header">
              <div className="table-name">{t.name}</div>
              {(() => {
                const theme = statusTheme[t.status] || { bg: '#e5e7eb', color: '#374151', label: t.status };
                return (
                  <span
                    className="table-status"
                    style={{ background: theme.bg, color: theme.color }}
                  >
                    {theme.label}
                  </span>
                );
              })()}
            </div>
            
            <div className="table-details">
              <div>
                <strong>Host:</strong> {t.players?.find((p: any) => p.isHost)?.user?.username || 'Unbekannt'}
              </div>
              <div>
                <strong>Teams:</strong> {t.team1Name || 'Team 1'} vs {t.team2Name || 'Team 2'}
              </div>
              <div>
                <strong>Ziel:</strong> {t.targetPoints || newTargetPoints} Pkt • <strong>Spieler:</strong>{' '}
                {t.players?.length || 0}/{t.maxPlayers}
              </div>
            </div>

            {t.players && t.players.length > 0 && (
              <div className="table-players">
                {t.players.map((p: any) => (
                  <span
                    key={p.id}
                    className={`player-badge ${p.isHost ? 'host' : ''}`}
                  >
                    {p.user?.username || p.userId}
                    {p.isHost ? ' ★' : ''}
                  </span>
                ))}
              </div>
            )}

            <div className="table-actions">
              <button
                disabled={joiningTableId === t.id || (t.status !== 'OPEN' && t.status !== 'STARTING')}
                className={`btn-join ${joiningTableId === t.id ? 'loading' : ''}`}
                onClick={() => joinTable(t.id)}
              >
                {joiningTableId === t.id ? (
                  <>
                    <Spinner size="sm" /> Beitrete...
                  </>
                ) : (
                  'Beitreten'
                )}
              </button>
              {t.status === 'OPEN' && t.createdById === user?.id && (
                <button className="btn-start" onClick={() => startTableEarly(t.id)}>
                  Jetzt starte
                </button>
              )}
            </div>
          </div>
        ))}
        
        {!tables.length && !isLoading && (
          <EmptyState
            icon="🎴"
            title="Kei aktivi Tische"
            description="Sei dr Erst wo än öffentliche Tisch erstellt und Fründ iladet zum spiele!"
            action={
              <button
                onClick={() => createTable('Mein Tisch')}
                disabled={creatingTable}
                className="btn-create-first"
              >
                {creatingTable ? (
                  <>
                    <Spinner size="sm" /> Erstelle...
                  </>
                ) : (
                  '+ Erste Tisch erstelle'
                )}
              </button>
            }
          />
        )}
      </div>
    </div>
  );
};

export default SwissTables;
