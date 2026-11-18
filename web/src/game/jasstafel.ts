// The Jasstafel (slate) writes a score as hundreds (strokes), at most one fifty (the diagonal),
// at most two twenties (strokes on the bottom bar) and the remainder as digits. Display only: it is
// always derived from the exact total, so 100h + 50f + 20z + rest === n.
export type Tafel = { h: number; f: 0 | 1; z: 0 | 1 | 2; rest: number };

export function tafel(n: number): Tafel {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  const h = Math.floor(v / 100);
  let r = v - h * 100;
  const f = r >= 50 ? 1 : 0;
  r -= 50 * f;
  const z = Math.floor(r / 20) as 0 | 1 | 2;
  return { h, f, z, rest: r - 20 * z };
}

// Tally marks come in groups of five: four strokes and the slash across them.
export function tallyGroups(n: number): number[] {
  const groups: number[] = [];
  for (let left = Math.max(0, n); left > 0; left -= 5) groups.push(Math.min(5, left));
  return groups;
}

// A small deterministic pseudo-random number in [-1, 1) for the i-th stroke and its k-th
// coordinate: the hand-drawn wobble stays the same on every render (no Math.random).
export function jitter(i: number, k: number): number {
  let x = (Math.imul(i + 1, 374761393) + Math.imul(k + 1, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return ((x >>> 0) % 2000) / 1000 - 1;
}
