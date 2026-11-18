import { useEffect } from 'react';

// Keeps the screen on while `active` (a local match at the table). The lock is released by the
// browser when the tab is hidden, so it is taken again when the tab comes back. Where the Screen
// Wake Lock API is missing or refused, nothing happens.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;
    let lock: { release: () => Promise<void> } | null = null;
    let stopped = false;
    const acquire = async () => {
      try {
        const got = await nav.wakeLock!.request('screen');
        if (stopped) got.release().catch(() => {});
        else {
          lock?.release().catch(() => {});
          lock = got;
        }
      } catch {
        // refused (e.g. low battery): the screen may dim, the match goes on
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
      lock = null;
    };
  }, [active]);
}
