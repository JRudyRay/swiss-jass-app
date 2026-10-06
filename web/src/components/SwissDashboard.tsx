import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import Icon, { IconName } from './Icon';
import './SwissDashboard.css';

interface DashboardProps {
  user: any;
  token: string;
  onNavigate: (view: 'game' | 'tables' | 'rankings' | 'friends') => void;
}

interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  winRate: number;
  trueskillMu: number;
  trueskillSigma: number;
}

const SwissDashboard: React.FC<DashboardProps> = ({ user, token, onNavigate }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlinePlayers, setOnlinePlayers] = useState(0);

  useEffect(() => {
    fetchUserStats();
    fetchOnlineCount();
  }, [user]);

  const fetchUserStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/user/${user.id}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      if (response.ok) {
        const data = await response.json();
        // For now, we don't have online count, so we'll skip this
        // setOnlinePlayers(data.onlineCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch online count:', error);
    }
  };

  const quickActions = [
    {
      label: 'Start Game',
      icon: 'play' as IconName,
      onClick: () => onNavigate('game'),
      description: 'Play Swiss Jass now',
    },
    {
      label: 'Join Table',
      icon: 'table' as IconName,
      onClick: () => onNavigate('tables'),
      description: 'Find a table to join',
    },
    {
      label: 'Rankings',
      icon: 'trophy' as IconName,
      onClick: () => onNavigate('rankings'),
      description: 'View player rankings',
    },
    {
      label: 'Friends',
      icon: 'friends' as IconName,
      onClick: () => onNavigate('friends'),
      description: 'Manage your friends',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guete Morge';
    if (hour < 18) return 'Grüezi';
    return 'Guete Abig';
  };

  const winRate =
    stats && stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const statItems = stats
    ? [
        { icon: 'play' as IconName, value: stats.gamesPlayed, label: 'Games Played' },
        { icon: 'trophy' as IconName, value: stats.gamesWon, label: 'Games Won' },
        { icon: 'chart' as IconName, value: `${winRate}%`, label: 'Win Rate' },
        {
          icon: 'star' as IconName,
          value: Math.round(stats.trueskillMu || 25),
          label: 'Skill Rating',
        },
      ]
    : [];

  return (
    <div className="page dash">
      <section className="card dash__hero">
        <div className="dash__hero-text">
          <h1 className="page__title">
            {getGreeting()}, {user?.firstName || user?.username}!
          </h1>
          <p className="page__sub">Ready for a game of Swiss Jass?</p>
        </div>
        <button className="btn btn--primary btn--big dash__play" onClick={() => onNavigate('game')}>
          <Icon name="play" size={22} />
          Play Now
        </button>
      </section>

      {loading && (
        <div className="dash__stats" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton dash__skel" />
          ))}
        </div>
      )}

      {stats && (
        <div className="dash__stats">
          {statItems.map((it) => (
            <div key={it.label} className="card dash__stat">
              <span className="dash__stat-icon">
                <Icon name={it.icon} size={20} />
              </span>
              <div>
                <div className="dash__stat-value tabular">{it.value}</div>
                <div className="dash__stat-label">{it.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !stats?.gamesPlayed && (
        <section className="card dash__first">
          <h3 className="empty__title">Welcome to Swiss Jass!</h3>
          <p className="empty__text">Start your first game to see your statistics here.</p>
          <button className="btn btn--primary" onClick={() => onNavigate('game')}>
            Start Your First Game
          </button>
        </section>
      )}

      <h2 className="dash__section">Quick Actions</h2>
      <div className="dash__actions">
        {quickActions.map((action) => (
          <button key={action.label} className="row dash__action" onClick={action.onClick}>
            <span className="dash__action-icon">
              <Icon name={action.icon} size={22} />
            </span>
            <span className="row__main">
              <span className="row__title dash__block">{action.label}</span>
              <span className="row__meta dash__block">{action.description}</span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        ))}
      </div>

      <aside className="dash__tip">
        <Icon name="bulb" size={22} />
        <div>
          <h4>Did you know?</h4>
          <p>
            Jass is the most popular card game in Switzerland, with regional variations played
            across all cantons. Schieber is the most common variant!
          </p>
        </div>
      </aside>
    </div>
  );
};

export default SwissDashboard;
