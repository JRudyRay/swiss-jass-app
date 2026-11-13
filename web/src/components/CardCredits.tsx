import React from 'react';
import { messages, type Lang } from '../i18n';

const CardCredits: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = messages(lang).credits;
  return (
    <div className="card-credits">
      <div className="card-credits__title">{t.title}</div>
      <div>
        {t.body}{' '}
        <a
          href="https://commons.wikimedia.org/wiki/File:Print,_playing-card_(BM_1896,0501.805).jpg"
          target="_blank"
          rel="noreferrer"
        >
          Wikimedia Commons
        </a>
      </div>
    </div>
  );
};

export default CardCredits;
