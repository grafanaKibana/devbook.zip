import type { ClockDependencies } from "../domain/types"

export interface SimulationClock {
  readonly paused: boolean
  pause(): void
  resume(): void
  reset(): void
  destroy(): void
}

export const createSimulationClock = (
  dependencies: ClockDependencies,
  onTick: (elapsedSeconds: number) => void,
  intervalMs = 250,
  maximumElapsedMs = 1000,
): SimulationClock => {
  let last = dependencies.now()
  let paused = false
  let destroyed = false
  const handle = dependencies.setInterval(() => {
    const now = dependencies.now()
    const elapsed = Math.min(Math.max(now - last, 0), maximumElapsedMs)
    last = now
    if (!destroyed && !paused && elapsed > 0) onTick(elapsed / 1000)
  }, intervalMs)
  return {
    get paused() {
      return paused
    },
    pause() {
      if (destroyed) return
      paused = true
    },
    resume() {
      if (destroyed) return
      last = dependencies.now()
      paused = false
    },
    reset() {
      if (!destroyed) last = dependencies.now()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      dependencies.clearInterval(handle)
    },
  }
}
