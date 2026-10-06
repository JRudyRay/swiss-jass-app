# Structure

```
web/        React 18 + Vite + Tailwind SPA (no router; App.tsx switches views)
  src/engine/schieber.ts   pure, immutable rules engine (single-player)
  src/engine/bot.ts        bot play (card memory, trump/schieben model)
  src/JassGame.tsx         game UI, bot loop, multiplayer sockets, profile (large; split planned, M2)
  src/i18n/                en, ch, de, fr, it, rm; Messages type enforces completeness
  src/config.ts            API URL resolution (VITE_API_URL / localStorage / localhost)
  public/sw.js             service worker (PWA offline)
  scripts/                 unit tests, simulation, bot head-to-head
backend/    Express + Socket.IO + Prisma (SQLite)
  src/index.ts             server, socket handlers, /api/stats
  src/gameHub.ts           drives games
  src/gameEngine/SwissJassEngine.ts   multiplayer rules authority (diverged from web engine)
  src/routes/              auth, games, tables, friends, admin
  src/tests/               hand-rolled test scripts
  prisma/                  schema, migrations, tracked swiss_jass.db
docs/       RULES.md, ROADMAP.md, guides; archive/ is history
nginx/, docker-compose*.yml   LAN/Docker deployment of the backend
```

The two rules engines must stay in sync until they are unified (roadmap M2).
