#!/usr/bin/env node
// Checks that all 36 card images plus back.webp exist in public/assets/cards.
// Regenerate them with scripts/fetch-card-images.py.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'cards');
const suits = ['eicheln', 'schellen', 'rosen', 'schilten'];
const ranks = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
const expected = [...suits.flatMap((s) => ranks.map((r) => `${s}_${r}.webp`)), 'back.webp'];
const missing = expected.filter((f) => !existsSync(join(dir, f)));

if (missing.length) {
  console.error(`Missing ${missing.length} card image(s): ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`All ${expected.length} card images present.`);
