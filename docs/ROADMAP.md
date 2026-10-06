# Roadmap

Working plan for agents and the owner. Work top to bottom; tick items with the
date when done. Add new findings at the end of the relevant milestone, and
owner questions to "Waiting on the owner". Status as of 2026-10-04.

## M0: Honest checks (do first)

So every later change can be verified.

- [x] `web/scripts/unit_tests.ts` and `simulate.ts` exit non-zero on failure,
      so `npm run smoke` and CI go red. (2026-10-05; the simulation now checks
      settlement against an independent calculation and every play's legality.)
- [x] (2026-10-05) Fix the two stale tests: `testDeclarerMultiplierEffect` (code multiplies
      both teams, matching common Schieber; test expects declarer only) and
      `testTrumpChooserSchieben` (code lets the forehand choose and lead; test
      expects the dealer). Fix `simulate.ts`'s expected settlement the same
      way, and the outdated comments at `schieber.ts` ~318 and ~696.
- [x] (2026-10-06) `typecheck` and `check` scripts in `web` and `backend`.
- [x] (2026-10-06) CI and deploy use Node 22; `deploy.yml` runs web `check`
      before building. Backend `check` added to `ci.yml` 2026-10-06.
- [x] (2026-10-06) Commands section of `CLAUDE.md` uses the `check` scripts.

## M1: Clean foundation

- [x] (2026-10-06) Delete dead files. Kept `multiGameManager.ts`: `npm run multi` uses it.
- [x] (2026-10-06) Move `docs/ai-sessions/` and `docs/audit/` to `docs/archive/`.
- [x] (2026-10-06) Rewrite `README.md` (currently two READMEs interleaved), `STRUCTURE.md`
      and `DEPLOYMENT.md` to match reality, briefly.
- [x] (2026-10-06) ESLint (flat config per project) + Prettier (root `.prettierrc.json`); `lint`, `format`, `format:check` scripts, and `check` runs lint + format check. Formatted once in its own commit. Warnings remain (unused vars, hook deps), no errors.
- [ ] Decide on `swiss_jass.db` (prefer seed script). (`web/dist/` untracked 2026-10-06.)
- [x] (2026-10-05) Move translations out of `JassGame.tsx` into `web/src/i18n/`:
      en, ch, de, fr, it, rm. Romansh (`rm.ts`) needs a native speaker's
      review. Still untranslated: the welcome hero (only shown with a
      backend) and multiplayer status messages in `JassGame.tsx`.

## M2: One rules engine

- [x] Owner confirms the house rules in `docs/RULES.md`. (2026-10-05:
      standard rules; both engines updated, two small open questions remain.)
- [ ] Extract a shared, pure TypeScript engine (e.g. `shared/engine/`) used by
      both web and backend; port the best of both engines and their tests to
      Vitest. Cover scoring, Weis, Stöck, legal moves, schieben, match bonus.
- [ ] Backend validates every move with it (turn order, legal cards).
- [ ] Split `JassGame.tsx`: `useLocalGame`, `useMultiplayerGame`, and
      presentational table/hand/trick components.

## M3: Backend safe to expose

- [ ] Auth on `/api/admin/*` (or remove it); require `JWT_SECRET` in
      production. (2026-10-06: partly done. Production refuses to start without
      `JWT_SECRET`; `DELETE /users/:id` needs `ADMIN_TOKEN`; `POST totals/sync`
      needs a login token. Still open: `GET /users` and `/leaderboard` are
      public, and `totals/sync` lets any user add points to any username.)
- [ ] Input validation on all routes, helmet, CORS allowlist, rate limiting.
      (2026-10-06: helmet, rate limits (auth 30/15 min, API 300/min), 100 kb
      body cap, socket.io origin allowlist (`CORS_ORIGINS`) and `totals/sync`
      restricted to the caller's own account (0-5000 points) done. Still open:
      express-validator on every route; `GET /api/admin/users` and
      `/leaderboard` still public.)
- [ ] Decide hosting with the owner (e.g. Cloudflare Tunnel to the Pi) and use
      a `VITE_API_URL` build variable instead of the hardcoded LAN IP. Until
      then the Pages build should present itself as single-player and hide
      multiplayer gracefully.
      (2026-10-05: done for the web side. `config.ts` reads `VITE_API_URL` or
      a `jassApiUrl` localStorage override; with no backend, login and
      multiplayer are hidden and the app opens straight into a local match.
      Hosting is still open.)

## M4: Product

- [ ] Mobile-first table layout (phone portrait is the main target).
- [x] Stronger bots (card memory, partner play, smarter trump choice and
      schieben), 2026-10-06. `web/src/engine/bot.ts`; `npm run h2h` (duplicate
      deals vs the old bot): +6.5 points per hand (2.3 SE) over 1000 deals,
      51.7% (SE 2.9) of 300 1000-point matches. Margin target met, 55% match
      target not reached. The trump/schieben model gives most of the gain; the
      new lead logic lost points, so leading still uses the old bot
      (`TUNE.oldLead`). Single-player only.
- [x] (2026-10-06) PWA: manifest + `public/sw.js` (network-first shell, cache-first assets filled on first use). Not yet verified on a real phone; cards are cached only once seen.
- [ ] Multiplayer: reconnect, spectate, rankings/TrueSkill from human games
      only.

## Waiting on the owner

- Two small rule questions (see `docs/RULES.md`, "Open questions").
- Where should the multiplayer backend live, if anywhere public?
