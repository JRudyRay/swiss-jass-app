import React, { useRef, useState } from 'react';
import Icon from '../Icon';
import { messages, type Lang } from '../../i18n';
import Sheet from './Sheet';

type Props = {
  lang: Lang;
  // 'table' is the corner icon button on the felt, 'inline' a text button for the setup screens.
  variant?: 'table' | 'inline';
};

// Rules help: a "?" button and a scrollable dialog with collapsible sections, drawn from docs/RULES.md.
// Esc or the close button dismiss it, Tab stays inside, focus returns to the button.
const RulesSheet: React.FC<Props> = ({ lang, variant = 'table' }) => {
  const t = messages(lang).rules;
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      {variant === 'table' ? (
        <button
          ref={btnRef}
          type="button"
          className="sheet-btn rules-btn"
          data-rules-open
          aria-label={t.button}
          title={t.button}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Icon name="help" size={22} />
        </button>
      ) : (
        <button
          ref={btnRef}
          type="button"
          className="rules-link"
          data-rules-open
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Icon name="help" size={18} />
          {t.button}
        </button>
      )}
      {open && (
        <Sheet
          title={t.title}
          closeLabel={t.close}
          onClose={() => setOpen(false)}
          returnFocusRef={btnRef}
          className="rules-sheet"
        >
          <div className="rules-sheet__body">
            <p className="rules-sheet__intro">{t.intro}</p>
            {t.sections.map((s, i) => (
              <details key={s.title} className="rules-sec" open={i === 0}>
                <summary>{s.title}</summary>
                <ul>
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
};

export default RulesSheet;
