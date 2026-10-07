import React from 'react';
import { messages, type Lang } from '../../i18n';
import { TEAM_COLORS } from '../table/ScoreBar';
import type { SavedGameSummary } from './savedGame';

// "Continue game" card for a saved, unfinished single-player match.
const ResumeCard: React.FC<{
  lang: Lang;
  saved: SavedGameSummary;
  onContinue: () => void;
  onNewGame: () => void;
}> = ({ lang, saved, onContinue, onNewGame }) => {
  const t = messages(lang).resume;
  return (
    <section className="resume card" role="region" aria-label={t.aria} data-resume-card>
      <h3 className="resume__title">{t.title}</h3>
      <div className="resume__score">
        <div className="resume__team" style={{ '--team': TEAM_COLORS[1] } as React.CSSProperties}>
          <span className="resume__name">{t.yourTeam}</span>
          <span className="resume__pts">{saved.mine}</span>
        </div>
        <span className="resume__colon" aria-hidden="true">
          :
        </span>
        <div className="resume__team" style={{ '--team': TEAM_COLORS[2] } as React.CSSProperties}>
          <span className="resume__name">{t.opponents}</span>
          <span className="resume__pts">{saved.theirs}</span>
        </div>
      </div>
      <p className="resume__target">{t.target(saved.target)}</p>
      <div className="resume__actions">
        <button className="btn btn--primary" data-resume-continue onClick={onContinue}>
          {t.continue}
        </button>
        <button className="btn" data-resume-new onClick={onNewGame}>
          {t.newGame}
        </button>
      </div>
    </section>
  );
};

export default ResumeCard;
