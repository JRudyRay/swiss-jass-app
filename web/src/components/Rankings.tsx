import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/admin/leaderboard`);
        const j = await res.json();
        if (j.success && Array.isArray(j.leaderboard)) {
          setLeaderboard(j.leaderboard);
        }
      } catch {
        // ignore errors
      }
    })();
  }, [apiUrl]);

  const sorted = [...leaderboard].sort((a, b) => (b[metric] as number) - (a[metric] as number));

  return (
    <div style={{ marginTop: 8 }}>
      <h3>Player Rankings & Statistics</h3>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
        <label style={{ marginRight: 8 }}>
          Sort by:
          <select
            value={metric}
            onChange={e => setMetric(e.target.value as any)}
            style={{ marginLeft: 4 }}
          >
            <option value="totalWins">Wins</option>
            <option value="totalGames">Games Played</option>
            <option value="totalPoints">Total Points</option>
            <option value="winRate">Win Rate</option>
          </select>
        </label>
        <button onClick={onBack} style={{ marginRight: 8 }}>Back to Game</button>
        <button onClick={onReset} style={{ background: '#ef4444' }}>Reset Totals</button>
      </div>
      <ol style={{ margin: 0, paddingLeft: 20 }}>
        {sorted.map((u, idx) => (
          <li key={u.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: idx === 0 ? '700' : '500', color: idx === 0 ? '#059669' : '#374151' }}>
              {u.username}: {metric === 'winRate' ? (u.winRate * 100).toFixed(0) + '%' : u[metric]}{metric === 'winRate' ? ' WR' : ''}
            </span>
            {idx === 0 && <span style={{ marginLeft: 8 }}>🏆</span>}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Rankings;
