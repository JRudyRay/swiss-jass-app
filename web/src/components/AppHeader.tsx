import React, { useState } from 'react';
import logo from '../assets/logo.png';

export type View = 'dashboard' | 'game' | 'tables' | 'rankings' | 'friends';

interface AppHeaderProps {
  user: any | null;
  onLogout: () => void;
  onSignIn: () => void;
  currentView: View;
  onViewChange: (view: View) => void;
  online: boolean;
  lang: 'en' | 'ch';
  onLangChange: (lang: 'en' | 'ch') => void;
}

const L = {
  en: { play: 'Play', home: 'Home', tables: 'Tables', rankings: 'Rankings', friends: 'Friends', signIn: 'Sign in', logout: 'Log out', subtitle: 'Swiss Schieber' },
  ch: { play: 'Spiele', home: 'Start', tables: 'Tisch', rankings: 'Rangliste', friends: 'Fründe', signIn: 'Aamelde', logout: 'Abmelde', subtitle: 'Schwizer Schieber' },
};

const AppHeader: React.FC<AppHeaderProps> = ({ user, onLogout, onSignIn, currentView, onViewChange, online, lang, onLangChange }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const t = L[lang];

  // Online views only make sense with a backend and an account.
  const navItems: { id: View; label: string; icon: string }[] = [{ id: 'game', label: t.play, icon: '🃏' }];
  if (online && user) {
    navItems.push(
      { id: 'dashboard', label: t.home, icon: '🏠' },
      { id: 'tables', label: t.tables, icon: '🎲' },
      { id: 'rankings', label: t.rankings, icon: '🏆' },
      { id: 'friends', label: t.friends, icon: '👥' },
    );
  }

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <button style={styles.brand} onClick={() => onViewChange('game')} aria-label="Swiss Jass">
          <img src={logo} alt="" style={styles.logo} />
          <div style={styles.brandText}>
            <span style={styles.title}>Swiss Jass</span>
            <span style={styles.subtitle}>🇨🇭 {t.subtitle}</span>
          </div>
        </button>

        {navItems.length > 1 && (
          <nav style={styles.nav}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                style={{ ...styles.navButton, ...(currentView === item.id ? styles.navButtonActive : {}) }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        )}

        <div style={styles.actions}>
          <div style={styles.langSelector}>
            {(['en', 'ch'] as const).map((l) => (
              <button
                key={l}
                style={{ ...styles.langButton, ...(lang === l ? styles.langButtonActive : {}) }}
                onClick={() => onLangChange(l)}
              >
                {l === 'en' ? 'EN' : 'CH'}
              </button>
            ))}
          </div>

          {online && !user && (
            <button style={styles.signInButton} onClick={onSignIn}>{t.signIn}</button>
          )}

          {user && (
            <div style={{ position: 'relative' }}>
              <button style={styles.userButton} onClick={() => setShowUserMenu(!showUserMenu)} aria-label={user.username}>
                <div style={styles.userAvatar}>{user.username?.[0]?.toUpperCase() || '?'}</div>
              </button>
              {showUserMenu && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownUsername}>{user.username}</div>
                  <button style={styles.dropdownItem} onClick={() => { setShowUserMenu(false); onLogout(); }}>
                    🚪 {t.logout}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    background: 'linear-gradient(135deg, #FF0000 0%, #DC143C 100%)',
    boxShadow: '0 2px 12px rgba(220, 20, 60, 0.3)',
  },
  headerContent: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '0.5rem 1rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem 1rem',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  logo: { width: 40, height: 40, borderRadius: 10 },
  brandText: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  title: { fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1 },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 500, lineHeight: 1 },
  nav: { display: 'flex', gap: 4, flexWrap: 'wrap', order: 3, width: '100%', justifyContent: 'center' },
  navButton: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(255,255,255,0.12)',
    border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  navButtonActive: { background: 'white', color: '#DC143C' },
  actions: { display: 'flex', alignItems: 'center', gap: 8 },
  langSelector: { display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 3 },
  langButton: { padding: '6px 10px', background: 'transparent', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  langButtonActive: { background: 'white', color: '#DC143C' },
  signInButton: { padding: '8px 14px', background: 'white', color: '#DC143C', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  userButton: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  userAvatar: {
    width: 36, height: 36, borderRadius: '50%', background: 'white', color: '#DC143C', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16,
  },
  dropdown: {
    position: 'absolute', right: 0, top: 44, minWidth: 180, background: 'white', borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 8, zIndex: 1001,
  },
  dropdownUsername: { padding: '8px 10px', fontWeight: 700, color: '#111827', borderBottom: '1px solid #eee', marginBottom: 4 },
  dropdownItem: { width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', borderRadius: 8, color: '#ef4444', fontSize: 14, cursor: 'pointer' },
};

export default AppHeader;
