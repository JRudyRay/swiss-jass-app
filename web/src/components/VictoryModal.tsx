import React, { useEffect, useState } from 'react';

interface VictoryModalProps {
  isOpen: boolean;
  winningTeam: number;
  teamNames: { 1: string; 2: string };
  finalScores: { team1: number; team2: number };
  roundHistory: Array<{ round: number; team1: number; team2: number; trump: string }>;
  onPlayAgain: () => void;
  onClose: () => void;
}

const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  winningTeam,
  teamNames,
  finalScores,
  roundHistory,
  onPlayAgain,
  onClose,
}) => {
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate confetti pieces
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));
      setConfettiPieces(pieces);

      // Play celebration sound if available
      try {
        const audio = new Audio('/assets/sounds/victory.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const winnerName = teamNames[winningTeam as 1 | 2] || `Team ${winningTeam}`;
  const winnerScore = winningTeam === 1 ? finalScores.team1 : finalScores.team2;
  const loserScore = winningTeam === 1 ? finalScores.team2 : finalScores.team1;
  const roundsPlayed = roundHistory.length;
  const averagePointsPerRound = Math.round(winnerScore / roundsPlayed);

  return (
    <div className="victory-overlay">
      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}

      <div className="victory-modal">
        <div className="victory-emoji">🏆</div>
        
        <h1 className="victory-title">
          {winnerName} Wins!
        </h1>

        <div style={{ fontSize: '20px', color: '#6b7280', marginBottom: '2rem', fontWeight: 500 }}>
          Congratulations on a well-played Swiss Jass match!
        </div>

        <div className="victory-stats">
          <div className="victory-stat-row">
            <span style={{ fontWeight: 600, color: '#374151' }}>Final Score</span>
            <span style={{ fontWeight: 700, fontSize: '18px', color: winningTeam === 1 ? '#DC291E' : '#1A7A4C' }}>
              {winnerScore} - {loserScore}
            </span>
          </div>
          
          <div className="victory-stat-row">
            <span style={{ fontWeight: 600, color: '#374151' }}>Rounds Played</span>
            <span style={{ fontWeight: 700, color: '#667eea' }}>{roundsPlayed}</span>
          </div>
          
          <div className="victory-stat-row">
            <span style={{ fontWeight: 600, color: '#374151' }}>Avg Points/Round</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>{averagePointsPerRound}</span>
          </div>

          {roundHistory.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#1f2937' }}>
                Round-by-Round Breakdown
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0.5rem' }}>
                {roundHistory.map((round, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      background: idx % 2 === 0 ? '#f9fafb' : 'white',
                      borderRadius: '6px',
                      marginBottom: '0.25rem',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#4b5563' }}>Round {round.round}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>
                      {round.trump}
                    </span>
                    <span style={{ display: 'flex', gap: '1rem' }}>
                      <span style={{ color: '#DC291E', fontWeight: 600 }}>{round.team1}</span>
                      <span style={{ color: '#9ca3af' }}>-</span>
                      <span style={{ color: '#1A7A4C', fontWeight: 600 }}>{round.team2}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="victory-buttons">
          <button className="btn btn-primary" onClick={onPlayAgain} style={{ minWidth: '160px' }}>
            🎮 Play Again
          </button>
          <button className="btn btn-secondary" onClick={onClose} style={{ minWidth: '160px' }}>
            📊 View Stats
          </button>
        </div>

        <div style={{ marginTop: '2rem', fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
          "Jass is more than a game—it's Swiss tradition." 🇨🇭
        </div>
      </div>
    </div>
  );
};

export default VictoryModal;
