import React, { useState, useEffect } from 'react';
import { Loading, EmptyState } from './Loading';
import Icon from './Icon';
import './Rankings.css';
import { authFetch } from '../authFetch';
import { messages, type Lang } from '../i18n';

export type LeaderboardEntry = {
  id: string;
  username: string;
  totalWins: number;
  totalGames: number;
  totalPoints: number;
  winRate: number;
};

interface RankingsProps {
  lang: Lang;
  apiUrl: string;
  onBack: () => void;
  onReset: () => void;
}

const Rankings: React.FC<RankingsProps> = ({ lang, apiUrl, onBack, onReset }) => {
  const t = messages(lang).rankings;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [metric, setMetric] = useState<'totalWins' | 'totalGames' | 'totalPoints' | 'winRate'>(
    'totalWins',
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [apiUrl]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${apiUrl}/api/admin/leaderboard`);
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
    totalWins: t.labelWins,
    totalGames: t.labelGames,
    totalPoints: t.labelPoints,
    winRate: t.labelRate,
  };

  const formatValue = (entry: LeaderboardEntry, metric: string) => {
    if (metric === 'winRate') {
      return `${(entry.winRate * 100).toFixed(0)}%`;
    }
    return entry[metric as keyof LeaderboardEntry];
  };

  if (isLoading) {
    return <Loading message={t.loading} />;
  }

  const podiumOrder = sorted.length >= 3 ? [1, 0, 2] : [];
  const rest = sorted.length >= 3 ? sorted.slice(3) : sorted;
  const restOffset = sorted.length >= 3 ? 3 : 0;

  return (
    <div className="page rank">
      <h1 className="page__title rank__title">
        <Icon name="trophy" size={26} />
        {t.title}
      </h1>
      <p className="page__sub">{t.sub}</p>

      <div className="rank__sort">
        <label className="rank__sort-label" htmlFor="rank-metric">
          {t.sortBy}
        </label>
        <select
          id="rank-metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as any)}
          className="input rank__select"
        >
          <option value="totalWins">{t.optWins}</option>
          <option value="totalGames">{t.optGames}</option>
          <option value="totalPoints">{t.optPoints}</option>
          <option value="winRate">{t.optRate}</option>
        </select>
      </div>

      {sorted.length > 0 ? (
        <>
          {podiumOrder.length > 0 && (
            <div className="rank__podium">
              {podiumOrder.map((idx) => (
                <div key={sorted[idx].id} className={`rank__place rank__place--${idx + 1}`}>
                  <div className="avatar rank__avatar">
                    {sorted[idx].username.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="rank__name">{sorted[idx].username}</div>
                  <div className="rank__value tabular">{formatValue(sorted[idx], metric)}</div>
                  <div className="rank__label">{metricLabels[metric]}</div>
                  <div className="rank__step tabular">{idx + 1}</div>
                </div>
              ))}
            </div>
          )}

          <div className="rank__head">
            <span className="rank__head-title">{t.all}</span>
            <span className="rank__head-count">{t.players(sorted.length)}</span>
          </div>

          <div className="list">
            {rest.map((entry, i) => (
              <div key={entry.id} className="row rank__row">
                <span className="rank__pos tabular">{i + restOffset + 1}</span>
                <div className="row__main">
                  <div className="row__title">{entry.username}</div>
                  <div className="row__meta tabular">
                    {entry.totalWins} {t.winsShort} · {entry.totalGames} {t.gamesShort} ·{' '}
                    {(entry.winRate * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="rank__row-value">
                  <span className="rank__row-num tabular">{formatValue(entry, metric)}</span>
                  <span className="rank__label">{metricLabels[metric]}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Icon name="trophy" size={44} />}
          title={t.emptyTitle}
          description={t.emptyText}
          action={
            <button className="btn btn--primary" onClick={onBack}>
              {t.back}
            </button>
          }
        />
      )}
    </div>
  );
};

export default Rankings;
