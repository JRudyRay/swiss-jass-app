import React, { useEffect, useId, useRef, useState } from 'react';
import Icon from '../Icon';
import { messages, type Lang } from '../../i18n';
import { hapticsSupported, type Settings, type Speed } from './useSettings';

type Props = {
  lang: Lang;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
};

const SPEEDS: Speed[] = ['normal', 'fast', 'off'];

// Gear button on the table and the settings dialog (Esc or the close button dismiss it, focus returns).
const SettingsSheet: React.FC<Props> = ({ lang, settings, onChange }) => {
  const t = messages(lang).settings;
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

  // Keep Tab inside the dialog.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(
      sheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || [],
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

  const toggle = (key: 'haptics' | 'leftHanded' | 'suitMarks', label: string, hint: string) => (
    <div className="set-row">
      <div className="set-row__text">
        <span className="set-row__label">{label}</span>
        <span className="set-row__hint">{hint}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={settings[key]}
        aria-label={label}
        className="set-switch"
        data-setting={key}
        onClick={() => onChange({ [key]: !settings[key] })}
      >
        <span className="set-switch__knob" />
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="lt-btn set-btn"
        aria-label={t.button}
        title={t.button}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="gear" size={20} />
      </button>
      {open && (
        <div className="lt-overlay" onClick={close}>
          <div
            ref={sheetRef}
            className="lt-sheet set-sheet"
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
            {hapticsSupported() && toggle('haptics', t.haptics, t.hapticsHint)}
            <div className="set-row set-row--stack" role="radiogroup" aria-label={t.speed}>
              <span className="set-row__label">{t.speed}</span>
              <div className="set-seg">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={settings.speed === s}
                    className="set-seg__opt"
                    data-speed-option={s}
                    onClick={() => onChange({ speed: s })}
                  >
                    {t.speeds[s]}
                  </button>
                ))}
              </div>
            </div>
            {toggle('leftHanded', t.leftHanded, t.leftHandedHint)}
            {toggle('suitMarks', t.suitMarks, t.suitMarksHint)}
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsSheet;
