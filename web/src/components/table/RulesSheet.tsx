import React, { useEffect, useId, useRef, useState } from 'react';
import Icon from '../Icon';
import { messages, type Lang } from '../../i18n';

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const close = () => {
    setOpen(false);
    btnRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(
      sheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), summary') || [],
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {variant === 'table' ? (
        <button
          ref={btnRef}
          type="button"
          className="lt-btn rules-btn"
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
        <div className="lt-overlay" onClick={close}>
          <div
            ref={sheetRef}
            className="lt-sheet rules-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={trapTab}
          >
            <div className="lt-sheet__head">
              <h2 id={titleId} className="lt-sheet__title">
                {t.title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                className="lt-sheet__close"
                aria-label={t.close}
                onClick={close}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
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
          </div>
        </div>
      )}
    </>
  );
};

export default RulesSheet;
