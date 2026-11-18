import React, { useRef, useState } from 'react';
import Icon from '../Icon';
import { messages, type Lang } from '../../i18n';
import Sheet from './Sheet';
import MusicPlayer from './MusicPlayer';
import { hapticsSupported, type Settings, type Speed } from './useSettings';

type Props = {
  lang: Lang;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  // Leaving the match lives here so it cannot be hit by accident during play
  newGameLabel?: string;
  onNewGame?: () => void;
};

const SPEEDS: Speed[] = ['normal', 'fast', 'off'];

// Gear button on the table and the settings dialog (Esc or the close button dismiss it, focus returns).
const SettingsSheet: React.FC<Props> = ({ lang, settings, onChange, newGameLabel, onNewGame }) => {
  const t = messages(lang).settings;
  const coach = messages(lang).coach;
  const [open, setOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = (
    key: 'haptics' | 'sound' | 'leftHanded' | 'suitMarks' | 'coach' | 'oneTap',
    label: string,
    hint: string,
  ) => (
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
          {toggle('sound', t.sound, t.soundHint)}
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
          {toggle('coach', coach.setting, coach.settingHint)}
          {toggle('oneTap', t.oneTap, t.oneTapHint)}
          {toggle('leftHanded', t.leftHanded, t.leftHandedHint)}
          {toggle('suitMarks', t.suitMarks, t.suitMarksHint)}
          <div className="set-row set-row--stack">
            <div className="set-row__text">
              <span className="set-row__label">{messages(lang).info.music}</span>
            </div>
            {musicOpen ? (
              <MusicPlayer lang={lang} />
            ) : (
              <button
                type="button"
                className="music__btn"
                data-music-open
                onClick={() => setMusicOpen(true)}
              >
                {messages(lang).info.play}
              </button>
            )}
          </div>
          {onNewGame && (
            <button
              type="button"
              className="set-newgame"
              data-new-game
              onClick={() => setConfirming(true)}
            >
              {newGameLabel}
            </button>
          )}
        </Sheet>
      )}
      {open && confirming && onNewGame && (
        <Sheet
          title={newGameLabel || ''}
          closeLabel={t.close}
          onClose={() => setConfirming(false)}
          returnFocusRef={btnRef}
          className="confirm-sheet"
        >
          <p className="confirm-sheet__text">{messages(lang).game.confirmNewGame}</p>
          <div className="confirm-sheet__actions">
            <button type="button" className="music__btn" onClick={() => setConfirming(false)}>
              {t.cancel}
            </button>
            <button
              type="button"
              className="set-newgame"
              data-new-game-confirm
              onClick={() => {
                setConfirming(false);
                setOpen(false);
                onNewGame();
              }}
            >
              {newGameLabel}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
};

export default SettingsSheet;
