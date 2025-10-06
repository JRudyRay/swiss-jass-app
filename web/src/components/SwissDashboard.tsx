import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
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
          'Authorization': `Bearer ${token}`
        }
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
      icon: '🎴', 
      onClick: () => onNavigate('game'), 
      description: 'Play Swiss Jass now'
    },
    { 
      label: 'Join Table', 
      icon: '🪑', 
      onClick: () => onNavigate('tables'), 
      description: 'Find a table to join'
    },
    { 
      label: 'Rankings', 
      icon: '🏔️', 
      onClick: () => onNavigate('rankings'), 
      description: 'View player rankings'
    },
    { 
      label: 'Friends', 
      icon: '🤝', 
      onClick: () => onNavigate('friends'), 
      description: 'Manage your friends'
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guete Morge';
    if (hour < 18) return 'Grüezi';
    return 'Guete Abig';
  };

  return (
    <div className="swiss-dashboard">
      {/* Swiss-themed Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <div className="swiss-pattern"></div>
          <div className="welcome-text">
            <h1 className="welcome-title">
              {getGreeting()}, {user?.firstName || user?.username}! 🇨🇭
            </h1>
            <p className="welcome-subtitle">
              Ready for a game of Swiss Jass?
            </p>
          </div>
        </div>
        <button className="play-now-btn" onClick={() => onNavigate('game')}>
          <span className="btn-icon">🎴</span>
          <span className="btn-text">Play Now</span>
        </button>
      </div>

      {/* Stats Overview - Only Real Data */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon swiss-red">🎮</div>
            <div className="stat-content">
              <div className="stat-value">{stats.gamesPlayed}</div>
              <div className="stat-label">Games Played</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon swiss-gold">🏆</div>
            <div className="stat-content">
              <div className="stat-value">{stats.gamesWon}</div>
              <div className="stat-label">Games Won</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon swiss-green">📊</div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.gamesPlayed > 0 
                  ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
                  : 0}%
              </div>
              <div className="stat-label">Win Rate</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon swiss-blue">⭐</div>
            <div className="stat-content">
              <div className="stat-value">
                {Math.round(stats.trueskillMu || 25)}
              </div>
              <div className="stat-label">Skill Rating</div>
            </div>
          </div>
        </div>
      )}

      {/* No Stats Yet - First Time User */}
      {!loading && !stats?.gamesPlayed && (
        <div className="no-stats-card">
          <div className="no-stats-icon">🎴</div>
          <h3 className="no-stats-title">Welcome to Swiss Jass!</h3>
          <p className="no-stats-text">
            Start your first game to see your statistics here.
          </p>
          <button className="start-first-game-btn" onClick={() => onNavigate('game')}>
            Start Your First Game
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="action-card"
              onClick={action.onClick}
            >
              <div className="action-icon">{action.icon}</div>
              <div className="action-content">
                <div className="action-label">{action.label}</div>
                <div className="action-description">{action.description}</div>
              </div>
              <div className="action-arrow">→</div>
            </button>
          ))}
        </div>
      </div>

      {/* Swiss Facts / Tips */}
      <div className="swiss-tip-card">
        <div className="swiss-tip-icon">💡</div>
        <div className="swiss-tip-content">
          <h4 className="swiss-tip-title">Did you know?</h4>
          <p className="swiss-tip-text">
            Jass is the most popular card game in Switzerland, with regional variations 
            played across all cantons. Schieber is the most common variant!
          </p>
        </div>
      </div>
    </div>
  );
};

export default SwissDashboard;
