# En öchtä Schwizer Jass für alli

An authentic Swiss Schieber Jass in the browser.

**Play:** https://jrudyray.github.io/swiss-jass-app/ (single-player against
three bots, runs entirely in your browser, installable as a PWA, works offline
after the first visit).

Languages: English, Swiss German, Standard German, French, Italian, Romansh.

## Modes

- **Single-player**: web only, no server needed. This is what the public site
  offers.
- **Multiplayer** (4 humans, tables, friends, TrueSkill rankings): Express +
  Socket.IO + Prisma/SQLite backend. Not yet safe to expose publicly; today it
  only runs on the owner's LAN. See `docs/ROADMAP.md` (M3).

## Develop

Node 22. Two separate npm projects.

```bash
cd web && npm ci && npm run dev          # http://localhost:3001
cd backend && npm ci && npx prisma generate && npm run dev   # port 3000
```

Full check (what must pass before a push):

```bash
(cd web && npm ci && npm run check) && (cd backend && npm ci && npx prisma generate && npm run check)
```

`web`: `npm run smoke` runs unit tests plus a 40-hand simulation; `npm run h2h`
compares bots head to head.

To point a web build at a backend, set `VITE_API_URL` at build time, or set
`localStorage.jassApiUrl` in the browser.

## Docs

- `docs/RULES.md`: the rules implemented (authoritative for game logic)
- `docs/ROADMAP.md`: plan and status
- `STRUCTURE.md`: code layout
- `DEPLOYMENT.md`: how it ships
- `CLAUDE.md`: instructions for coding agents
- `docs/archive/`: old notes, history only

## Deployment note

Pushing to `main` deploys the web app to GitHub Pages.

License: see `LICENSE`.
