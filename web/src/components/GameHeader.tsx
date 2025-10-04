import React from 'react';

interface GameHeaderProps {
  lang: 'en' | 'ch';
  onLangChange: (lang: 'en' | 'ch') => void;
  onLogout?: () => void;
  username?: string;
}

const GameHeader: React.FC<GameHeaderProps> = ({ lang, onLangChange, onLogout, username }) => {
  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #DC291E 0%, #A42423 100%)',
    color: 'white',
    padding: '1.5rem 2rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    position: 'relative',
    overflow: 'hidden',
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '28px',
    fontWeight: 900,
    letterSpacing: '0.5px',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
  };

  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  };

  const langButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    background: active ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    backdropFilter: 'blur(10px)',
  });

  const userBadgeStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  return (
    <header style={headerStyle}>
      {/* Decorative Swiss cross pattern */}
      <div
        style={{
          position: 'absolute',
          right: '-50px',
          top: '-50px',
          fontSize: '200px',
          opacity: 0.1,
          transform: 'rotate(15deg)',
          pointerEvents: 'none',
        }}
      >
        🇨🇭
      </div>

      <div style={logoStyle}>
        <span>🃏</span>
        <span>Swiss Jass</span>
      </div>

      <div style={controlsStyle}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.2)', padding: '0.25rem', borderRadius: '10px' }}>
          <button
            style={langButtonStyle(lang === 'en')}
            onClick={() => onLangChange('en')}
            onMouseEnter={(e) => {
              if (lang !== 'en') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (lang !== 'en') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }
            }}
          >
            🇬🇧 English
          </button>
          <button
            style={langButtonStyle(lang === 'ch')}
            onClick={() => onLangChange('ch')}
            onMouseEnter={(e) => {
              if (lang !== 'ch') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (lang !== 'ch') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }
            }}
          >
            🇨🇭 Schwyzerdütsch
          </button>
        </div>

        {username && (
          <div style={userBadgeStyle}>
            <span>👤</span>
            <span>{username}</span>
          </div>
        )}

        {onLogout && (
          <button
            className="btn"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              padding: '0.5rem 1rem',
              fontSize: '14px',
            }}
            onClick={onLogout}
          >
            🚪 Logout
          </button>
        )}
      </div>
    </header>
  );
};

export default GameHeader;
