// Sound effects synthesized with WebAudio: no asset files. Quiet by design (low master gain) and
// rate-limited so quick plays never pile up into noise. The AudioContext is created and resumed
// inside the first pointerdown (iOS only starts audio from a user gesture); before that, and when
// WebAudio is missing, every call is a silent no-op.
export type SoundKind = 'card' | 'trick' | 'turn' | 'weis' | 'stoeck' | 'matsch' | 'win' | 'lose';

// Priority 3 and up are jingles: they queue behind each other and silence the small sounds.
const PRIORITY: Record<SoundKind, number> = {
  turn: 1,
  card: 1,
  trick: 1,
  weis: 2,
  stoeck: 2,
  matsch: 3,
  win: 4,
  lose: 4,
};
// Minimum gap between two sounds of the same kind, in seconds.
const MIN_GAP: Record<SoundKind, number> = {
  turn: 0.4,
  card: 0.07,
  trick: 0.3,
  weis: 0.5,
  stoeck: 0.5,
  matsch: 1,
  win: 2,
  lose: 2,
};
const MASTER = 0.3;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let busyUntil = 0; // audio time until which a jingle is playing
const lastAt: Partial<Record<SoundKind, number>> = {};
let installed = false;

type AudioCtor = typeof AudioContext;
const ctor = (): AudioCtor | undefined =>
  typeof window === 'undefined'
    ? undefined
    : window.AudioContext ||
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const C = ctor();
  if (!C) return null;
  try {
    // Play alongside music and respect the silent switch the way a game should.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'ambient';
  } catch {
    /* not supported */
  }
  try {
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(comp);
    comp.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
  return ctx;
}

// Call once: the first pointerdown creates/resumes the context.
export function installSoundUnlock() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const unlock = () => {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true, passive: true });
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise) return noise;
  const len = Math.floor(c.sampleRate * 0.25);
  noise = c.createBuffer(1, len, c.sampleRate);
  const d = noise.getChannelData(0);
  let seed = 12345; // fixed seed: the same soft noise every time
  for (let i = 0; i < len; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    d[i] = (seed >>> 8) / 8388608 - 1;
  }
  return noise;
}

// A pitched note with a soft attack and an exponential decay.
function tone(
  c: AudioContext,
  at: number,
  freq: number,
  dur: number,
  peak: number,
  type: OscillatorType = 'sine',
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.05);
}

// Each recipe returns how long it keeps the speakers busy (seconds).
function cardPlayed(c: AudioContext, at: number): number {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1500 + ((Math.random() * 900) | 0); // varied a little each time
  bp.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.5, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  src.connect(bp).connect(g).connect(master!);
  src.start(at);
  src.stop(at + 0.1);
  tone(c, at, 130 + Math.random() * 20, 0.06, 0.12);
  return 0.08;
}

function trickTaken(c: AudioContext, at: number): number {
  tone(c, at, 392, 0.22, 0.14, 'triangle');
  tone(c, at + 0.11, 523.25, 0.3, 0.14, 'triangle');
  return 0.4;
}

function yourTurn(c: AudioContext, at: number): number {
  tone(c, at, 880, 0.05, 0.05);
  return 0.06;
}

// Small bell: a fundamental with two inharmonic partials.
function bell(c: AudioContext, at: number): number {
  tone(c, at, 1318.5, 0.9, 0.13);
  tone(c, at, 1318.5 * 2.76, 0.4, 0.04);
  tone(c, at, 1318.5 * 5.4, 0.2, 0.02);
  return 0.9;
}

function matsch(c: AudioContext, at: number): number {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    tone(c, at + i * 0.075, f, 0.28, 0.13, 'triangle'),
  );
  return 0.55;
}

// A Ländler-like major figure: broken triad up, then a held top note and a step-wise close.
function won(c: AudioContext, at: number): number {
  const q = 0.17;
  const notes: [number, number, number][] = [
    [261.63, 0, 1], // C4 E4 G4 C5, then E5 G5 held
    [329.63, 1, 1],
    [392.0, 2, 1],
    [523.25, 3, 1.4],
    [659.25, 4.4, 1],
    [523.25, 5.4, 1],
    [392.0, 6.4, 1],
    [523.25, 7.4, 2.6],
  ];
  for (const [f, beat, len] of notes) {
    tone(c, at + beat * q, f, Math.max(0.25, len * q * 1.5), 0.15, 'triangle');
    tone(c, at + beat * q, f / 2, Math.max(0.25, len * q * 1.2), 0.06);
  }
  return 10 * q;
}

function lost(c: AudioContext, at: number): number {
  [392, 349.23, 311.13, 261.63].forEach((f, i) => tone(c, at + i * 0.21, f, 0.5, 0.13, 'triangle'));
  return 1.1;
}

const RECIPES: Record<SoundKind, (c: AudioContext, at: number) => number> = {
  card: cardPlayed,
  trick: trickTaken,
  turn: yourTurn,
  weis: bell,
  stoeck: bell,
  matsch,
  win: won,
  lose: lost,
};

// Plays one sound if audio is unlocked. Callers check the user's setting first (useSettings.sfx).
export function playSound(kind: SoundKind) {
  try {
    const c = ctx;
    if (!c || !master || c.state !== 'running') return;
    const now = c.currentTime;
    const last = lastAt[kind];
    if (last !== undefined && now - last < MIN_GAP[kind]) return;
    const p = PRIORITY[kind];
    const busy = now < busyUntil;
    if (busy && p < 3) return; // small sounds are dropped while a jingle plays
    const jingle = p >= 3;
    const at = jingle ? Math.max(now, busyUntil) + 0.02 : now + 0.005; // jingles queue, never overlap
    const len = RECIPES[kind](c, at);
    lastAt[kind] = now;
    if (jingle) busyUntil = at + len;
  } catch {
    /* sound must never break the game */
  }
}

// Cue for the card a player has just played: a Weis is announced with the first card, the
// Stöck with its second. Structural types keep this free of the engine.
type CueState = {
  weis?: Record<number, unknown[]>;
  stoeckPending?: Record<number, { awarded: boolean } | undefined>;
};
export function cueForPlay(
  before: CueState,
  after: CueState,
  playerId: number,
  firstCard: boolean,
): 'weis' | 'stoeck' | null {
  if (firstCard && (after.weis?.[playerId]?.length || 0) > 0) return 'weis';
  if (after.stoeckPending?.[playerId]?.awarded && !before.stoeckPending?.[playerId]?.awarded)
    return 'stoeck';
  return null;
}
