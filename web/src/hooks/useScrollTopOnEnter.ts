import { useEffect } from 'react';

// The table replaces the welcome screen in place (no router), so the page would keep
// the welcome screen's scroll offset and hide the score strip under the sticky header.
export function useScrollTopOnEnter(active: boolean) {
  useEffect(() => {
    if (active) window.scrollTo(0, 0);
  }, [active]);
}
