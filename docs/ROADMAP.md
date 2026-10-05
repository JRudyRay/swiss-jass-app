# Roadmap

Working plan for agents and the owner. Work top to bottom; tick items with the
date when done. Add new findings at the end of the relevant milestone, and
owner questions to "Waiting on the owner". Status as of 2026-10-04.

## M0: Honest checks (do first)

So every later change can be verified.

- [ ] `web/scripts/unit_tests.ts` and `simulate.ts` exit non-zero on failure,
      so `npm run smoke` and CI go red.
- [ ] Fix the two stale tests: `testDeclarerMultiplierEffect` (code multiplies
      both teams, matching common Schieber; test expects declarer only) and
      `testTrumpChooserSchieben` (code lets the forehand choose and lead; test
      expects the dealer). Fix `simulate.ts`'s expected settlement the same
      way, and the outdated comments at `schieber.ts` ~318 and ~696.
- [ ] Add `typecheck` scripts (`tsc --noEmit`) to `web` and `backend`, and a
      `check` script per package that runs typecheck + tests + build.
- [ ] CI: run both packages' `check` on Node 22 (match the Pi); make
      `deploy.yml` depend on it.
- [ ] Update the Commands section of `CLAUDE.md` to the new `check` scripts.

## M1: Clean foundation

- [ ] Delete dead files (list in `CLAUDE.md`; grep first).
- [ ] Move `docs/ai-sessions/` and `docs/audit/` to `docs/archive/`.
- [ ] Rewrite `README.md` (currently two READMEs interleaved), `STRUCTURE.md`
      and `DEPLOYMENT.md` to match reality, briefly.
- [ ] Add ESLint + Prettier (one shared config), format once in its own commit.
- [ ] Untrack `web/dist/` and decide on `swiss_jass.db` (prefer seed script).
- [ ] Move translations out of `JassGame.tsx` into `web/src/i18n/{en,ch}.ts`.

## M2: One rules engine

- [ ] Owner confirms the house rules in `docs/RULES.md`.
- [ ] Extract a shared, pure TypeScript engine (e.g. `shared/engine/`) used by
      both web and backend; port the best of both engines and their tests to
      Vitest. Cover scoring, Weis, Stöck, legal moves, schieben, match bonus.
- [ ] Backend validates every move with it (turn order, legal cards).
- [ ] Split `JassGame.tsx`: `useLocalGame`, `useMultiplayerGame`, and
      presentational table/hand/trick components.

## M3: Backend safe to expose

- [ ] Auth on `/api/admin/*` (or remove it); require `JWT_SECRET` in
      production.
- [ ] Input validation on all routes, helmet, CORS allowlist, rate limiting.
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
- [ ] Stronger bots (card memory, partner play, smarter trump choice and
      schieben).
- [ ] PWA: installable, playable offline.
- [ ] Multiplayer: reconnect, spectate, rankings/TrueSkill from human games
      only.

## Waiting on the owner

- Confirm the house rules (see `docs/RULES.md`, "Open questions").
- Where should the multiplayer backend live, if anywhere public?
