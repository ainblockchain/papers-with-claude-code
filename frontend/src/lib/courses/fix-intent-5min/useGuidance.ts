import { useEffect, useRef } from 'react';

interface UseIdleGuidanceArgs {
  // When true, the idle timer is actively counting down. When false, the
  // timer is fully stopped and won't fire. Callers pass the same gating
  // predicate that pauses the countdown timer (modal open, persisting,
  // pre-quest-seen) plus `activeGuidancePhase !== null`.
  enabled: boolean;
  // Milliseconds of uninterrupted idle-time before `onFire` is invoked.
  delayMs: number;
  // Bumping this key resets the timer — caller changes it on any
  // meaningful progress signal (phase transition, successful submit,
  // anchor button focus, modal open/close). Ambient events like
  // mousemove intentionally do NOT reset; reading the page without
  // acting is exactly when the learner might need a tooltip.
  resetKey: string;
  // Fired once per (enabled, resetKey) window after `delayMs` elapses.
  onFire: () => void;
}

// Single-shot idle timer. Re-arms whenever `resetKey` changes or
// `enabled` flips from false→true.
export function useIdleGuidance({
  enabled,
  delayMs,
  resetKey,
  onFire,
}: UseIdleGuidanceArgs) {
  const onFireRef = useRef(onFire);
  useEffect(() => {
    onFireRef.current = onFire;
  }, [onFire]);

  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => onFireRef.current(), delayMs);
    return () => clearTimeout(id);
  }, [enabled, delayMs, resetKey]);
}

interface UseStrayClickArgs {
  // Same gating semantics as `useIdleGuidance.enabled`.
  enabled: boolean;
  // Current stray-click count for the active phase. The parent owns the
  // counter (so it can live in a Record<GuidancePhase, ...> alongside
  // other guidance state) — this hook just provides the register helper.
  strayCount: number;
  threshold: number;
  onIncrement: () => void;
  onFire: () => void;
}

// Exposes a `register` function the caller wires into the phase's root
// `onClick`. `register(target)` short-circuits when the click originated
// on the anchor (primary action) so legitimate progress doesn't count
// against the learner.
export function useStrayClick({
  enabled,
  strayCount,
  threshold,
  onIncrement,
  onFire,
}: UseStrayClickArgs) {
  const onFireRef = useRef(onFire);
  useEffect(() => {
    onFireRef.current = onFire;
  }, [onFire]);

  useEffect(() => {
    if (!enabled) return;
    if (strayCount >= threshold) onFireRef.current();
  }, [enabled, strayCount, threshold]);

  return {
    register(event: React.MouseEvent, anchorEl: HTMLElement | null) {
      if (!enabled) return;
      // `contains` handles nested spans / icons inside the anchor button.
      if (anchorEl && event.target instanceof Node && anchorEl.contains(event.target)) {
        return;
      }
      onIncrement();
    },
  };
}
