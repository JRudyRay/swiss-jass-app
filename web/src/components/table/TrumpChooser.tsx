import React from 'react';
import { SuitIcon, trumpName } from './SuitBadge';
import { messages, type Lang } from '../../i18n';

const TRUMPS = ['eicheln', 'schellen', 'rosen', 'schilten', 'oben-abe', 'unden-ufe'];

type Props = {
  lang: Lang;
  dealerName: string;
  // Only the original chooser (forehand) may schieben; the partner can't push it back.
  canSchieben: boolean;
  partnerMustChoose: boolean;
  onPick: (trump: string) => void;
};

// Bottom panel with big suit buttons (3x2 grid, one row on wide screens) plus Schiebe.
const TrumpChooser: React.FC<Props> = ({
  lang,
  dealerName,
  canSchieben,
  partnerMustChoose,
  onPick,
}) => {
  const t = messages(lang).game;
  return (
    <section className="trump-sheet" role="group" aria-labelledby="trump-sheet-title">
      <div className="trump-sheet__head">
        <h4 id="trump-sheet-title" className="trump-sheet__title">
          {t.selectTrump}
        </h4>
        <span className="trump-sheet__dealer">
          {t.dealer}: {dealerName}
        </span>
      </div>
      <div className="trump-sheet__grid">
        {TRUMPS.map((s) => (
          <button key={s} className="trump-btn" data-trump={s} onClick={() => onPick(s)}>
            <SuitIcon trump={s} size={34} />
            <span>{trumpName(s, lang)}</span>
          </button>
        ))}
      </div>
      {canSchieben && (
        <button
          className="trump-sheet__schieben"
          data-trump="schieben"
          onClick={() => onPick('schieben')}
        >
          ↻ {t.schieben}
        </button>
      )}
      <p className="trump-sheet__hint">
        {partnerMustChoose ? t.trumpHintPartner : t.trumpHintChooser}
      </p>
    </section>
  );
};

export default TrumpChooser;
