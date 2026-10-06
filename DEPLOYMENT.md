# Deployment

## Web (GitHub Pages)

Push to `main`: `.github/workflows/deploy.yml` runs the web `check` (typecheck,
smoke tests, build) and publishes `web/dist` to
https://jrudyray.github.io/swiss-jass-app/. Vite `base` is `/swiss-jass-app/`.
No backend is configured there, so the site is single-player only.

## Backend (LAN only, for now)

Not safe to expose publicly: `/api/admin/*` has no auth and `JWT_SECRET` has a
dev fallback (roadmap M3).

- Local: `cd backend && npm ci && npx prisma generate && npm run dev` (port 3000).
- Docker: `docker-compose.yml` (plus `.ssl` / `.dev` variants) with `nginx/nginx.conf`.
  Copy `backend/.env.example` to `.env` and set a real `JWT_SECRET`.
- `deploy-backend-pi.yml` targets a self-hosted runner that doesn't exist;
  its jobs queue forever.

To use a backend from a web build: `VITE_API_URL=https://host npm run build`,
or `localStorage.jassApiUrl = 'https://host'` in the browser.
