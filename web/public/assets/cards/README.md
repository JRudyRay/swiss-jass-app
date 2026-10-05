# Swiss-German Jass card images

Scans of a Swiss-German deck printed around 1850 in Hasle bei Burgdorf,
held by the Bibliothèque nationale de France
([Gallica](https://gallica.bnf.fr/ark:/12148/btv1b105232979)) and published
on Wikimedia Commons as
[Swiss card deck - 1850](https://commons.wikimedia.org/wiki/Category:Swiss_card_deck_-_1850).
**Public domain.** The deck's "2" (Daus) is used as the Ass.

Regenerate with `python3 web/scripts/fetch-card-images.py` (needs Pillow).
It checks every file's licence, trims the scan background and writes
`<suit>_<rank>.webp` (suits `eicheln schellen rosen schilten`, ranks
`6 7 8 9 10 U O K A`) plus `back.webp`, at 222x336 px, with levels, colour
and sharpness lifted so the faded scan reads well on screen.

The suit icons in `../suits/` are cut from the 6 of each suit by
`python3 web/scripts/make-suit-icons.py`.

Don't add images from commercial decks (AGMüller, Carta Mundi, jass sites):
they are copyrighted. `SwissCard.tsx` falls back to the SVG card if an image
is missing.
