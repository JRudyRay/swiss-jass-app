import React from 'react';

interface DashboardProps {
  user: any;
  onNavigate: (view: 'game' | 'tables' | 'rankings' | 'friends') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const quickStats = [
    { label: 'Games Played', value: '42', icon: '🎮', color: '#667eea' },
    { label: 'Win Rate', value: '67%', icon: '🏆', color: '#10b981' },
    { label: 'Current Rank', value: '#12', icon: '📊', color: '#f59e0b' },
    { label: 'Friends Online', value: '3', icon: '👥', color: '#8b5cf6' },
  ];

  const recentGames = [
    { id: 1, opponent: 'Player_123', result: 'Win', score: '157-98', time: '2 hours ago' },
    { id: 2, opponent: 'JassKing', result: 'Loss', score: '134-152', time: '5 hours ago' },
    { id: 3, opponent: 'SwissAce', result: 'Win', score: '168-112', time: '1 day ago' },
  ];

  const quickActions = [
    { label: 'Quick Match', icon: '⚡', onClick: () => onNavigate('tables'), color: '#667eea' },
    { label: 'Create Table', icon: '➕', onClick: () => onNavigate('tables'), color: '#10b981' },
    { label: 'View Rankings', icon: '🏆', onClick: () => onNavigate('rankings'), color: '#f59e0b' },
    { label: 'Invite Friends', icon: '✉️', onClick: () => onNavigate('friends'), color: '#8b5cf6' },
  ];

  return (
    <div style={styles.dashboard}>
      {/* Welcome Section */}
      <div style={styles.welcome}>
        <div>
          <h2 style={styles.welcomeTitle}>Welcome back, {user?.username || 'Player'}! 🎉</h2>
          <p style={styles.welcomeSubtitle}>Ready for another round of Swiss Jass?</p>
        </div>
        <button style={styles.primaryButton} onClick={() => onNavigate('tables')}>
          <span>🎲</span>
          <span>Join a Table</span>
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div style={styles.statsGrid}>
        {quickStats.map((stat, index) => (
          <div key={index} style={styles.statCard}>
            <div style={{...styles.statIcon, background: `${stat.color}15`, color: stat.color}}>
              {stat.icon}
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        {/* Quick Actions */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="action-card"
                style={{...styles.actionCard, borderLeft: `3px solid ${action.color}`}}
                onClick={action.onClick}
              >
                <span style={{...styles.actionIcon, background: `${action.color}15`, color: action.color}}>
                  {action.icon}
                </span>
                <span style={styles.actionLabel}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Games */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Recent Games</h3>
            <button style={styles.seeAllButton} onClick={() => onNavigate('game')}>
              See all →
            </button>
          </div>
          <div style={styles.gamesList}>
            {recentGames.map((game) => (
              <div key={game.id} style={styles.gameCard}>
                <div style={styles.gameInfo}>
                  <div style={styles.gameOpponent}>vs {game.opponent}</div>
                  <div style={styles.gameTime}>{game.time}</div>
                </div>
                <div style={styles.gameResult}>
                  <span style={{
                    ...styles.resultBadge,
                    background: game.result === 'Win' ? '#10b98115' : '#ef444415',
                    color: game.result === 'Win' ? '#10b981' : '#ef4444',
                  }}>
                    {game.result}
                  </span>
                  <div style={styles.gameScore}>{game.score}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Preview */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>🏆 Top Players</h3>
          <button style={styles.seeAllButton} onClick={() => onNavigate('rankings')}>
            Full Rankings →
          </button>
        </div>
        <div style={styles.leaderboard}>
          {[
            { rank: 1, name: 'JassMaster', score: 2847, avatar: '👑' },
            { rank: 2, name: 'AlpineAce', score: 2654, avatar: '⛰️' },
            { rank: 3, name: 'CardSharp', score: 2531, avatar: '🎯' },
          ].map((player) => (
            <div key={player.rank} style={styles.leaderboardItem}>
              <div style={styles.leaderboardRank}>
                {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
              </div>
              <div style={styles.leaderboardAvatar}>{player.avatar}</div>
              <div style={styles.leaderboardInfo}>
                <div style={styles.leaderboardName}>{player.name}</div>
                <div style={styles.leaderboardScore}>{player.score.toLocaleString()} pts</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dashboard: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  welcome: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 20,
    padding: '2rem',
    marginBottom: '2rem',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    marginBottom: '0.5rem',
  },
  welcomeSubtitle: {
    fontSize: 16,
    opacity: 0.9,
    margin: 0,
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.75rem',
    background: 'white',
    color: '#667eea',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1,
    marginBottom: '0.25rem',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 500,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  section: {
    background: 'white',
    borderRadius: 16,
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  seeAllButton: {
    background: 'transparent',
    border: 'none',
    color: '#667eea',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: 6,
    transition: 'all 0.2s ease',
  },
  actionsGrid: {
    display: 'grid',
    gap: '0.75rem',
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    background: '#f9fafb',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left' as const,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  gamesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  gameCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
  },
  gameInfo: {
    flex: 1,
  },
  gameOpponent: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
    marginBottom: '0.25rem',
  },
  gameTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  gameResult: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '0.375rem',
  },
  resultBadge: {
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  gameScore: {
    fontSize: 13,
    fontWeight: 600,
    color: '#6b7280',
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
  },
  leaderboardRank: {
    fontSize: 24,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
    marginBottom: '0.125rem',
  },
  leaderboardScore: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 500,
  },
};

export default Dashboard;
