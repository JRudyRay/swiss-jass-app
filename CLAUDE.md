# swiss-jass-app: Claude Code instructions

Project rules for agents. They override `~/.claude/CLAUDE.md` where they
differ. Read `docs/ROADMAP.md` before starting work and `docs/RULES.md` before
touching game logic. `README.md`, `STRUCTURE.md`, `DEPLOYMENT.md` and
everything in `docs/ai-sessions/` and `docs/audit/` are stale or garbled:
history, not specs. Trust the code, then this file.

## Product

"En öchtä Schwizer Jass für alli": an authentic Swiss Schieber Jass in the
browser. Two modes:

- **Single-player** against three bots, fully in the browser (GitHub Pages).
  This is what real users can play today.
- **Multiplayer** (4 humans, tables, friends, rankings with TrueSkill) through
  the Express backend. It currently only works on the owner's LAN.

Authentic rules are the core value. When rules are unclear, check
`docs/RULES.md`; if it doesn't settle it, add the question to its "Open
questions" and ask the owner. Don't decide house rules yourself.

UI languages: English and Swiss German (`'en' | 'ch'`). Every user-facing
string needs both.

## Map

- `web/` React 18 + Vite + Tailwind, no router; `App.tsx` switches views.
  - `src/engine/schieber.ts`: pure, immutable rules engine for single-player.
  - `src/JassGame.tsx`: **2.9k-line god file** (game UI, bot loop, multiplayer
    sockets, profile, stats, and the inline `T[lang]` translations). Don't
    grow it: put new code in new hooks/components and extract what you touch.
  - `src/config.ts`: API URL, hardcoded to `https://192.168.1.141` on Pages.
- `backend/` Express + Socket.IO + Prisma on SQLite.
  - `src/gameEngine/SwissJassEngine.ts`: separate class-based engine, the
    authority for multiplayer, driven by `src/gameHub.ts`.
  - `src/index.ts` also holds socket handlers and `/api/stats`.
  - Routes in `src/routes/` (auth, games, tables, friends, admin).
- **The two engines have diverged** (contract names, who picks trump and
  leads). Until they're unified (roadmap M2), a rules change must be made in
  both, or explicitly scoped to one with a note.
- Probably dead (verify with grep before deleting): `web/src/AuthForm.tsx`,
  `components/Dashboard.tsx`, `components/GameHeader.tsx`,
  `components/PremiumGameTable.css`, `backend/src/services/gameService.simple.ts`,
  `backend/src/gameEngine/multiGameManager.ts` (French deck, only used by one
  test).

## Commands

Node 22 on the Pi (CI uses 18/20). Two separate npm projects; run each from
its own folder.

- Full check (must pass before a push):
  `(cd web && npm ci && npm run smoke && npm run build) && (cd backend && npm ci && npx prisma generate && npx tsc --noEmit)`
- **`npm run smoke` exits 0 even when tests fail; read its output.** Known
  failures as of 2026-10-04: `testDeclarerMultiplierEffect`,
  `testTrumpChooserSchieben` (both stale tests, see roadmap M0) and 7
  simulation mismatches with the same cause. Never add new failures.
- `vite build` doesn't typecheck; run `cd web && npx tsc --noEmit` too when
  changing TypeScript. Both tsconfigs have `strict: false`.
- `npm run build` rewrites the tracked `web/dist/index.html`; restore it with
  `git checkout -- web/dist/index.html` unless the change is intended.
- Backend tests in `backend/src/tests/` are hand-rolled scripts (`npm run
  smoke`, `npm run multi` in `backend/`) that hit the real SQLite DB.
- Dev servers: `cd web && npm run dev`, `cd backend && npm run dev` (port 3000).

## Security (backend)

Treat the backend as not safe to expose publicly yet:
`/api/admin/*` has no auth (including deleting users), and `JWT_SECRET` falls
back to a fixed dev value. Don't make the backend reachable from the internet
before roadmap M3 is done. Never log passwords or tokens.

## Git and deployment

- Default branch `main`. The GitHub repo is **public**: never commit secrets,
  personal data, or the owner's IPs beyond what's already there.
- **Pushing to `main` deploys the web app to GitHub Pages**
  (https://jrudyray.github.io/swiss-jass-app/). Say so in summaries. Don't
  push changes that break single-player.
- `deploy-backend-pi.yml` targets a self-hosted runner that doesn't exist;
  backend pushes queue a job that never runs. Don't set up a runner or deploy
  the backend without the owner.
- `backend/prisma/swiss_jass.db` is tracked. Don't commit changes to it unless
  the task is about seed data. `npm run db:reset` and `npm run deploy` are
  blocked for agents.

## Pi constraints

8 GB RAM on an SD card: one heavy build, test run or dev server at a time.
Stop dev servers when done.
