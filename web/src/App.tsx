import React, { useState, useEffect } from 'react';
import { JassGame } from './JassGame';
import EnhancedAuthForm from './components/EnhancedAuthForm';
import ErrorBoundary from './components/ErrorBoundary';
import AppHeader from './components/AppHeader';
import SwissDashboard from './components/SwissDashboard';
import './GameTable.css';

type View = 'dashboard' | 'game' | 'tables' | 'rankings' | 'friends';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    // Check for saved token on mount
    const savedToken = localStorage.getItem('jassToken');
    const savedUser = localStorage.getItem('jassUser');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    
    // Save to localStorage
    localStorage.setItem('jassToken', newToken);
    localStorage.setItem('jassUser', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    setCurrentView('dashboard');
    
    // Clear localStorage
    localStorage.removeItem('jassToken');
    localStorage.removeItem('jassUser');
  };

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <EnhancedAuthForm onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div style={styles.app}>
        <AppHeader 
          user={user} 
          onLogout={handleLogout}
          currentView={currentView}
          onViewChange={setCurrentView}
          unreadNotifications={0}
        />
        <main style={styles.main}>
          {currentView === 'dashboard' && (
            <SwissDashboard user={user} token={token || ''} onNavigate={setCurrentView} />
          )}
          {currentView === 'game' && (
            <JassGame user={user} onLogout={handleLogout} />
          )}
          {currentView === 'tables' && (
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>🎲</div>
              <h2 style={styles.placeholderTitle}>Tables Coming Soon</h2>
              <p style={styles.placeholderText}>Browse and join multiplayer tables</p>
            </div>
          )}
          {currentView === 'rankings' && (
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>🏆</div>
              <h2 style={styles.placeholderTitle}>Rankings Coming Soon</h2>
              <p style={styles.placeholderText}>View top players and your stats</p>
            </div>
          )}
          {currentView === 'friends' && (
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>👥</div>
              <h2 style={styles.placeholderTitle}>Friends Coming Soon</h2>
              <p style={styles.placeholderText}>Connect with other players</p>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#f5f5f7',
  },
  main: {
    minHeight: 'calc(100vh - 80px)',
    paddingTop: '1rem',
    paddingBottom: '2rem',
  },
  placeholder: {
    maxWidth: 600,
    margin: '4rem auto',
    textAlign: 'center' as const,
    padding: '3rem 2rem',
    background: 'white',
    borderRadius: 20,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  placeholderIcon: {
    fontSize: 80,
    marginBottom: '1rem',
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6b7280',
    margin: 0,
  },
};

export default App;
