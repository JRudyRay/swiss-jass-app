import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { io, Socket } from 'socket.io-client';
import { Loading, EmptyState } from './Loading';
import Icon from './Icon';
import './SwissFriends.css';
import { messages, type Lang } from '../i18n';

interface SwissFriendsProps {
  lang: Lang;
  user: any;
  token: string;
}

const SwissFriends: React.FC<SwissFriendsProps> = ({ lang, user, token }) => {
  const t = messages(lang).friends;
  const [friendInput, setFriendInput] = useState('');
  const [friendsTabData, setFriendsTabData] = useState<{
    friends: any[];
    requests: any[];
  }>({ friends: [], requests: [] });
  const [friendsLoading, setFriendsLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement | null>(null);
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
        headers: { Authorization: `Bearer ${authToken.current}` },
      });
      const data = await res.json();
      if (data.success) {
        setFriendsTabData({
          friends: data.friends || [],
          requests: data.requests || [],
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
          Authorization: `Bearer ${authToken.current}`,
        },
        body: JSON.stringify({ username }),
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
          Authorization: `Bearer ${authToken.current}`,
        },
        body: JSON.stringify({ requestId, accept }),
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

  if (
    friendsLoading &&
    friendsTabData.friends.length === 0 &&
    friendsTabData.requests.length === 0
  ) {
    return <Loading message={t.loading} />;
  }

  const requestLabel = (status: string) =>
    status === 'PENDING' ? t.pending : status === 'ACCEPTED' ? t.accepted : t.declined;
  const requestPill = (status: string) =>
    status === 'PENDING' ? 'pill--warn' : status === 'ACCEPTED' ? 'pill--ok' : 'pill--live';

  return (
    <div className="page friends">
      <h1 className="page__title friends__title">
        <Icon name="friends" size={26} />
        {t.title}
      </h1>
      <p className="page__sub">{t.sub}</p>

      <form onSubmit={handleSubmit} className="friends__form">
        <input
          ref={inputRef}
          value={friendInput}
          onChange={(e) => setFriendInput(e.target.value)}
          placeholder={t.inputPh}
          aria-label={t.inputPh}
          className="input friends__input"
        />
        <button type="submit" className="btn btn--primary" disabled={!friendInput.trim()}>
          <Icon name="plus" size={18} />
          {t.add}
        </button>
        <button type="button" className="btn" onClick={fetchFriends}>
          <Icon name="refresh" size={18} />
          {t.refresh}
        </button>
      </form>

      <h2 className="friends__section">{t.friendsH(friendsTabData.friends.length)}</h2>
      {friendsTabData.friends.length > 0 ? (
        <div className="list friends__grid">
          {friendsTabData.friends.map((f) => (
            <div key={f.id} className="row">
              <div className={`avatar${f.online ? '' : ' avatar--off'}`}>
                {f.username.charAt(0).toUpperCase()}
              </div>
              <div className="row__main">
                <div className="row__title">{f.username}</div>
              </div>
              <span className={`pill ${f.online ? 'pill--ok' : ''}`}>
                {f.online ? t.online : t.offline}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Icon name="friends" size={44} />}
          title={t.emptyTitle}
          description={t.emptyText}
          action={
            <button className="btn btn--primary" onClick={() => inputRef.current?.focus()}>
              <Icon name="plus" size={18} />
              {t.add}
            </button>
          }
        />
      )}

      <h2 className="friends__section">{t.requestsH(friendsTabData.requests.length)}</h2>
      {friendsTabData.requests.length > 0 ? (
        <div className="list">
          {friendsTabData.requests.map((r) => (
            <div key={r.id} className="row friends__request">
              <div className="row__main">
                <div className="row__title">
                  <span className="row__meta">{r.senderId === user?.id ? t.to : t.from}</span>{' '}
                  {r.senderId === user?.id ? r.receiver?.username : r.sender?.username}
                </div>
              </div>
              <span className={`pill ${requestPill(r.status)}`}>{requestLabel(r.status)}</span>
              {r.status === 'PENDING' && r.receiverId === user?.id && (
                <div className="friends__actions">
                  <button
                    className="btn btn--primary"
                    onClick={() => respondFriendRequest(r.id, true)}
                  >
                    <Icon name="check" size={18} />
                    {t.accept}
                  </button>
                  <button
                    className="btn btn--danger"
                    onClick={() => respondFriendRequest(r.id, false)}
                  >
                    <Icon name="close" size={18} />
                    {t.decline}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="friends__none">{t.noRequests}</p>
      )}
    </div>
  );
};

export default SwissFriends;
