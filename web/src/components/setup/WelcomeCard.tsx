import React from 'react';
import Icon from '../Icon';
import { messages, type Lang } from '../../i18n';
import './setup.css';

// The four Under (Buur), the card every Jass player wants to hold.
const FAN = ['schellen_U', 'rosen_U', 'eicheln_U', 'schilten_U'];
const base: string = (import.meta as any).env?.BASE_URL || '/';

export const WelcomeCard: React.FC<{
  lang: Lang;
  onlineCount: number;
  onSingle: () => void;
  onMulti: () => void;
}> = ({ lang, onlineCount, onSingle, onMulti }) => {
  const w = messages(lang).welcome;
  return (
    <section className="welcome card">
      <div className="welcome__fan" aria-hidden="true">
        {FAN.map((c, i) => (
          <img
            key={c}
            src={`${base}assets/cards/${c}.webp`}
            alt=""
            style={{ '--i': i } as React.CSSProperties}
          />
        ))}
      </div>
      <h2 className="welcome__title">{w.title}</h2>
      <p className="welcome__sub">{w.sub}</p>

      <button
        className="btn btn--primary btn--big welcome__cta"
        data-welcome-single
        onClick={onSingle}
      >
        <Icon name="bot" size={24} />
        {w.single}
      </button>
      <p className="welcome__hint">{w.singleHint}</p>

      <div className="welcome__grid">
        <button className="welcome__option" onClick={onMulti}>
          <Icon name="globe" size={28} />
          <span className="welcome__option-title">{w.online}</span>
          <span className="welcome__option-text">{w.onlineText}</span>
          <span className="pill pill--ok">{w.onlineCount(onlineCount)}</span>
        </button>
      </div>

      <p className="welcome__foot">{w.foot}</p>
    </section>
  );
};

export const MultiInfoCard: React.FC<{
  lang: Lang;
  onlineCount: number;
  blurb: string;
  onBack: () => void;
}> = ({ lang, onlineCount, blurb, onBack }) => {
  const w = messages(lang).welcome;
  return (
    <section className="welcome card welcome--narrow">
      <div className="welcome__head">
        <div>
          <h3 className="welcome__title welcome__title--sm">{w.multiTitle}</h3>
          <p className="welcome__sub">{w.multiSub}</p>
        </div>
        <span className="pill pill--ok">{w.onlineCount(onlineCount)}</span>
      </div>
      <p className="welcome__note">{blurb}</p>
      <button className="btn" onClick={onBack}>
        <Icon name="arrow" size={18} className="flip" />
        {w.back}
      </button>
    </section>
  );
};
