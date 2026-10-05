#!/usr/bin/env python3
"""Cut suit icons (trump badge, score bar) out of the 6 of each suit.

Reads web/public/assets/cards/<suit>_6.webp (run fetch-card-images.py first)
and writes web/public/assets/suits/<suit>.png with a transparent background.
Same public-domain 1850 deck, so no extra licence.
"""
import os
from collections import deque

from PIL import Image, ImageChops

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
# Top-left pip of each 6, in the 222x336 card image.
BOXES = {'eicheln': (12, 80, 100, 134), 'schellen': (20, 22, 93, 98),
         'rosen': (31, 52, 90, 111), 'schilten': (26, 30, 89, 102)}
SIZE = 96


def largest_component(mask):
    """Keep the big blobs (drops stems, specks and border lines)."""
    w, h = mask.size
    px = mask.load()
    seen, comps = set(), []
    for y in range(h):
        for x in range(w):
            if px[x, y] and (x, y) not in seen:
                comp, q = [], deque([(x, y)])
                seen.add((x, y))
                while q:
                    cx, cy = q.popleft()
                    comp.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            q.append((nx, ny))
                comps.append(comp)
    biggest = max(map(len, comps))
    out = Image.new('L', mask.size, 0)
    op = out.load()
    for comp in comps:
        if len(comp) > biggest * 0.15:
            for x, y in comp:
                op[x, y] = 255
    return out


def fill_holes(mask):
    """Make everything not reachable from the border opaque (white petals etc.)."""
    w, h = mask.size
    px = mask.load()
    outside, q = set(), deque()
    for x in range(w):
        q.extend([(x, 0), (x, h - 1)])
    for y in range(h):
        q.extend([(0, y), (w - 1, y)])
    while q:
        x, y = q.popleft()
        if (x, y) in outside or not (0 <= x < w and 0 <= y < h) or px[x, y]:
            continue
        outside.add((x, y))
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    out = Image.new('L', mask.size, 0)
    op = out.load()
    for y in range(h):
        for x in range(w):
            op[x, y] = 0 if (x, y) in outside else 255
    return out


def main():
    os.makedirs(os.path.join(BASE, 'suits'), exist_ok=True)
    for suit, box in BOXES.items():
        card = Image.open(os.path.join(BASE, 'cards', f'{suit}_6.webp')).convert('RGB')
        im = card.crop(box)
        bg = Image.new('RGB', im.size, card.getpixel((40, 6)))
        mask = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 40 else 0)
        mask = fill_holes(largest_component(mask))
        bbox = mask.getbbox()
        im, mask = im.crop(bbox), mask.crop(bbox)
        im.putalpha(mask)
        im.thumbnail((SIZE, SIZE), Image.LANCZOS)
        icon = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        icon.alpha_composite(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
        icon.save(os.path.join(BASE, 'suits', f'{suit}.png'), optimize=True)
    print('wrote', len(BOXES), 'suit icons')


if __name__ == '__main__':
    main()
