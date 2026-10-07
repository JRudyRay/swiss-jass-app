import { useCallback, useEffect, useRef, useState } from 'react';

export type Speed = 'normal' | 'fast' | 'off';
export type Settings = {
  haptics: boolean;
  speed: Speed;
  leftHanded: boolean;
  suitMarks: boolean;
};

const KEY = 'jassSettings';
const DEFAULTS: Settings = { haptics: true, speed: 'normal', leftHanded: false, suitMarks: false };
// Multiplier for the trick and bot pauses. "Off" switches the CSS animations off and shrinks the
// pauses to 10% (never 0: the bot loop and trick collection still need a tick to let React render
// each play, and a 0 or NaN delay would make the bots play all at once).
export const SPEED_SCALE: Record<Speed, number> = { normal: 1, fast: 0.5, off: 0.1 };
const isSpeed = (v: unknown): v is Speed =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(SPEED_SCALE, v);

export const hapticsSupported = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function load(): Settings {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    const raw = parsed && typeof parsed === 'object' ? parsed : {};
    return {
      haptics: typeof raw.haptics === 'boolean' ? raw.haptics : DEFAULTS.haptics,
      speed: isSpeed(raw.speed) ? raw.speed : DEFAULTS.speed,
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
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // Persist outside the state updater (updaters must stay pure).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* storage blocked: the choice lasts for this visit only */
    }
  }, [settings]);

  const buzz = useCallback(() => {
    if (!ref.current.haptics || !hapticsSupported()) return;
    try {
      navigator.vibrate(10);
    } catch {
      /* ignore */
    }
  }, []);

  const scale = useCallback(() => SPEED_SCALE[ref.current.speed] ?? 1, []);

  return { settings, update, buzz, scale };
}
