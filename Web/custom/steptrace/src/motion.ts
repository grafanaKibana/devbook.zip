// ==========================================================================
//  MOTION  —  pure spring math shared by markers and hero-swaps. No DOM: runs
//  unchanged in the headless test DOM. Callers own the rAF loop and the
//  reduced-motion snap; this module only advances state.
// ==========================================================================

export interface SpringConfig {
  omega0: number
  zeta: number
}

export interface SpringState {
  pos: number
  vel: number
}

// Per-role damping. omega0 is NOT here: it is derived from the live step budget
// by the caller (springOmega) so the spring stays speed-proportional — a fixed
// omega0 leaves markers trailing at 2×.
export const SPRINGS = {
  marker: { zeta: 0.6 },
  held: { zeta: 0.85 },
  swap: { zeta: 0.9 },
}

// Natural frequency (rad/s) from the current step budget in ms. Shorter budget
// (faster playback) → stiffer spring, so the marker keeps pace instead of
// lagging. TAU/budget puts one natural period at roughly one step.
export function springOmega(tweenMs: number): number {
  const budget = Math.max(tweenMs, 1) / 1000
  return (2 * Math.PI) / budget
}

// One semi-implicit (symplectic) Euler step of a damped harmonic oscillator.
// Velocity is advanced first, then position — that ordering keeps the integrator
// stable and carries momentum across retargets so a mid-flight change of target
// is continuous. Large dt is sub-stepped so a stiff spring can't blow up on a
// slow frame or the 50ms hidden-tab fallback (stability needs h < 2/omega0).
export function springStep(
  pos: number,
  vel: number,
  target: number,
  dtMs: number,
  { omega0, zeta }: SpringConfig,
): SpringState {
  if (!(dtMs > 0)) return { pos: target, vel: 0 }
  const w2 = omega0 * omega0
  const damp = 2 * zeta * omega0
  let remaining = dtMs
  const maxStep = 4 // ms
  while (remaining > 0) {
    const h = Math.min(remaining, maxStep) / 1000
    const accel = -w2 * (pos - target) - damp * vel
    vel += accel * h
    pos += vel * h
    remaining -= maxStep
  }
  return { pos, vel }
}

// ==========================================================================
//  A tiny budget-proportional beat scheduler for staged transitions
//  (compare → hold → swap → settle). Pure and clock-injected: it owns no rAF or
//  timer, so it runs unchanged in the headless test DOM and is deterministic
//  under a supplied now(). Beat offsets are FRACTIONS of the step budget, the
//  same way --_stagger = --_tween / 9 is, so a shorter budget (faster playback)
//  shrinks the whole sequence. Beats whose wall-time gap falls under minGapMs
//  coalesce into one group and fire together: at a ~130ms (2x) budget the staging
//  collapses to a single overlapped motion, which is throughput mode, not a bug.
//  The caller drives tick(now) from its own loop and MUST keep that loop awake
//  while pending > 0, or a beat scheduled after everything else has settled never
//  fires (the freeze-mid-beat trap).
// ==========================================================================

export interface SequenceBeat {
  at: number
  run: () => void
}

export interface SequenceHandle {
  tick(now: number): boolean
  cancel(): void
  readonly pending: number
}

export const SEQUENCE_MIN_GAP_MS = 60

export function sequence(
  beats: SequenceBeat[],
  budgetMs: number,
  startNow: number,
  minGapMs: number = SEQUENCE_MIN_GAP_MS,
): SequenceHandle {
  const budget = Math.max(budgetMs, 0)
  let prev = -Infinity
  let group = startNow
  const queue = beats
    .map((beat) => ({ at: startNow + Math.max(0, beat.at) * budget, run: beat.run }))
    .sort((a, b) => a.at - b.at)
    .map((beat) => {
      const fireAt = beat.at - prev < minGapMs ? group : (group = beat.at)
      prev = beat.at
      return { fireAt, run: beat.run }
    })
  let index = 0
  let cancelled = false
  return {
    tick(now) {
      if (cancelled) return false
      while (index < queue.length && now >= queue[index].fireAt) queue[index++].run()
      return index < queue.length
    },
    cancel() {
      cancelled = true
      index = queue.length
    },
    get pending() {
      return queue.length - index
    },
  }
}
