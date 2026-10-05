# Rules spec: Schieber

The rules the game implements. Agents: this file is the spec. Open questions
wait for the owner; don't change behaviour for them without an answer. Both
engines (`web/src/engine/schieber.ts`, `backend/src/gameEngine/SwissJassEngine.ts`)
implement everything below as of 2026-10-05.

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

## Settled 2026-10-05 (owner: "just keep the standard rules")

- Play runs counter-clockwise. The forehand (the dealer's right, next to
  play) chooses trump or schiebt; after schieben the partner must choose. The
  forehand leads the first trick either way.
- Multipliers: Eicheln/Rosen ×1, Schellen/Schilten ×2, Obenabe/Undenufe ×3.
  They apply to both teams' points: cards, last trick, Weis, Stöck and Match.
- Trumping is never forced. Undertrumping (playing a trump lower than one
  already in the trick) is not allowed, unless you hold nothing but trumps.
  When trump is led and your only trump is the bare Puur, you may play anything.
- Undenufe card points: 6 11, 10 10, 8 8, König 4, Ober 3, Under 2, Ass 0.
  Obenabe: Ass 11, 10 10, 8 8, König 4, Ober 3, Under 2, 6 0.
- Weis sequences (same suit, rank order 6 7 8 9 10 U O K A): 3 cards 20,
  4 50, 5 100, 6 150, 7 200, 8 250, 9 300.
- Four of a kind: 4 Under 200, 4 Nell 150, 4 Ass/König/Ober/10 100.
  Four 6s, 7s or 8s count nothing.
- Weis: only the team holding the single best Weis scores, and then all of
  its Weis. Best = more points; between sequences of equal points the
  longer, then the higher (the lower in Undenufe), then the one in trump.
  If still equal, the player first in play order from the forehand wins.
- Stöck counts regardless of Weis.
- Game target: 1000 (the target is adjustable per match in the UI).
- Bots: the forehand schiebt with a weak hand; after schieben the partner
  must choose (it can't be pushed back).

## Settled 2026-10-05 (owner answers)

- The first team to reach the target wins at once, even mid-hand; the
  match ends there. Points count in the order Stöck, Weis, Stich: Stöck when
  its second card is played (before that trick's points), Weis with the
  first trick (before its points), then each trick's points (the last trick
  with its +5 and any Match bonus). Totals stop where the target was reached.
- Undenufe stays ×3.
- The first dealer of a match is random; the forehand (who chooses trump and
  leads) is always the dealer's right. No Rosen-7 rule.

## Open questions (owner)

| Topic | Current code | Notes |
| --- | --- | --- |
| Four of a kind vs. a sequence of equal points (e.g. 4 Ass vs. a 5-sequence, both 100) | Seat order from the forehand decides | Some rule sets rank four of a kind higher |
| Game target | 1000 by default, adjustable | Standard varies: 1000, 1500 or 2500 |

When the owner answers, move the row into a "Settled" section (with the date)
and fix both engines and their tests in the same change.
