import React from 'react';
import Icon from '../Icon';
import './setup.css';

// Existing welcome copy, kept as it was (it was hardcoded in JassGame before).
export const WelcomeCard: React.FC<{
  onlineCount: number;
  onSingle: () => void;
  onMulti: () => void;
}> = ({ onlineCount, onSingle, onMulti }) => (
  <section className="welcome card">
    <div className="welcome__cross" aria-hidden="true" />
    <h2 className="welcome__title">Grüezi! Willkommen zum Jass</h2>
    <p className="welcome__sub">Choose your Swiss Jass adventure below</p>

    <button
      className="btn btn--primary btn--big welcome__cta"
      data-welcome-single
      onClick={onSingle}
    >
      <Icon name="bot" size={24} />
      Play Local vs Bots
    </button>
    <p className="welcome__hint">
      Practice your skills against AI opponents. Perfect for learning the game or playing offline.
    </p>

    <div className="welcome__grid">
      <button className="welcome__option" onClick={onMulti}>
        <Icon name="globe" size={28} />
        <span className="welcome__option-title">Play Online</span>
        <span className="welcome__option-text">
          Join tables and play with other Jass enthusiasts from around the world in real-time.
        </span>
        <span className="pill pill--ok">{onlineCount} Online</span>
      </button>
    </div>

    <p className="welcome__foot">
      Authentic Swiss Schieber Jass · Traditional Rules · Modern Interface
    </p>
  </section>
);

export const MultiInfoCard: React.FC<{
  onlineCount: number;
  blurb: string;
  onBack: () => void;
}> = ({ onlineCount, blurb, onBack }) => (
  <section className="welcome card welcome--narrow">
    <div className="welcome__head">
      <div>
        <h3 className="welcome__title welcome__title--sm">Multiplayer Game</h3>
        <p className="welcome__sub">Join or create tables to play with others online</p>
      </div>
      <span className="pill pill--ok">{onlineCount} Online</span>
    </div>
    <p className="welcome__note">{blurb}</p>
    <button className="btn" onClick={onBack}>
      <Icon name="arrow" size={18} className="flip" />
      Back
    </button>
  </section>
);
