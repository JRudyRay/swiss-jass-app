// Environment configuration
//
// API_URL is the multiplayer backend. Empty string means "no backend": the app
// runs single-player only and hides online features.
//
// Resolution order:
//   1. localStorage 'jassApiUrl' (lets the owner point the public site at a
//      private backend without rebuilding; set to '' to force offline)
//   2. VITE_API_URL at build time
//   3. anything else (including localhost dev and GitHub Pages): no backend
// For backend dev put VITE_API_URL=http://localhost:3000 in web/.env.development.local.
const env = ((import.meta as any).env || {}) as Record<string, string | undefined>;

function resolveApiUrl(): string {
  try {
    const override =
      typeof window !== 'undefined' ? window.localStorage.getItem('jassApiUrl') : null;
    if (override !== null) return override.trim();
  } catch {}
  if (env.VITE_API_URL) return env.VITE_API_URL;
  return '';
}

const API_URL: string = resolveApiUrl();
const ONLINE_ENABLED = API_URL !== '';

export { API_URL, ONLINE_ENABLED };
