import React, { useState } from 'react';
import logo from '../assets/logo.png';

interface AppHeaderProps {
  user: any;
  onLogout: () => void;
  currentView: 'dashboard' | 'game' | 'tables' | 'rankings' | 'friends';
  onViewChange: (view: 'dashboard' | 'game' | 'tables' | 'rankings' | 'friends') => void;
  unreadNotifications?: number;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  user, 
  onLogout, 
  currentView, 
  onViewChange,
  unreadNotifications = 0 
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '🏠' },
    { id: 'game' as const, label: 'Game', icon: '🎮' },
    { id: 'tables' as const, label: 'Tables', icon: '🎲' },
    { id: 'rankings' as const, label: 'Rankings', icon: '🏆' },
    { id: 'friends' as const, label: 'Friends', icon: '👥' },
  ];

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        {/* Logo and Brand */}
        <div style={styles.brand}>
          <img src={logo} alt="Swiss Jass" style={styles.logo} />
          <div style={styles.brandText}>
            <h1 style={styles.title}>Swiss Jass</h1>
            <p style={styles.subtitle}>🇨🇭 Traditional Card Game</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={{
                ...styles.navButton,
                ...(currentView === item.id ? styles.navButtonActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Actions */}
        <div style={styles.actions}>
          {/* Notifications */}
          <button 
            style={styles.iconButton}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <span style={styles.iconButtonIcon}>🔔</span>
            {unreadNotifications > 0 && (
              <span style={styles.badge}>{unreadNotifications}</span>
            )}
          </button>

          {/* User Menu */}
          <div style={styles.userMenuWrapper}>
            <button
              style={styles.userButton}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div style={styles.userAvatar}>
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span style={styles.username}>{user?.username || 'Guest'}</span>
              <span style={styles.chevron}>▼</span>
            </button>

            {showUserMenu && (
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <div style={styles.dropdownUserInfo}>
                    <div style={{...styles.userAvatar, width: 48, height: 48, fontSize: 20}}>
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div style={styles.dropdownUsername}>{user?.username || 'Guest'}</div>
                      <div style={styles.dropdownEmail}>{user?.email || 'guest@jass.ch'}</div>
                    </div>
                  </div>
                </div>
                <div style={styles.dropdownDivider} />
                <button style={styles.dropdownItem}>
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
                <button style={styles.dropdownItem}>
                  <span>📊</span>
                  <span>My Stats</span>
                </button>
                <button style={styles.dropdownItem}>
                  <span>🎨</span>
                  <span>Themes</span>
                </button>
                <div style={styles.dropdownDivider} />
                <button style={{...styles.dropdownItem, color: '#ef4444'}} onClick={onLogout}>
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 1000,
    background: 'linear-gradient(135deg, #FF0000 0%, #DC143C 100%)',
    backdropFilter: 'blur(20px)',
    borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 20px rgba(220, 20, 60, 0.3)',
  },
  headerContent: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '1rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '2rem',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.125rem',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'white',
    margin: 0,
    lineHeight: 1,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    margin: 0,
    fontWeight: 500,
    lineHeight: 1,
  },
  nav: {
    display: 'flex',
    gap: '0.5rem',
    flex: 1,
    justifyContent: 'center',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    border: '2px solid transparent',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.9)',
    transition: 'all 0.2s ease',
    position: 'relative' as const,
  },
  navButtonActive: {
    background: 'white',
    color: '#DC143C',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  navIcon: {
    fontSize: 18,
  },
  navLabel: {
    fontSize: 14,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  iconButton: {
    position: 'relative' as const,
    width: 40,
    height: 40,
    border: 'none',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    color: 'white',
  },
  iconButtonIcon: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    background: '#ef4444',
    color: 'white',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMenuWrapper: {
    position: 'relative' as const,
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.375rem 0.75rem 0.375rem 0.375rem',
    border: '1px solid #e5e7eb',
    background: 'white',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
  username: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  chevron: {
    fontSize: 10,
    color: '#9ca3af',
  },
  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: 240,
    background: 'white',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    padding: '0.5rem',
    animation: 'slideInDown 0.2s ease',
  },
  dropdownHeader: {
    padding: '0.75rem',
  },
  dropdownUserInfo: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  dropdownUsername: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  dropdownEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  dropdownDivider: {
    height: 1,
    background: '#e5e7eb',
    margin: '0.5rem 0',
  },
  dropdownItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 0.75rem',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    textAlign: 'left' as const,
    transition: 'all 0.15s ease',
  },
};

export default AppHeader;
