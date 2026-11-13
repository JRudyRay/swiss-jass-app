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
      review (incl. the `lastTrick`, `settings`, `rules` (rules sheet), `resume` and `victory` strings, and the
      `welcome`, `rankings`, `tables`, `friends`, `dashboard` and `mp` groups added 2026-10-07).
      The online screens (dashboard, tables, rankings, friends), the welcome hero and the fixed
      multiplayer status messages are now translated; `ch` keeps the original Swiss German. Still
      English-only: a few dynamic messages in `JassGame.tsx` (e.g. waiting-for-dealer text, profile
      messages) and backend error texts.

## M2: One rules engine

- [x] Owner confirms the house rules in `docs/RULES.md`. (2026-10-05:
      standard rules; both engines updated, two small open questions remain.)
- [ ] (2026-10-15: engine moved to `shared/`, web uses it, Vitest started; backend still on its own engine. Backend now accepts web contract names.) Extract a shared, pure TypeScript engine (e.g. `shared/engine/`) used by
      both web and backend; port the best of both engines and their tests to
      Vitest. Cover scoring, Weis, Stöck, legal moves, schieben, match bonus.
- [ ] Backend validates every move with it (turn order, legal cards).
- [ ] Split `JassGame.tsx`: `useLocalGame`, `useMultiplayerGame`, and
      presentational table/hand/trick components.

## M3: Backend safe to expose

- [ ] Auth on `/api/admin/*` (or remove it); require `JWT_SECRET` in
      production. (2026-10-06: partly done. Production refuses to start without
      `JWT_SECRET`; `DELETE /users/:id` needs `ADMIN_TOKEN`; `POST totals/sync`
      needs a login token. 2026-10-06: `GET /users` and `/leaderboard` now need a login token
      (web sends it via `authFetch`). Rest is done.)
- [ ] Input validation on all routes, helmet, CORS allowlist, rate limiting.
      (2026-10-06: helmet, rate limits (auth 30/15 min, API 300/min), 100 kb
      body cap, socket.io origin allowlist (`CORS_ORIGINS`) and `totals/sync`
      restricted to the caller's own account (0-5000 points) done. 2026-10-06: `POST /api/games/report` needs a login token, the caller must be a player in it, scores bounded. 2026-10-06: express-validator on auth, friends and
      tables routes (`backend/src/validate.ts`). 2026-10-12: admin and games
      routes validated too. Still open: CORS allowlist for the REST API.)
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
- [x] (2026-11-13) Table polish, single-player: score sheet after every hand
      (cards, Weis, Stöck, Match, multiplier, hand, total; the next deal waits
      for a tap), live multiplied totals in the score strip with a ×2/×3
      badge, dark "Stube" play theme with a slate score strip, felt sized to
      the free height, tight trick diamond, "New game" moved into settings.
      Multiplayer hands still end without a score sheet (the backend sends no
      breakdown).
- [x] (2026-11-13) Table polish, round 2: playable cards step forward on your
      turn, "+N" at the seat that takes a trick, "Weis N" at each seat during
      the first trick (struck through when it does not count), dark Stube
      background on the welcome and setup screens with a four-Under card fan,
      dark panels below the hand. Open: last-trick view, score sheet headline,
      welcome page taller than a phone screen, "Play online" is offered on
      Pages although multiplayer only works on the owner's LAN.
- [x] (2026-11-13) Training mode (coach), single-player: switch on the setup
      page and in settings (off by default). A coach row between table and
      hand reviews each card and contract you choose ("Well played" / "The
      coach would play ..." with the reason), reads the other seats' plays
      (partner named trump after your push, Verwerfen, Schmieren, a seat out
      of a suit or of trump, all trumps gone) and marks the recommended card
      or contract on "Tip". Logic in `web/src/game/coach.ts` (the bot's choice
      plus an explanation; never looks at hidden cards), UI in
      `components/table/{useCoach.ts,CoachBar.tsx}`, six languages. Strategy
      advice only, no rules change. The bot now also leads trump for its
      partner after a push (`TUNE.pushLead`; h2h on 4000 duplicate deals
      +5.19 -> +6.50 points per hand, SE 1.4) and names a solid trump suit
      instead of pushing when a riskier contract scores higher (neutral in
      h2h). Open: several conventions are weakly sourced (Anziehen, low/high
      discards), a per-hand list of coach notes, multiplayer.
- [x] (2026-11-13) Fix: since 7af1b9f a contract named by the human in
      single-player was not applied by the engine (no declarer, multiplier
      x1, no Weis or Stöck, wrong leader after a push), because
      `useLocalGame.submitTrump` set the phase before calling the engine.
      Browser-verified; no automated test covers the hook path yet.
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

- Where should the multiplayer backend live, if anywhere public?
