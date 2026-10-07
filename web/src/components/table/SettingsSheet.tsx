import React, { useRef, useState } from 'react';
import Icon from '../Icon';
import { messages, type Lang } from '../../i18n';
import Sheet from './Sheet';
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
        className="sheet-btn set-btn"
        aria-label={t.button}
        title={t.button}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="gear" size={20} />
      </button>
      {open && (
        <Sheet
          title={t.title}
          closeLabel={t.close}
          onClose={() => setOpen(false)}
          returnFocusRef={btnRef}
          className="set-sheet"
        >
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
        </Sheet>
      )}
    </>
  );
};

export default SettingsSheet;
