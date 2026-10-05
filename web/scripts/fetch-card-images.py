#!/usr/bin/env python3
"""Build the Swiss-German Jass card images used by the app.

Source: a complete 36-card pack, hand-coloured lithograph printed in Hasle bei
Burgdorf, late 19th century, British Museum 1896,0501.805
(https://www.britishmuseum.org/collection/object/P_1896-0501-805). The two
scans on Wikimedia Commons are public domain:
https://commons.wikimedia.org/wiki/File:Print,_playing-card_(BM_1896,0501.805).jpg
https://commons.wikimedia.org/wiki/File:Print,_playing-card_(BM_1896,0501.805_1).jpg

Each scan shows 18 cards laid out in four rows on a white sheet, slightly
tilted and overlapping, a few clipped by the scan edge. For every card the
script finds the printed black frame (rotation and four sides), straightens
it, evens out the yellowed paper to one clean ivory and redraws the plain
margin around the frame, so all cards come out the same size and colour.
The deck's back isn't scanned; back.webp is drawn here in the pack's style
(black diagonal lines on blue).

Writes web/public/assets/cards/<suit>_<rank>.webp (36 cards) and back.webp at
SIZE, 3x the largest CSS card. Needs Pillow and numpy; takes about a minute.
Run from anywhere: python3 web/scripts/fetch-card-images.py
"""
import io
import json
import os
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'cards')
SIZE = (282, 426)  # 3x the 94x142 desktop card in SwissCard.tsx
UA = {'User-Agent': 'swiss-jass-app/1.0 (https://github.com/jrudyray/swiss-jass-app)'}
PAPER = (248, 242, 227)  # target ivory for the card stock
INK = (34, 28, 24)

# Per scan: the cards row by row (suit, ranks left to right) and a rough centre
# of each card's frame in full-resolution pixels; the fit refines it.
SCANS = {
    'Print, playing-card (BM 1896,0501.805).jpg': [
        ('rosen', ['10', 'A', '6', '7', '8'], [(175, 270), (562, 270), (975, 270), (1400, 270), (1800, 270)]),
        ('rosen', ['9', 'U', 'O', 'K'], [(300, 893), (712, 893), (1125, 893), (1562, 893)]),
        ('schellen', ['10', 'A', '6', '7', '8'], [(162, 1522), (587, 1522), (1012, 1522), (1425, 1522), (1837, 1522)]),
        ('schellen', ['9', 'U', 'O', 'K'], [(300, 2153), (712, 2153), (1125, 2153), (1675, 2153)]),
    ],
    'Print, playing-card (BM 1896,0501.805 1).jpg': [
        ('schilten', ['10', 'A', '6', '7', '8'], [(175, 270), (587, 270), (1000, 270), (1425, 270), (1825, 270)]),
        ('schilten', ['9', 'U', 'O', 'K'], [(312, 893), (712, 893), (1150, 893), (1550, 920)]),
        ('eicheln', ['10', 'A', '6', '7', '8'], [(175, 1545), (575, 1545), (1000, 1545), (1412, 1545), (1825, 1545)]),
        ('eicheln', ['9', 'U', 'O', 'K'], [(375, 2170), (787, 2170), (1200, 2170), (1600, 2170)]),
    ],
}

FRAME = (350, 570)       # typical frame size in scan pixels, used when a side is clipped
GUESS = (161, 273)       # where the frame sides sit from a rough centre, before searching
MARGIN = (26, 20)        # plain margin redrawn around the frame (x, y), scan pixels
HALF = (270, 380)        # half size of the search window around a rough centre
PAD = 500                # white padding so windows near the scan edge stay in bounds
SEARCH = 45              # how far (px) a side may sit from where the rough centre puts it


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()


def fetch(title):
    api = ('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo'
           '&iiprop=url|extmetadata&titles=' + urllib.parse.quote('File:' + title))
    page = next(iter(json.loads(get(api))['query']['pages'].values()))
    info = page['imageinfo'][0]
    licence = info['extmetadata']['LicenseShortName']['value']
    assert licence == 'Public domain', f'{title}: unexpected licence {licence!r}'
    return Image.open(io.BytesIO(get(info['url']))).convert('RGB')


def window(img, cx, cy, angle):
    """Crop around (cx, cy) in the padded scan and rotate it by angle degrees."""
    hx, hy = HALF
    w = img.crop((cx + PAD - hx - 120, cy + PAD - hy - 120, cx + PAD + hx + 120, cy + PAD + hy + 120))
    w = w.rotate(angle, resample=Image.BICUBIC, fillcolor=(255, 255, 255) if w.mode == 'RGB' else 0)
    return w.crop((120, 120, w.width - 120, w.height - 120))


