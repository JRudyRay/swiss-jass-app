import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { State } from '../../engine/schieber';
import { loadLocalState } from '../../game/localState';
import {
  adviseCard,
  adviseTrump,
  readContract,
  readPlay,
  reviewCard,
  reviewTrump,
  type CardRef,
  type CoachNote,
  type Signal,
  type TrumpChoice,
} from '../../game/coach';

export type CoachMsg = {
  id: number;
  // signal: what another seat's play tells you; tip: asked for; good/better: review of your play
  tone: 'signal' | 'tip' | 'good' | 'better';
  note: CoachNote;
  card?: CardRef;
  choice?: TrumpChoice;
};

const ME = 0; // single-player: the human always sits south
// How long a message stays before a later signal may replace it (ms).
const HOLD = { good: 2200, better: 4500, strong: 2500, weak: 1200 };
const holdFor = (sig: Signal) => (sig.prio >= 3 ? HOLD.strong : HOLD.weak);

// Training mode for the local game. Watches the state: reviews each card and contract the player
// chose, reads the other seats' plays, and gives a tip on request. `version` is the table's
// display state: whenever it changes, the saved engine state (which the local game writes first)
// is read again. `paused` while a trick is being collected.
export function useCoach(enabled: boolean, version: unknown, paused: boolean) {
  const state = useMemo<State | null>(
    () => (enabled && version ? loadLocalState() : null),
    [enabled, version],
  );
  const [msg, setMsg] = useState<CoachMsg | null>(null);
  const [hintCardId, setHintCardId] = useState<string | null>(null);
  const [trumpHint, setTrumpHint] = useState<TrumpChoice | null>(null);
  const prev = useRef<State | null>(null);
  const seq = useRef(0);
  const holdUntil = useRef(0);
  const queued = useRef<Signal | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: Omit<CoachMsg, 'id'>, hold: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queued.current = null;
    holdUntil.current = Date.now() + hold;
    setMsg({ ...m, id: ++seq.current });
  }, []);

  // A signal waits while the current message is held; of several waiting, the most important
  // (then the latest) is shown.
  const signal = useCallback(
    (sig: Signal) => {
      const toMsg = ({ prio: _prio, ...note }: Signal) => ({ tone: 'signal' as const, note });
      const wait = holdUntil.current - Date.now();
      if (wait <= 0) {
        show(toMsg(sig), holdFor(sig));
        return;
      }
      if (queued.current && queued.current.prio > sig.prio) return;
      queued.current = sig;
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        const q = queued.current;
        if (q) show(toMsg(q), holdFor(q));
      }, wait);
    },
    [show],
  );

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queued.current = null;
    holdUntil.current = 0;
    setMsg(null);
    setHintCardId(null);
    setTrumpHint(null);
  }, []);

  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (!enabled || !state) {
      reset();
      return;
    }
    if (!before) return;
    const a = before.played || [];
    const b = state.played || [];
    // The table re-rendered without a move: keep the message and the tip.
    if (
      a.length === b.length &&
      before.phase === state.phase &&
      before.currentPlayer === state.currentPlayer &&
      before.trump === state.trump
    )
      return;
    const newHand = state.phase === 'trump_selection' && before.phase !== 'trump_selection';
    if (b.length < a.length || newHand) {
      reset();
      return;
    }
    setHintCardId(null);
    setTrumpHint(null);

    if (before.phase === 'trump_selection') {
      if (before.currentPlayer === ME) {
        const pushed =
          state.phase === 'trump_selection' && !state.trump && state.currentPlayer !== ME;
        const picked: TrumpChoice | null = pushed
          ? 'schieben'
          : state.trump && state.declarer === ME
            ? (state.trump as TrumpChoice)
            : null;
        if (!picked) return;
        const r = reviewTrump(before, ME, picked);
        show({ tone: r.tone, note: r.why, choice: r.choice }, HOLD[r.tone]);
      } else if (state.trump) {
        const s = readContract(state, ME);
        if (s) signal(s);
      }
      return;
    }

    if (b.length !== a.length + 1) return;
    const e = b[b.length - 1];
    if (e.playerId !== ME) {
      const s = readPlay(state, ME);
      if (s) signal(s);
      return;
    }
    if (before.currentPlayer !== ME) return;
    const mine = before.players.find((p) => p.id === ME)?.hand || [];
    const playedCard = mine.find((c) => c.suit === e.suit && c.rank === e.rank);
    const r = playedCard ? reviewCard(before, ME, playedCard.id) : null;
    if (r) show({ tone: r.tone, note: r.why, card: r.card }, HOLD[r.tone]);
    // No real choice (a forced card): nothing to review, but a tip for it is now stale.
    else setMsg((m) => (m && m.tone === 'tip' ? null : m));
  }, [enabled, state, reset, show, signal]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const myMove =
    enabled &&
    !!state &&
    !paused &&
    state.currentPlayer === ME &&
    (state.phase === 'trump_selection' ||
      (state.phase === 'playing' &&
        (state.players.find((p) => p.id === ME)?.hand.length || 0) > 0));

  const askTip = useCallback(() => {
    const s = prev.current;
    if (!s || s.currentPlayer !== ME) return;
    if (s.phase === 'trump_selection') {
      const a = adviseTrump(s, ME);
      setTrumpHint(a.choice);
      show({ tone: 'tip', note: a.why, choice: a.choice }, 0);
      return;
    }
    const a = adviseCard(s, ME);
    if (!a) return;
    const card = s.players.find((p) => p.id === ME)?.hand.find((c) => c.id === a.cardId);
    if (!card) return;
    setHintCardId(a.cardId);
    show({ tone: 'tip', note: a.why, card: { suit: card.suit, rank: card.rank } }, 0);
  }, [show]);

  return { msg, hintCardId, trumpHint, canTip: myMove, askTip };
}
