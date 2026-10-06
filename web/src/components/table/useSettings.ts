import { useCallback, useRef, useState } from 'react';

export type Speed = 'normal' | 'fast' | 'off';
export type Settings = {
  haptics: boolean;
  speed: Speed;
  leftHanded: boolean;
  suitMarks: boolean;
};

const KEY = 'jassSettings';
const DEFAULTS: Settings = { haptics: true, speed: 'normal', leftHanded: false, suitMarks: false };
// Multiplier for the trick and bot pauses. "Off" also switches the CSS animations off.
export const SPEED_SCALE: Record<Speed, number> = { normal: 1, fast: 0.5, off: 0.5 };

export const hapticsSupported = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      haptics: typeof raw.haptics === 'boolean' ? raw.haptics : DEFAULTS.haptics,
      speed: raw.speed in SPEED_SCALE ? raw.speed : DEFAULTS.speed,
      leftHanded: raw.leftHanded === true,
      suitMarks: raw.suitMarks === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

// Display and feel preferences, kept in localStorage. `buzz` and `scale` read a ref, so they stay
// current inside the long-running bot loop.
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);
  const ref = useRef(settings);
  ref.current = settings;

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage blocked: the choice lasts for this visit only */
      }
      return next;
    });
  }, []);

  const buzz = useCallback(() => {
    if (!ref.current.haptics || !hapticsSupported()) return;
    try {
      navigator.vibrate(10);
    } catch {
      /* ignore */
    }
  }, []);

  const scale = useCallback(() => SPEED_SCALE[ref.current.speed], []);

  return { settings, update, buzz, scale };
}
