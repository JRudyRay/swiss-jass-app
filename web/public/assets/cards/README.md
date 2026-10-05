# Swiss-German Jass card images

A complete 36-card Swiss-German pack, hand-coloured lithograph printed in
Hasle bei Burgdorf, late 19th century, held by the British Museum
([1896,0501.805](https://www.britishmuseum.org/collection/object/P_1896-0501-805)).
The two scans on Wikimedia Commons are **public domain**:
[sheet 1](https://commons.wikimedia.org/wiki/File:Print,_playing-card_(BM_1896,0501.805).jpg)
(Rosen, Schellen) and
[sheet 2](https://commons.wikimedia.org/wiki/File:Print,_playing-card_(BM_1896,0501.805_1).jpg)
(Schilten, Eicheln).

Regenerate with `python3 web/scripts/fetch-card-images.py` (needs Pillow and
numpy, about a minute). It checks both files' licence, finds each card's
printed frame, straightens it, evens the yellowed paper out to one ivory and
writes `<suit>_<rank>.webp` (suits `eicheln schellen rosen schilten`, ranks
`6 7 8 9 10 U O K A`) at 282x426 px. A few cards are clipped by the scan
edge (the 10s on the left, some top rows); the missing strip is filled with
paper and the frame line redrawn. The pack's back isn't scanned, so
`back.webp` is drawn by the script in its style (black diagonal lines on blue).

The suit icons in `../suits/` were cut from an older public-domain deck
(Hasle, about 1850, Bibliothèque nationale de France, on Wikimedia Commons as
[Swiss card deck - 1850](https://commons.wikimedia.org/wiki/Category:Swiss_card_deck_-_1850))
by `python3 web/scripts/make-suit-icons.py`, which needs those older
222x336 images; leave them as they are.

Don't add images from commercial decks (AGMüller, Carta Mundi, jass sites):
they are copyrighted. `SwissCard.tsx` falls back to the SVG card if an image
is missing.