def fit(gray, cx, cy):
    """Find the frame: the rotation whose four sides line up best with dark lines."""
    hx, hy = HALF
    best = None
    for angle in np.arange(-6, 6.01, 0.25):
        dark = np.asarray(window(gray, cx, cy, angle)) < 110
        cols = dark[hy - 200:hy + 200].mean(0)  # vertical lines, measured over the middle rows
        rows = dark[:, hx - 110:hx + 110].mean(1)  # horizontal lines, over the middle columns

        def peak(profile, centre):
            lo = int(centre - SEARCH)
            seg = profile[lo:lo + 2 * SEARCH]
            i = int(seg.argmax())
            return lo + i, float(seg[i])

        sides = [peak(cols, hx - GUESS[0]), peak(cols, hx + GUESS[0]),
                 peak(rows, hy - GUESS[1]), peak(rows, hy + GUESS[1])]
        score = sum(v for _, v in sides)
        if best is None or score > best[0]:
            best = (score, angle, sides)
    _, angle, ((l, lv), (r, rv), (t, tv), (b, bv)) = best
    # A side clipped by the scan edge has no full line; place it from the opposite one.
    # A false line (the scan edge, art) shows up as a frame of the wrong size: keep
    # the stronger side then too.
    if lv < 0.8 or (abs(r - l - FRAME[0]) > 20 and lv < rv): l = r - FRAME[0]
    if rv < 0.8 or abs(r - l - FRAME[0]) > 20: r = l + FRAME[0]
    if tv < 0.8 or (abs(b - t - FRAME[1]) > 20 and tv < bv): t = b - FRAME[1]
    if bv < 0.8 or abs(b - t - FRAME[1]) > 20: b = t + FRAME[1]
    return angle, l, r, t, b


def render(rgb, inside, angle, cx, cy, frame):
    l, r, t, b = frame
    img = window(rgb, cx, cy, angle)
    known = np.asarray(window(inside, cx, cy, angle)) > 128  # False where the scan was clipped
    a = np.asarray(img).astype(float)
    box = (slice(t - 4, b + 5), slice(l - 4, r + 5))  # frame line included
    part, part_known = a[box], known[box]

    # White-balance on the paper: bright, low-saturation pixels inside the frame.
    lum = part.mean(2)
    paper = part_known & (part.max(2) - part.min(2) < 70) & (lum > np.percentile(lum[part_known], 60))
    ref = np.median(part[paper], axis=0)
    part = np.clip(part * (np.array(PAPER) / ref), 0, 255)
    part[~part_known] = PAPER

    mx, my = MARGIN
    w, h = part.shape[1] + 2 * (mx - 4), part.shape[0] + 2 * (my - 4)
    card = Image.new('RGB', (w, h), PAPER)
    card.paste(Image.fromarray(part.astype('uint8')), (mx - 4, my - 4))

    # Redraw the frame line where the scan clipped it.
    if not part_known.all():
        line = Image.new('RGB', (w, h), PAPER)
        ImageDraw.Draw(line).rectangle([mx, my, w - mx - 1, h - my - 1], outline=INK, width=3)
        missing = Image.fromarray(((~part_known) * 255).astype('uint8')).filter(ImageFilter.MaxFilter(9))
        mask = Image.new('L', (w, h), 0)
        mask.paste(missing, (mx - 4, my - 4))
        card = Image.composite(line, card, mask)
    card = card.resize(SIZE, Image.LANCZOS)
    return card.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))


def back():
    """Card back in the pack's style: groups of black diagonal lines on blue."""
    s = 3
    w, h = SIZE[0] * s, SIZE[1] * s
    img = Image.new('RGB', (w, h), (58, 104, 124))
    d = ImageDraw.Draw(img)
    step = 54 * s // 3
    for k in range(-h, w + h, step):
        for off in (0, 6, 12):
            for sign in (1, -1):
                x0 = k + off * s // 3
                if sign == 1:
                    d.line([(x0, 0), (x0 + h, h)], fill=(22, 38, 48), width=s)
                else:
                    d.line([(x0, h), (x0 + h, 0)], fill=(22, 38, 48), width=s)
    return img.resize(SIZE, Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    done = 0
    for title, rows in SCANS.items():
        scan = fetch(title)
        rgb = Image.new('RGB', (scan.width + 2 * PAD, scan.height + 2 * PAD), (255, 255, 255))
        rgb.paste(scan, (PAD, PAD))
        inside = Image.new('L', rgb.size, 0)
        inside.paste(255, (PAD, PAD, PAD + scan.width, PAD + scan.height))
        gray = rgb.convert('L')
        for suit, ranks, centres in rows:
            for rank, (cx, cy) in zip(ranks, centres):
                angle, *frame = fit(gray, cx, cy)
                render(rgb, inside, angle, cx, cy, frame).save(
                    os.path.join(OUT, f'{suit}_{rank}.webp'), quality=88, method=6)
                done += 1
    back().save(os.path.join(OUT, 'back.webp'), quality=88, method=6)
    assert done == 36, f'expected 36 cards, got {done}'
    print(f'wrote {done} cards and back.webp to {os.path.normpath(OUT)}')


if __name__ == '__main__':
    main()
