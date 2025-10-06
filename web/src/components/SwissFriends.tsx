import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { io, Socket } from 'socket.io-client';
import { Loading, EmptyState } from './Loading';
import './SwissFriends.css';

interface SwissFriendsProps {
  user: any;
  token: string;
}

const SwissFriends: React.FC<SwissFriendsProps> = ({ user, token }) => {
  const [friendInput, setFriendInput] = useState('');
  const [friendsTabData, setFriendsTabData] = useState<{
    friends: any[];
    requests: any[];
  }>({ friends: [], requests: [] });
  const [friendsLoading, setFriendsLoading] = useState(true);
  
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
      console.log('Socket connected for friends view');
      fetchFriends();
    });

    s.on('friends:updated', () => {
      fetchFriends();
    });

    socketRef.current = s;

    return () => {
      s.disconnect();
    };
  }, [user]);

  const fetchFriends = async () => {
    if (!API_URL) return;
    setFriendsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/friends`, {
        headers: { Authorization: `Bearer ${authToken.current}` }
      });
      const data = await res.json();
      if (data.success) {
        setFriendsTabData({
          friends: data.friends || [],
          requests: data.requests || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setFriendsLoading(false);
    }
  };

  const sendFriendRequest = async (username: string) => {
    if (!API_URL || !username.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken.current}`
        },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (data.success) {
        setFriendInput('');
        fetchFriends();
      }
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  };

  const respondFriendRequest = async (requestId: string, accept: boolean) => {
    if (!API_URL) return;
    try {
      const res = await fetch(`${API_URL}/api/friends/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken.current}`
        },
        body: JSON.stringify({ requestId, accept })
      });
      const data = await res.json();
      if (data.success) {
        fetchFriends();
      }
    } catch (err) {
      console.error('Failed to respond to friend request:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (friendInput.trim()) {
      sendFriendRequest(friendInput.trim());
    }
  };

  if (friendsLoading && friendsTabData.friends.length === 0 && friendsTabData.requests.length === 0) {
    return <Loading message="Lade Fründ..." />;
  }

  return (
    <div className="swiss-friends-container">
      <div className="swiss-friends-header">
        <div className="header-title">
          <span className="header-icon">👥</span>
          <h1>Fründ</h1>
        </div>
        <div className="header-subtitle">
          Füeg Fründ hinzue zum zämme Jass spiele und online Status gseh.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="friend-request-form">
        <input
          value={friendInput}
          onChange={e => setFriendInput(e.target.value)}
          placeholder="Fründ Username"
          className="form-input"
        />
        <button type="submit" className="btn-add" disabled={!friendInput.trim()}>
          + Hinzuefüge
        </button>
        <button type="button" className="btn-refresh" onClick={fetchFriends}>
          🔄 Aktualisiere
        </button>
      </form>

      <div className="friends-section">
        <h2 className="section-title">
          <span className="title-icon">✨</span>
          Fründ ({friendsTabData.friends.length})
        </h2>
        
        {friendsTabData.friends.length > 0 ? (
          <div className="friends-grid">
            {friendsTabData.friends.map(f => (
              <div key={f.id} className="friend-card">
                <div className="friend-avatar" style={{ background: f.online ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #94a3b8, #64748b)' }}>
                  {f.username.charAt(0).toUpperCase()}
                </div>
                <div className="friend-info">
                  <div className="friend-name">{f.username}</div>
                  <div className={`friend-status ${f.online ? 'online' : 'offline'}`}>
                    <span className="status-dot"></span>
                    {f.online ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="👋"
            title="Kei Fründ"
            description="Füeg Fründ hinzue zum zämme spiele"
          />
        )}
      </div>

      <div className="requests-section">
        <h2 className="section-title">
          <span className="title-icon">📨</span>
          Afrage ({friendsTabData.requests.length})
        </h2>
        
        {friendsTabData.requests.length > 0 ? (
          <div className="requests-list">
            {friendsTabData.requests.map(r => (
              <div key={r.id} className="request-card">
                <div className="request-info">
                  <div className="request-text">
                    {r.senderId === user?.id ? (
                      <>
                        <span className="request-label">An:</span>
                        <span className="request-username">{r.receiver?.username}</span>
                      </>
                    ) : (
                      <>
                        <span className="request-label">Vo:</span>
                        <span className="request-username">{r.sender?.username}</span>
                      </>
                    )}
                  </div>
                  <span className={`request-status status-${r.status.toLowerCase()}`}>
                    {r.status === 'PENDING' ? 'Pendent' : r.status === 'ACCEPTED' ? 'Akzeptiert' : 'Abglehnt'}
                  </span>
                </div>
                
                {r.status === 'PENDING' && r.receiverId === user?.id && (
                  <div className="request-actions">
                    <button
                      className="btn-accept"
                      onClick={() => respondFriendRequest(r.id, true)}
                    >
                      ✓ Akzeptiere
                    </button>
                    <button
                      className="btn-decline"
                      onClick={() => respondFriendRequest(r.id, false)}
                    >
                      ✕ Ablehne
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-requests">Kei pendenti Afrage</div>
        )}
      </div>
    </div>
  );
};

export default SwissFriends;
