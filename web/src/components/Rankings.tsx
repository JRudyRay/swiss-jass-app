import React, { useState, useEffect } from 'react';
import { Loading, EmptyState } from './Loading';
import './Rankings.css';

export type LeaderboardEntry = {
  id: string;
  username: string;
  totalWins: number;
  totalGames: number;
  totalPoints: number;
  winRate: number;
};

interface RankingsProps {
  apiUrl: string;
  onBack: () => void;
  onReset: () => void;
}

const Rankings: React.FC<RankingsProps> = ({ apiUrl, onBack, onReset }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [metric, setMetric] = useState<'totalWins' | 'totalGames' | 'totalPoints' | 'winRate'>('totalWins');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [apiUrl]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/leaderboard`);
      const j = await res.json();
      if (j.success && Array.isArray(j.leaderboard)) {
        setLeaderboard(j.leaderboard);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sorted = [...leaderboard].sort((a, b) => (b[metric] as number) - (a[metric] as number));

  const metricLabels = {
    totalWins: 'Siege',
    totalGames: 'Spiel',
    totalPoints: 'Punkte',
    winRate: 'Siegquote'
  };

  const formatValue = (entry: LeaderboardEntry, metric: string) => {
    if (metric === 'winRate') {
      return `${(entry.winRate * 100).toFixed(0)}%`;
    }
    return entry[metric as keyof LeaderboardEntry];
  };

  if (isLoading) {
    return <Loading message="Lade Rangliste..." />;
  }

  return (
    <div className="rankings-container">
      <div className="rankings-header">
        <div className="header-title">
          <span className="header-icon">🏆</span>
          <h1>Rangliste</h1>
        </div>
        <div className="header-subtitle">
          Die beschte Jass Spieler vo de Welt – sortiert nach dine Kriterie.
        </div>
      </div>

      <div className="rankings-controls">
        <div className="sort-control">
          <label className="sort-label">Sortiere nach:</label>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value as any)}
            className="sort-select"
          >
            <option value="totalWins">🏅 Siege</option>
            <option value="totalGames">🎮 Gspilti Spiel</option>
            <option value="totalPoints">⭐ Total Punkte</option>
            <option value="winRate">📊 Siegquote</option>
          </select>
        </div>
      </div>

      {sorted.length > 0 ? (
        <>
          {/* Top 3 Podium */}
          {sorted.length >= 3 && (
            <div className="podium">
              {/* 2nd Place */}
              <div className="podium-place second-place">
                <div className="podium-medal">🥈</div>
                <div className="podium-rank">2.</div>
                <div className="podium-username">{sorted[1].username}</div>
                <div className="podium-value">{formatValue(sorted[1], metric)}</div>
                <div className="podium-label">{metricLabels[metric]}</div>
              </div>

              {/* 1st Place */}
              <div className="podium-place first-place">
                <div className="podium-medal">🥇</div>
                <div className="podium-rank">1.</div>
                <div className="podium-username">{sorted[0].username}</div>
                <div className="podium-value">{formatValue(sorted[0], metric)}</div>
                <div className="podium-label">{metricLabels[metric]}</div>
                <div className="podium-crown">👑</div>
              </div>

              {/* 3rd Place */}
              <div className="podium-place third-place">
                <div className="podium-medal">🥉</div>
                <div className="podium-rank">3.</div>
                <div className="podium-username">{sorted[2].username}</div>
                <div className="podium-value">{formatValue(sorted[2], metric)}</div>
                <div className="podium-label">{metricLabels[metric]}</div>
              </div>
            </div>
          )}

          {/* Full Rankings List */}
          <div className="rankings-list">
            <div className="list-header">
              <span className="list-title">Alli Rangierige</span>
              <span className="list-count">{sorted.length} Spieler</span>
            </div>
            
            {sorted.map((entry, idx) => (
              <div key={entry.id} className={`ranking-item ${idx < 3 ? 'top-three' : ''}`}>
                <div className="ranking-position">
                  <span className="position-number">{idx + 1}</span>
                  {idx === 0 && <span className="position-icon">🥇</span>}
                  {idx === 1 && <span className="position-icon">🥈</span>}
                  {idx === 2 && <span className="position-icon">🥉</span>}
                </div>
                
                <div className="ranking-info">
                  <div className="ranking-username">{entry.username}</div>
                  <div className="ranking-stats">
                    <span>{entry.totalWins} S</span>
                    <span className="stat-divider">•</span>
                    <span>{entry.totalGames} G</span>
                    <span className="stat-divider">•</span>
                    <span>{(entry.winRate * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="ranking-value">
                  <span className="value-number">{formatValue(entry, metric)}</span>
                  <span className="value-label">{metricLabels[metric]}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon="🎯"
          title="Kei Rangierige"
          description="Spil en Match zum uf de Rangliste erschiene!"
        />
      )}
    </div>
  );
};

export default Rankings;
