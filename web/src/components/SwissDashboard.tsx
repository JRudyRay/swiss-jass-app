import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import Icon, { IconName } from './Icon';
import './SwissDashboard.css';
import { messages, type Lang } from '../i18n';

interface DashboardProps {
  lang: Lang;
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

const SwissDashboard: React.FC<DashboardProps> = ({ lang, user, token, onNavigate }) => {
  const t = messages(lang).dashboard;
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
      label: t.actionStart,
      icon: 'play' as IconName,
      onClick: () => onNavigate('game'),
      description: t.actionStartDesc,
    },
    {
      label: t.actionJoin,
      icon: 'table' as IconName,
      onClick: () => onNavigate('tables'),
      description: t.actionJoinDesc,
    },
    {
      label: t.actionRank,
      icon: 'trophy' as IconName,
      onClick: () => onNavigate('rankings'),
      description: t.actionRankDesc,
    },
    {
      label: t.actionFriends,
      icon: 'friends' as IconName,
      onClick: () => onNavigate('friends'),
      description: t.actionFriendsDesc,
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.morning;
    if (hour < 18) return t.day;
    return t.evening;
  };

  const winRate =
    stats && stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const statItems = stats
    ? [
        { icon: 'play' as IconName, value: stats.gamesPlayed, label: t.statPlayed },
        { icon: 'trophy' as IconName, value: stats.gamesWon, label: t.statWon },
        { icon: 'chart' as IconName, value: `${winRate}%`, label: t.statRate },
        {
          icon: 'star' as IconName,
          value: Math.round(stats.trueskillMu || 25),
          label: t.statSkill,
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
          <p className="page__sub">{t.ready}</p>
        </div>
        <button className="btn btn--primary btn--big dash__play" onClick={() => onNavigate('game')}>
          <Icon name="play" size={22} />
          {t.playNow}
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
          <h3 className="empty__title">{t.firstTitle}</h3>
          <p className="empty__text">{t.firstText}</p>
          <button className="btn btn--primary" onClick={() => onNavigate('game')}>
            {t.firstBtn}
          </button>
        </section>
      )}

      <h2 className="dash__section">{t.quick}</h2>
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
          <h4>{t.tipTitle}</h4>
          <p>{t.tip}</p>
        </div>
      </aside>
    </div>
  );
};

export default SwissDashboard;
