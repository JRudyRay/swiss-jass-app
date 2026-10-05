#!/usr/bin/env python3
"""Fetch the Swiss-German Jass card images used by the app.

Source: "Swiss card deck - 1850" on Wikimedia Commons, a Hasle bei Burgdorf
deck scanned by the Bibliothèque nationale de France (Gallica,
https://gallica.bnf.fr/ark:/12148/btv1b105232979). Public domain.
https://commons.wikimedia.org/wiki/Category:Swiss_card_deck_-_1850

Writes web/public/assets/cards/<suit>_<rank>.webp (36 cards) and back.webp,
trimmed to the card edge and sized for 3x display at 74x112 CSS px.
Needs Pillow. Run from anywhere: python3 web/scripts/fetch-card-images.py
"""
import io
import json
import os
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageChops

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'cards')
SIZE = (222, 336)  # 3x the 74x112 card in SwissCard.tsx
UA = {'User-Agent': 'swiss-jass-app/1.0 (https://github.com/jrudyray/swiss-jass-app)'}

SUITS = {'Acorns': 'eicheln', 'Bells': 'schellen', 'Flowers': 'rosen', 'Shields': 'schilten'}
# The 1850 deck's "2" (Daus) is the card played as the Ass.
RANKS = {'2': 'A', '6': '6', '7': '7', '8': '8', '9': '9', 'Banner': '10',
         'Under': 'U', 'Ober': 'O', 'King': 'K'}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()


def trim(img):
    """Crop the scanner background around the card."""
    bg = Image.new('RGB', img.size, img.getpixel((2, 2)))
    diff = ImageChops.difference(img, bg).convert('L').point(lambda v: 255 if v > 30 else 0)
    box = diff.getbbox() or (0, 0, *img.size)
    return img.crop(box)


def main():
    os.makedirs(OUT, exist_ok=True)
    api = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
           '&generator=categorymembers&gcmtitle=Category:Swiss_card_deck_-_1850'
           '&gcmlimit=50&gcmtype=file&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800')
    pages = json.loads(get(api))['query']['pages'].values()
    done = 0
    for p in pages:
        name = p['title'][len('File:Swiss card deck - 1850 - '):-len('.jpg')]
        info = p['imageinfo'][0]
        lic = info['extmetadata'].get('LicenseShortName', {}).get('value')
        assert lic == 'Public domain', f'{name}: unexpected licence {lic!r}'
        if name == 'Back side':
            out = 'back.webp'
        else:
            rank, suit = name.split(' of ')
            out = f'{SUITS[suit]}_{RANKS[rank]}.webp'
        img = trim(Image.open(io.BytesIO(get(info['thumburl']))).convert('RGB'))
        img.resize(SIZE, Image.LANCZOS).save(os.path.join(OUT, out), 'WEBP', quality=82, method=6)
        done += 1
        time.sleep(0.3)
    print(f'wrote {done} images to {os.path.normpath(OUT)}')
    assert done == 37, 'expected 36 cards + back'


if __name__ == '__main__':
    main()
