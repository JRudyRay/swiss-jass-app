import React, { useState, useEffect } from 'react';
import { JassGame } from './JassGame';
import EnhancedAuthForm from './components/EnhancedAuthForm';
import ErrorBoundary from './components/ErrorBoundary';
import AppHeader, { View } from './components/AppHeader';
import SwissDashboard from './components/SwissDashboard';
import SwissTables from './components/SwissTables';
import SwissFriends from './components/SwissFriends';
import Rankings from './components/Rankings';
import { API_URL, ONLINE_ENABLED } from './config';
import './GameTable.css';
import { detectLang, isLang, messages, type Lang } from './i18n';

function App() {
  // Nobody has to sign in to play: guests (user === null) get single-player.
  // An account is only needed for online play, and only when a backend exists.
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('game');
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('jassLang');
      if (isLang(saved)) return saved;
    } catch {}
    return detectLang();
  });

  useEffect(() => {
    // Check for saved token and language on mount
    const savedToken = localStorage.getItem('jassToken');
    const savedUser = localStorage.getItem('jassUser');

    if (ONLINE_ENABLED && savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {}
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'ch' ? 'gsw' : lang;
  }, [lang]);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    try {
      localStorage.setItem('jassLang', newLang);
    } catch {}
  };

  const handleLogin = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    setShowAuth(false);

    // Save to localStorage
    localStorage.setItem('jassToken', newToken);
    localStorage.setItem('jassUser', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setCurrentView('game');

    // Clear localStorage
    localStorage.removeItem('jassToken');
    localStorage.removeItem('jassUser');
  };

  if (showAuth) {
    return (
      <ErrorBoundary>
        <div className="auth-page">
          <button className="auth-back" onClick={() => setShowAuth(false)}>
            ← {messages(lang).header.backToGame}
          </button>
          <EnhancedAuthForm onLogin={handleLogin} />
        </div>
      </ErrorBoundary>
    );
  }

  // Online views need an account; fall back to the game otherwise.
  const view: View = user || currentView === 'game' ? currentView : 'game';

  return (
    <ErrorBoundary>
      <div className="app">
        <AppHeader
          user={user}
          onLogout={handleLogout}
          onSignIn={() => setShowAuth(true)}
          currentView={view}
          onViewChange={setCurrentView}
          online={ONLINE_ENABLED}
          lang={lang}
          onLangChange={handleLangChange}
        />
        <main className="app-main">
          {view === 'dashboard' && (
            <SwissDashboard user={user} token={token || ''} onNavigate={setCurrentView} />
          )}
          {view === 'game' && <JassGame user={user} onLogout={handleLogout} lang={lang} />}
          {view === 'tables' && (
            <SwissTables
              user={user}
              token={token || ''}
              onJoinGame={(tableId) => {
                console.log('Joined table:', tableId);
                setCurrentView('game');
              }}
            />
          )}
          {view === 'rankings' && (
            <Rankings
              apiUrl={API_URL || ''}
              onBack={() => setCurrentView('dashboard')}
              onReset={() => {}}
            />
          )}
          {view === 'friends' && <SwissFriends user={user} token={token || ''} />}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
