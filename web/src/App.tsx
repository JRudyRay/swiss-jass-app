import React, { useState, useEffect } from 'react';
import { JassGame } from './JassGame';
import { AuthForm } from './AuthForm';
import './GameTable.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

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
    
    // Clear localStorage
    localStorage.removeItem('jassToken');
    localStorage.removeItem('jassUser');
  };

  if (!isAuthenticated) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <JassGame user={user} onLogout={handleLogout} />
    </div>
  );
}

export default App;
