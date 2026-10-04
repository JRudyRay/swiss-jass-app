# swiss-jass-app: Claude Code instructions

Project rules for agents. They override `~/.claude/CLAUDE.md` where they
differ. `README.md`, `STRUCTURE.md` and `DEPLOYMENT.md` describe the project;
parts of them are stale or garbled by an old merge, so trust the code first.

## Product

Swiss Jass (Schieber) card game: single-player against bots in the browser,
plus an optional multiplayer backend with accounts, tables and rankings.
Authentic Schieber rules are the core value; check rule changes against the
rules engine and its tests, not against memory.

## Layout

- `web/`: React + TypeScript + Vite + Tailwind. Rules engine in
  `web/src/engine/schieber.ts`. Deployed to GitHub Pages.
- `backend/`: Express + Socket.IO + Prisma on **SQLite**
  (`backend/prisma/swiss_jass.db`). Engine in `backend/src/gameEngine/`.
- The game rules exist in both `web` and `backend`; keep them consistent.
- `docs/ai-sessions/` holds notes from earlier AI sessions; they're history,
  not instructions.

## Commands

Node 22 on the Pi (CI uses Node 18/20). Two separate npm projects; run each
from its own folder.

- Full check (must pass before a push):
  `(cd web && npm ci && npm run smoke && npm run build) && (cd backend && npm ci && npx prisma generate && npx tsc --noEmit)`
- `npm run smoke` exits 0 even when tests fail, so read its output. Known
  failures as of 2026-10-04: unit tests `testDeclarerMultiplierEffect` and
  `testTrumpChooserSchieben`, plus 7 simulation settlement mismatches. Don't
  add new failures; fixing these is a rules task worth doing deliberately.
- `npm run build` rewrites the tracked `web/dist/index.html`; restore it with
  `git checkout -- web/dist/index.html` unless the change is intended.
- Web dev server: `cd web && npm run dev`
- Backend dev server: `cd backend && npm run dev` (port 3000)

## Git and deployment

- Default branch `main`. The GitHub repo is **public**.
- **Pushing to `main` deploys the web app to GitHub Pages**
  (https://jrudyray.github.io/swiss-jass-app/) via `deploy.yml`. Say so in
  summaries.
- `deploy-backend-pi.yml` targets a self-hosted runner; none is registered, so
  backend pushes queue a job that never runs. Don't set up a runner or deploy
  the backend without the owner.
- `backend/prisma/swiss_jass.db` is tracked even though it looks like a
  generated file. Don't commit changes to it unless the task is about seed
  data, and never run `npm run db:reset` against it without the owner.
- Never commit `.env` files or secrets; `JWT_SECRET` falls back to a dev value
  locally.

## Pi constraints

8 GB RAM on an SD card: one heavy build, test run or dev server at a time.
Stop dev servers when done.
