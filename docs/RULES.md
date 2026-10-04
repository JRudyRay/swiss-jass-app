# Rules spec: Schieber

The rules the game implements. Agents: this file is the spec. Rows marked
**Open** wait for the owner; don't change behaviour for them without an
answer. Values in "Current code" are what `web/src/engine/schieber.ts` does as
of 2026-10-04; the backend engine may differ (see `CLAUDE.md`).

## Settled basics

- 4 players in 2 fixed partnerships (partners sit opposite), 36-card Swiss
  deck: Eicheln, Schellen, Rosen, Schilten; 6, 7, 8, 9, 10, Under, Ober,
  König, Ass. 9 cards each, 9 tricks per hand.
- Contracts: one of the four suits as trump, Obenabe (no trump, Ass high),
  Undenufe (no trump, 6 high).
- Card points, trump suit: Under (Puur) 20, Nell (9) 14, Ass 11, 10 10,
  König 4, Ober 3, others 0.
- Card points, non-trump suit: Ass 11, 10 10, König 4, Ober 3, Under 2, others 0.
- Obenabe/Undenufe: no trump; 8s count 8 points; Ass/6 as highest card.
- Last trick +5. A hand is worth 157 card points. Taking all 9 tricks is a
  Match: +100 (257).
- Stöck: König + Ober of trump held by one player, 20 points when both are
  played. Suit contracts only.
- Schieben: the chooser may push the trump choice to their partner.
- Follow suit if you can; trump may always be played; the Puur never has to
  be played to follow trump.

## Open questions (owner)

| Topic | Current code | Common alternatives |
| --- | --- | --- |
| Who chooses trump and leads | Forehand ((dealer-1) mod 4) chooses and leads; backend engine has the dealer do it | Forehand (player after the dealer) chooses and leads |
| Multipliers | Eicheln/Rosen ×1, Schellen/Schilten ×2, Obenabe ×3, Undenufe ×4 | Varies by region: Eicheln/Rosen ×1, Schellen/Schilten ×2, Obe/Une ×3; or no multipliers |
| Multiplier applies to | Both teams' points | Both teams (common) |
| Undertrumping | ? (check engine) | Not allowed unless you hold only trump |
| Weis sequences | 3: 20, 4: 50, 5: 100, 6: 150, 7: 200, 8: 250 | 9 cards: 300 in some rule sets |
| Four of a kind | 4 Under 200, 4 Nell 150, 4 Ass/König/Ober/10 100; also 100 for 4× 6/7/8 | 4× 6/7/8 usually don't count |
| Weis comparison | Only the best team's Weis counts | Highest Weis wins (points, then length, then trump, then rank); winning team scores all its Weis |
| Game target | ? | 1000, 1500 or 2500 points |

When the owner answers, move the row into "Settled basics" (with the date) and
fix both engines and their tests in the same change.
