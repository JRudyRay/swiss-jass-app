import React, { useState } from 'react';
import { SwissCard } from './SwissCard';

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    background: 'linear-gradient(135deg, #e2e2e2 0%, #fff 100%)',
    minHeight: '100vh',
    padding: '0',
    margin: '0',
  },
  header: {
    background: '#d32f2f',
    color: 'white',
    padding: '1.25rem 0',
    textAlign: 'center' as const,
    fontSize: '1.8rem',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  flag: { fontSize: '1.4rem', marginLeft: '0.5rem' },
  gameArea: {
    maxWidth: '900px',
    margin: '2rem auto',
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
    padding: '1.25rem',
  },
  message: { marginBottom: '1rem', color: '#333' },
  button: {
    background: '#d32f2f',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 0.9rem',
    borderRadius: '8px',
    cursor: 'pointer',
    marginRight: '0.5rem',
  },
};

export const JassGame: React.FC = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [message, setMessage] = useState('Click "Start Game" to begin!');

  const createGame = async () => {

    import React, { useState } from 'react';
    import { SwissCard } from './SwissCard';

    const styles: { [key: string]: React.CSSProperties } = {
      container: {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        background: 'linear-gradient(135deg, #e2e2e2 0%, #fff 100%)',
        minHeight: '100vh',
        padding: '0',
        margin: '0',
      },
      header: {
        background: '#d32f2f',
        color: 'white',
        padding: '1.25rem 0',
        textAlign: 'center' as const,
        fontSize: '1.8rem',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      flag: { fontSize: '1.4rem', marginLeft: '0.5rem' },
      gameArea: {
        maxWidth: '900px',
        margin: '2rem auto',
        background: '#fff',
        borderRadius: '10px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
        padding: '1.25rem',
      },
      message: { marginBottom: '1rem', color: '#333' },
      button: {
        background: '#d32f2f',
        color: '#fff',
        border: 'none',
        padding: '0.5rem 0.9rem',
        borderRadius: '8px',
        cursor: 'pointer',
        marginRight: '0.5rem',
      },
    };

    export const JassGame: React.FC = () => {
      const [gameId, setGameId] = useState<string | null>(null);
      const [gameState, setGameState] = useState<any>(null);
      const [selectedCard, setSelectedCard] = useState<string | null>(null);
      const [message, setMessage] = useState('Click \"Start Game\" to begin!');

      const createGame = async () => {
        try {
          const res = await fetch('http://localhost:3000/api/game/create', { method: 'POST' });
          const data = await res.json();
          setGameId(data.gameId);
          setMessage('Game created — loading...');
          await loadGameState(data.gameId);
        } catch (err) {
          setMessage('Could not create game — is the backend running?');
        }
      };

      const loadGameState = async (id: string) => {
        try {
          const res = await fetch(`http://localhost:3000/api/game/${id}`);
          const data = await res.json();
          setGameState(data);
          setMessage(`Trump: ${data.trumpSuit || '—'}`);
        } catch (err) {
          setMessage('Could not load game state');
        }
      };

      const playCard = async (cardId: string) => {
        if (!gameId) return;
        try {
          const res = await fetch(`http://localhost:3000/api/game/${gameId}/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: 0, cardId }),
          });
          const data = await res.json();
          if (data.success) {
            setGameState(data.gameState);
            setSelectedCard(null);
            setMessage('Card played');
          } else {
            setMessage(data.error || 'Play failed');
          }
        } catch (err) {
          setMessage('Play request failed');
        }
      };

      return (
        <div style={styles.container}>
          <div style={styles.header}>
            Swiss Jass <span style={styles.flag}>🇨🇭</span>
          </div>

          <div style={styles.gameArea}>
            <div style={styles.message}>{message}</div>

            <div style={{ marginBottom: '1rem' }}>
              <button style={styles.button} onClick={createGame}>Start Game</button>
              <button
                style={{ ...styles.button, background: '#059669' }}
                onClick={() => gameId && loadGameState(gameId)}
              >
                Refresh
              </button>
            </div>

            {gameState ? (
              <>
                <section style={{ marginBottom: '1rem' }}>
                  <h3>Table</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {gameState.table?.map((c: any, i: number) => (
                      <SwissCard key={i} card={c} />
                    ))}
                  </div>
                </section>

                <section style={{ marginBottom: '1rem' }}>
                  <h3>Your Hand</h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {gameState.hand?.map((c: any) => (
                      <div key={c.id} onClick={() => setSelectedCard(c.id)}>
                        <SwissCard card={c} isSelected={selectedCard === c.id} onClick={() => playCard(c.id)} />
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <strong>Trump:</strong> {gameState.trumpSuit || '—'}
                </section>
              </>
            ) : (
              <div>No game loaded</div>
            )}
          </div>
        </div>
      );
    };

    export default JassGame;
                    padding: '1.5rem 0',
