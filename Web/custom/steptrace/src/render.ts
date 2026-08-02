// ==========================================================================
//  5. RENDER  —  builds DOM only. Sets semantic classes + data attributes +
//  data-driven geometry (bar heights, node coordinates). It sets NO colours
//  or layout — every visual rule lives in src/styles/. To change appearance,
//  edit the owning SCSS module, not this file.
// ==========================================================================

import {
  GRAPH_NODE_HALO_GAP_PX,
  GRAPH_NODE_RADIUS_PX,
  observeFixedSvgNodes,
  trimGraphEdge,
} from "./graph-node"
import { springStep, springOmega, SPRINGS, sequence } from "./motion"

// The step interval the player runs on is baseDelay / speed (260 / speed), while
// --_tween is round(107 / speed); the ratio converts the tween the tracker reads
// into the full step budget the choreography stages against (~130ms at 2x).
const STEP_BUDGET_RATIO = 260 / 107
// Swap staging, as fractions of that budget: wind up at 0, release the held
// spring a quarter in, pop on arrival at the halfway mark. Tuning knobs — verify
// the feel in preview; at a 2x budget these gaps fall under the coalesce floor
// and collapse to one instant.
const SWAP_TRAVEL_AT = 0
const SWAP_SETTLE_AT = 0.5

// ---- sort view: value-in-bar + tracked i/j pin markers (no hat) ----
// shared bar scaffold for sort + binary-search: bottom-aligned bars, each a
// coloured fill with the value BELOW and centered state icons for finalised /
// probe states (revealed via CSS). Returns [{ bar, fill, num, check, probe }].
export function makeBars(stage, n) {
  const bars = []
  for (let k = 0; k < n; k++) {
    const bar = el("div", "steptrace__bar")
    bar.style.setProperty("--_i", String(k))
    const fill = el("div", "steptrace__fill")
    const check = el("div", "steptrace__check")
    check.append(successMarker())
    check.setAttribute("aria-hidden", "true")
    const probe = el("div", "steptrace__probe")
    probe.innerHTML = ICON.search
    probe.setAttribute("aria-hidden", "true")
    const cue = el("div", "steptrace__bar-cue")
    cue.innerHTML = ICON.compare + ICON.swap
    cue.setAttribute("aria-hidden", "true")
    fill.append(check, probe, cue)
    const num = el("div", "steptrace__num")
    bar.append(fill, num)
    stage.append(bar)
    bars.push({ bar, fill, num, check, probe, cue })
  }
  return bars
}

export function barHeightStyle(value, maxValue, minimumRem = 1.8) {
  const ratio = Math.max(0, Math.min(1, Number(value) / Math.max(Number(maxValue), 1)))
  return `calc(${ratio * 100}% + ${(1 - ratio) * minimumRem}rem)`
}

export function resolveLegacySortFrame(frame) {
  const active = frame.active || []
  const isMove = frame.type === "swap" || (frame.type === "overwrite" && frame.range)
  const movements = []
  if (frame.type === "swap" && active.length === 2) {
    movements.push([active[0], active[1]], [active[1], active[0]])
  } else if (frame.type === "overwrite" && frame.from != null && active.length === 1) {
    movements.push([active[0], frame.from])
  }
  return {
    activeIndices: active,
    activeRole: active.length ? (isMove ? "move" : "compare") : null,
    markerIndices: [active[0] ?? frame.candidate ?? null, active[1] ?? null],
    movements,
    laneIndices: null,
    holeIndex: null,
    heldToken: null,
  }
}

export const legacySortViewSemantics = {
  markerLabels: ["i", "j"],
  movementLabel: "swaps",
  resolveFrame: resolveLegacySortFrame,
  watchRows(_frame, _visual) {
    return []
  },
}

export function makeSortView(frames, semantics = legacySortViewSemantics) {
  const maxVal = Math.max(...frames[0].array, 1)
  const n = frames[0].array.length
  // A card either narrates a recursive range (quick/merge/heap) or it does not
  // — decided once up front so the WATCH row count is constant per card.
  const hasRange = frames.some((f) => f.range)
  const hasPivot = frames.some((f) => f.pivot != null)

  const stage = el("div", "steptrace__stage steptrace__stage--pins")
  const bars = makeBars(stage, n)
  const pinI = makeMarker(semantics.markerLabels[0], "a")
  const pinJ = makeMarker(semantics.markerLabels[1], "b")
  const hasHeldToken = frames.some((frame) => semantics.resolveFrame(frame).heldToken)
  const heldMarker = hasHeldToken ? makeMarker("", "held") : null
  const markers = heldMarker ? [pinI, pinJ, heldMarker] : [pinI, pinJ]
  stage.append(...markers.map((marker) => marker.el))

  const status = statusEl()
  const tracker = createBarTracker(stage, bars, markers)
  const heldMarkerIndex = heldMarker ? markers.indexOf(heldMarker) : -1
  let lastPaint = null

  function paint(frame, frameIndex) {
    const range = frame.range || null
    const visual = semantics.resolveFrame(frame)
    if (visual.laneIndices && visual.laneIndices.length) stage.dataset.lane = "1"
    else delete stage.dataset.lane
    for (let k = 0; k < n; k++) {
      const b = bars[k]
      // data-driven geometry (value → height); colours come from data-state.
      b.fill.style.height = visual.holeIndex === k ? "12px" : barHeightStyle(frame.array[k], maxVal)
      b.num.textContent = visual.holeIndex === k ? "∅" : frame.array[k]
      let state = ""
      if (frame.sorted.includes(k)) state = "sorted"
      if (frame.candidate === k) state = "candidate"
      if (visual.activeIndices.includes(k) && visual.activeRole)
        state = visual.activeRole === "move" ? "swap" : "compare"
      b.bar.dataset.state = state
      // recursion overlays: dim bars outside the active range; mark the pivot.
      // Attribute toggles only (no DOM add/remove) — footer stays jitter-free.
      if (range && (k < range[0] || k > range[1])) b.bar.dataset.outside = "1"
      else delete b.bar.dataset.outside
      if (frame.pivot != null && frame.pivot === k) b.bar.dataset.pivot = "1"
      else delete b.bar.dataset.pivot
      if (visual.laneIndices)
        b.bar.dataset.lane = visual.laneIndices.includes(k) ? "active" : "muted"
      else delete b.bar.dataset.lane
      if (visual.holeIndex === k) b.bar.dataset.hole = "1"
      else delete b.bar.dataset.hole
    }
    // FLIP: a moved bar starts in the slot it came FROM and springs home, so the
    // motion is literal. A bar already in flight keeps its live offset and just
    // retargets — the spring carries its velocity, so re-framing mid-swap stays
    // continuous without any offset bookkeeping.
    //   swap      — the pair trade places (bubble/selection/quick/heap)
    //   overwrite — one bar travels from frame.from (insertion shift, merge
    //               lifting a value out of a run head into the merged slot)
    const flights = []
    for (const [to, from] of visual.movements) {
      const bt = bars[to] && bars[to].bar
      const bf = bars[from] && bars[from].bar
      if (!bt || !bf || !bt.isConnected) continue
      const dx = bf.getBoundingClientRect().left - bt.getBoundingClientRect().left
      if (dx) flights.push([to, dx])
    }
    tracker.fly(flights)
    if (heldMarker) {
      heldMarker.setLabel(visual.heldToken?.label || "")
      heldMarker.el.dataset.placing = visual.heldToken?.placing ? "1" : "0"
    }
    const paintState = {
      frameIndex: Number.isInteger(frameIndex) ? frameIndex : null,
      tokenId: visual.heldToken?.id ?? null,
    }
    const resetHeldMarker = heldMarker && shouldResetHeldMarker(lastPaint, paintState)
    if (resetHeldMarker) tracker.reset(heldMarkerIndex)
    tracker.set(visual.markerIndices[0], visual.markerIndices[1], visual.heldToken?.index ?? null)
    if (resetHeldMarker) tracker.renderNow()
    lastPaint = paintState
  }

  function watch(frame) {
    const visual = semantics.resolveFrame(frame)
    const rows = [
      {
        k: semantics.markerLabels[0],
        v: visual.markerIndices[0] ?? "—",
        sw: "var(--_blue)",
      },
      {
        k: semantics.markerLabels[1],
        v: visual.markerIndices[1] ?? "—",
        sw: "var(--_violet)",
      },
    ]
    if (hasPivot && !semantics.markerLabels.includes("pivot"))
      rows.push({
        k: "pivot",
        v: frame.pivot != null ? `[${frame.pivot}] = ${frame.array[frame.pivot]}` : "—",
        sw: "var(--_amber)",
      })
    if (hasRange)
      rows.push({
        k: "range",
        v: frame.range ? `[${frame.range[0]}, ${frame.range[1]}]` : "—",
        sw: "var(--_neutral)",
      })
    rows.push(...semantics.watchRows(frame, visual))
    rows.push({ k: semantics.movementLabel, v: frame.swaps, sw: "var(--_amber)" })
    return rows
  }

  return {
    nodes: [stage, status],
    stageAlignment: "bottom",
    paint,
    watch,
    destroy: tracker.destroy,
  }
}

function makeMarker(label, role) {
  const wrap = el("div", "steptrace__marker steptrace__marker--" + role)
  const body = el("span", "steptrace__marker-body")
  const lbl = el("span", "steptrace__marker-label")
  lbl.textContent = label
  body.append(lbl)
  wrap.append(body)
  return {
    el: wrap,
    body,
    role,
    setLabel(value) {
      lbl.textContent = value
    },
  }
}

export function clampMarkerCenter(target, bodyWidth, stageWidth, padding = 2) {
  const availableHalf = Math.max(0, stageWidth / 2 - padding)
  const half = Math.min(Math.max(0, bodyWidth / 2), availableHalf)
  const min = padding + half
  const max = stageWidth - padding - half
  return Math.min(max, Math.max(min, target))
}

// A target that shifted since the last tick counts as movement even when the
// marker sits exactly on it — the bar underneath may still be flying.
export function markerIsMoving(previousTarget, target, current, epsilon = 0.05) {
  if (!previousTarget) return true
  return (
    Math.abs(previousTarget.x - target.x) > epsilon ||
    Math.abs(previousTarget.y - target.y) > epsilon ||
    Math.abs(current.x - target.x) > epsilon ||
    Math.abs(current.y - target.y) > epsilon
  )
}

export function shouldResetHeldMarker(previous, next) {
  if (!previous) return true
  return previous.tokenId !== next.tokenId || next.frameIndex !== previous.frameIndex + 1
}

// Each marker follows its target bar through an rAF loop that idles whenever
// nothing is moving; every tick measures the stage and each marker. A 50 ms
// timer covers the same window when the document is hidden or rAF is stale.
// Markers and the hero-swap fly share one velocity-carrying spring (motion.ts)
// whose stiffness is derived from the live step budget, so retargets are
// interruptible and 2x playback still tracks. The held-key marker is more
// damped (SPRINGS.held) so placement stays readable.
function createBarTracker(stage, bars, markers) {
  let targets = markers.map(() => null)
  const sx = markers.map(() => null)
  const sy = markers.map(() => null)
  const vx = markers.map(() => 0)
  const vy = markers.map(() => 0)
  const px = markers.map(() => null)
  // hero-swap fly: each bar springs its translateX home to 0. null = at rest, so
  // no inline transform is written and the mount stagger / layout stay untouched.
  const fox = bars.map(() => null)
  const fvx = bars.map(() => 0)
  // foHold latches a seeded spring at its FLIP origin through the anticipation
  // beat; the travel beat clears it so the spring integrates home.
  const foHold = bars.map(() => false)
  // active swap choreographies; frameStep advances them and stays awake while any
  // beat is pending, so a settle scheduled after the spring quiets still fires.
  const sequences = []
  const VEL_EPS = 0.5
  let tweenMs = 107
  function readTween() {
    if (typeof getComputedStyle !== "function") return
    const parsed = Number.parseFloat(getComputedStyle(stage).getPropertyValue("--_tween"))
    if (Number.isFinite(parsed) && parsed > 0) tweenMs = parsed
  }
  const rectOf = (node) =>
    node && typeof node.getBoundingClientRect === "function" ? node.getBoundingClientRect() : null
  // Sentinels for the read phase: a marker with no bar to track, and one whose
  // bar exists but reports no rect.
  const MARKER_ABSENT = { absent: true }
  const MARKER_UNMEASURED = { unmeasured: true }
  const isReduced = () => !!(stage.closest && stage.closest(".steptrace--reduced"))
  let lastStepAt = null
  function frameStep(now) {
    const elapsed = lastStepAt == null ? 0 : Math.max(0, now - lastStepAt)
    lastStepAt = now
    const sr = rectOf(stage)
    if (!sr) return false
    const reduced = isReduced()
    const omega0 = springOmega(tweenMs)
    // swaps travel over the whole step (slower than the markers) and settle near-
    // critically, so a bar glides home instead of darting fast then wobbling.
    const swapOmega = springOmega(tweenMs * STEP_BUDGET_RATIO)
    let moving = false
    // Read phase. Every geometry read is taken before any style is written, so
    // the browser resolves layout once for the whole frame. Interleaving them —
    // read a rect, write a style, read the next marker's rect — forces a
    // synchronous reflow per marker, and that cost multiplies by the number of
    // cards animating on the page.
    const reads = []
    for (let m = 0; m < markers.length; m++) {
      const idx = targets[m]
      const bar = idx != null && idx >= 0 && bars[idx] ? bars[idx].fill : null
      if (!bar || !bar.isConnected) {
        reads.push(MARKER_ABSENT)
        continue
      }
      const br = rectOf(bar)
      // no layout engine (headless test DOM): nothing to place this frame
      reads.push(br ? { br, bodyWidth: rectOf(markers[m].body)?.width ?? 0 } : MARKER_UNMEASURED)
    }
    // Write phase.
    for (let m = 0; m < markers.length; m++) {
      const read = reads[m]
      const mk = markers[m]
      if (read === MARKER_ABSENT) {
        mk.el.style.opacity = "0"
        sx[m] = null
        sy[m] = null
        vx[m] = 0
        vy[m] = 0
        px[m] = null
        continue
      }
      if (read === MARKER_UNMEASURED) continue
      const br = read.br
      const targetX = br.left + br.width / 2 - sr.left
      const tx = clampMarkerCenter(targetX, read.bodyWidth, sr.width)
      mk.el.style.setProperty("--steptrace-marker-tip-offset", `${targetX - tx}px`)
      const ty = mk.role === "held" && mk.el.dataset.placing !== "1" ? 34 : br.top - sr.top
      const zeta = mk.role === "held" ? SPRINGS.held.zeta : SPRINGS.marker.zeta
      if (sx[m] == null || reduced) {
        sx[m] = tx
        vx[m] = 0
      } else if (elapsed > 0) {
        const next = springStep(sx[m], vx[m], tx, elapsed, { omega0, zeta })
        sx[m] = next.pos
        vx[m] = next.vel
      }
      if (sy[m] == null || reduced || mk.role !== "held") {
        sy[m] = ty
        vy[m] = 0
      } else if (elapsed > 0) {
        const next = springStep(sy[m], vy[m], ty, elapsed, { omega0, zeta: SPRINGS.held.zeta })
        sy[m] = next.pos
        vy[m] = next.vel
      }
      const target = { x: tx, y: ty }
      if (
        markerIsMoving(px[m], target, { x: sx[m], y: sy[m] }) ||
        Math.abs(vx[m]) > VEL_EPS ||
        Math.abs(vy[m]) > VEL_EPS
      )
        moving = true
      px[m] = target
      mk.el.style.transform = `translate(${sx[m].toFixed(2)}px, ${sy[m].toFixed(2)}px)`
      mk.el.style.opacity = "1"
    }
    // advance swap choreographies before the hero loop so a travel beat's release
    // takes effect this frame. Reduced motion cancels staging outright — the fly
    // path already snapped the values in place. A pending beat keeps the loop
    // awake independent of the marker idle test above.
    for (let s = sequences.length - 1; s >= 0; s--) {
      if (reduced) {
        sequences[s].cancel()
        sequences.splice(s, 1)
      } else if (sequences[s].tick(now)) {
        moving = true
      } else {
        sequences.splice(s, 1)
      }
    }
    // hero-swap: spring each flying bar's translateX toward its home slot (0).
    for (let b = 0; b < bars.length; b++) {
      if (fox[b] == null) continue
      const bar = bars[b].bar
      if (reduced) {
        fox[b] = null
        fvx[b] = 0
        foHold[b] = false
        bar.style.transform = ""
        bar.style.zIndex = ""
        delete bar.dataset.stage
        continue
      }
      if (foHold[b]) {
        // anticipation: hold at the FLIP origin (dx) while the fill winds up; the
        // travel beat releases the latch. Keep the loop awake meanwhile.
        bar.style.transform = `translateX(${fox[b].toFixed(2)}px)`
        bar.style.zIndex = "2"
        moving = true
        continue
      }
      if (elapsed > 0) {
        const next = springStep(fox[b], fvx[b], 0, elapsed, {
          omega0: swapOmega,
          zeta: SPRINGS.swap.zeta,
        })
        fox[b] = next.pos
        fvx[b] = next.vel
      }
      if (Math.abs(fox[b]) < 0.4 && Math.abs(fvx[b]) < VEL_EPS) {
        fox[b] = null
        fvx[b] = 0
        foHold[b] = false
        bar.style.transform = ""
        bar.style.zIndex = ""
      } else {
        bar.style.transform = `translateX(${fox[b].toFixed(2)}px)`
        bar.style.zIndex = "2"
        moving = true
      }
    }
    return moving
  }
  let lastRafAt = 0
  let raf = null
  let iv = null
  function sleep() {
    if (raf != null) cancelAnimationFrame(raf)
    if (iv != null) clearInterval(iv)
    raf = null
    iv = null
    lastStepAt = null
  }
  function loop(now) {
    lastRafAt = now
    if (frameStep(now)) raf = requestAnimationFrame(loop)
    else sleep()
  }
  function wake() {
    if (raf != null) return
    readTween()
    // without a fresh baseline the first tick after a long sleep reports a huge
    // delta and every spring snaps straight to its target
    lastStepAt = null
    lastRafAt = performance.now()
    // headless test DOM has no rAF: run one best-effort step (a no-op without a
    // layout engine) rather than scheduling a loop that can never paint.
    if (typeof requestAnimationFrame !== "function") {
      frameStep(performance.now())
      return
    }
    raf = requestAnimationFrame(loop)
    iv = setInterval(() => {
      const now = performance.now()
      if ((document.hidden || now - lastRafAt > 100) && !frameStep(now)) sleep()
    }, 50)
  }
  // bars move without any set() when the stage reflows, so a resize has to wake
  // the loop on its own.
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => wake()) : null
  if (ro) ro.observe(stage)
  wake()
  return {
    set(...indices) {
      targets = markers.map((_, index) => indices[index] ?? null)
      wake()
    },
    reset(index) {
      if (index < 0 || index >= markers.length) return
      sx[index] = null
      sy[index] = null
      vx[index] = 0
      vy[index] = 0
      wake()
    },
    // Start a fly for each [barIndex, fromOffset]; a bar already in flight is
    // left alone so its spring carries it home continuously. Reduced motion
    // skips the travel entirely — the value just updates in place. Each new fly
    // stages a wind → travel → settle beat sequence (Heer & Robertson): the bar
    // waits latched at its origin, then springs home, then pops on arrival. At a
    // small (fast-playback) budget those beats coalesce and the swap is one
    // overlapped motion, matching the un-staged behaviour.
    fly(flights) {
      if (isReduced()) return
      readTween()
      const budgetMs = tweenMs * STEP_BUDGET_RATIO
      let started = false
      for (const [idx, dx] of flights) {
        if (idx < 0 || idx >= bars.length || fox[idx] != null) continue
        fox[idx] = dx
        fvx[idx] = 0
        foHold[idx] = true
        const bar = bars[idx].bar
        sequences.push(
          sequence(
            [
              { at: 0, run: () => (bar.dataset.stage = "wind") },
              {
                at: SWAP_TRAVEL_AT,
                run: () => {
                  foHold[idx] = false
                  bar.dataset.stage = "travel"
                },
              },
              { at: SWAP_SETTLE_AT, run: () => (bar.dataset.stage = "settle") },
            ],
            budgetMs,
            performance.now(),
          ),
        )
        started = true
      }
      if (started) wake()
    },
    renderNow() {
      frameStep(performance.now())
    },
    destroy() {
      for (const seq of sequences) seq.cancel()
      sequences.length = 0
      if (ro) ro.disconnect()
      sleep()
    },
  }
}

export const legacySearchViewSemantics = {
  stateForIndex(frame, index) {
    if (frame.found === index) return "found"
    if (frame.mid === index) return "probe"
    if (index < frame.lo || index > frame.hi) return "eliminated"
    return "range"
  },
  watchRows(frame, frames) {
    const target = { k: "target", v: String(frames[0].target), sw: "var(--_accent)" }
    const at = {
      k: "at",
      v: frame.mid != null ? `[${frame.mid}] = ${frame.array[frame.mid]}` : "—",
      sw: "var(--_blue)",
    }
    if (frame.mode === "scan") {
      return [
        target,
        {
          k: "scanned",
          v: frame.mid != null ? `${frame.mid + 1}/${frame.array.length}` : "—",
          sw: "var(--_neutral)",
        },
        at,
      ]
    }
    return [
      target,
      { k: "range", v: `[${frame.lo}, ${frame.hi}]`, sw: "var(--_neutral)" },
      { ...at, k: "mid" },
    ]
  },
}

// ---- indexed-search view: shared bars with configurable range semantics ----
export function makeSearchView(
  frames,
  semantics: {
    stateForIndex(frame: any, index: number): string
    watchRows(frame: any, frames: readonly any[]): any[]
  } = legacySearchViewSemantics,
) {
  const maxVal = Math.max(...frames[0].array, 1)
  const n = frames[0].array.length

  const stage = el("div", "steptrace__stage")
  const bars = makeBars(stage, n)
  const status = statusEl()

  function paint(frame, i, total) {
    for (let k = 0; k < n; k++) {
      const b = bars[k]
      b.fill.style.height = barHeightStyle(frame.array[k], maxVal)
      b.num.textContent = frame.array[k]
      b.bar.dataset.state = semantics.stateForIndex(frame, k)
    }
    status.innerHTML =
      escapeHtml(frame.message) +
      ` <span class="steptrace__counts">· ${frame.comparisons} probe${frame.comparisons === 1 ? "" : "s"} · step ${i + 1}/${total}</span>`
  }

  function watch(frame) {
    return semantics.watchRows(frame, frames)
  }

  return { nodes: [stage, status], stageAlignment: "bottom", paint, watch }
}

export interface BoundarySearchViewDescriptor {
  ariaLabel: string
  rangeLabel: string
  evaluationLabel: string
  unitLabel: string
  watchRows(frame: any): any[]
}

function boundaryTicks(lower: number, upper: number) {
  const span = upper - lower
  if (span <= 12) return Array.from({ length: span + 1 }, (_, index) => lower + index)
  return [
    ...new Set(Array.from({ length: 13 }, (_, index) => Math.round(lower + (span * index) / 12))),
  ]
}

export function makeBoundarySearchView(frames, descriptor: BoundarySearchViewDescriptor) {
  const first = frames[0]
  const ticks = boundaryTicks(first.lower, first.upper)
  const maxExtraLanes = Math.max(
    1,
    ...frames.map((frame) =>
      frame.evaluation ? Math.max(0, frame.evaluation.required - frame.evaluation.allowed) : 0,
    ),
  )

  const root = el("section", "steptrace__boundary")
  root.setAttribute("aria-label", descriptor.ariaLabel)

  const domain = el("div", "steptrace__boundary-domain")
  const domainHead = el("div", "steptrace__boundary-section-head")
  const domainLabel = el("span", "steptrace__boundary-section-label")
  const domainRange = el("span", "steptrace__boundary-section-value")
  domainLabel.textContent = descriptor.rangeLabel
  domainHead.append(domainLabel, domainRange)
  const tickList = el("div", "steptrace__boundary-ticks")
  tickList.style.setProperty("--steptrace-boundary-ticks", String(ticks.length))
  tickList.setAttribute("role", "list")
  const tickNodes = ticks.map((value) => {
    const tick = el("div", "steptrace__boundary-tick")
    tick.setAttribute("role", "listitem")
    tick.dataset.value = String(value)
    tick.textContent = String(value)
    tickList.append(tick)
    return { value, tick }
  })
  domain.append(domainHead, tickList)

  const evaluation = el("div", "steptrace__boundary-evaluation")
  const evaluationHead = el("div", "steptrace__boundary-section-head")
  const evaluationLabel = el("span", "steptrace__boundary-section-label")
  const verdict = el("span", "steptrace__boundary-verdict")
  evaluationLabel.textContent = descriptor.evaluationLabel
  evaluationHead.append(evaluationLabel, verdict)

  const lanes = el("div", "steptrace__boundary-lanes")
  const laneNodes = Array.from({ length: first.allowed }, (_, index) => {
    const lane = el("div", "steptrace__boundary-lane")
    const head = el("div", "steptrace__boundary-lane-head")
    const label = el("span", "steptrace__boundary-lane-label")
    const total = el("span", "steptrace__boundary-lane-total")
    label.textContent = `Day ${index + 1}`
    head.append(label, total)
    const packages = el("div", "steptrace__boundary-packages")
    const meter = el("div", "steptrace__boundary-meter")
    const fill = el("div", "steptrace__boundary-meter-fill")
    meter.append(fill)
    lane.append(head, packages, meter)
    lanes.append(lane)
    return { lane, total, packages, fill }
  })

  const overflow = el("div", "steptrace__boundary-lane steptrace__boundary-lane--overflow")
  overflow.style.setProperty("--steptrace-boundary-overflow-rows", String(maxExtraLanes))
  const overflowHead = el("div", "steptrace__boundary-lane-head")
  const overflowLabel = el("span", "steptrace__boundary-lane-label")
  const overflowTotal = el("span", "steptrace__boundary-lane-total")
  overflowLabel.textContent = "Beyond limit"
  overflowHead.append(overflowLabel, overflowTotal)
  const overflowRows = Array.from({ length: maxExtraLanes }, () => {
    const row = el("div", "steptrace__boundary-overflow-row")
    const rowLabel = el("span", "steptrace__boundary-overflow-label")
    const packages = el("div", "steptrace__boundary-packages")
    row.append(rowLabel, packages)
    overflow.append(row)
    return { row, rowLabel, packages }
  })
  overflow.prepend(overflowHead)
  lanes.append(overflow)
  evaluation.append(evaluationHead, lanes)
  root.append(domain, evaluation)

  const legend = makeLegend(
    [
      ["range", "unknown candidate"],
      ["infeasible", "known too small"],
      ["feasible", "known feasible"],
      ["probe", "current check"],
    ].map(([state, label]) => ({
      state,
      label,
      swatchClass: "steptrace__boundary-legend-swatch",
    })),
    "Monotone boundary states",
    "steptrace__boundary-legend",
  )

  const status = statusEl()

  function packageTokens(container, items) {
    const tokens = items.map((weight) => {
      const token = el("span", "steptrace__boundary-package")
      token.textContent = weight
      return token
    })
    if (!tokens.length) {
      const empty = el("span", "steptrace__boundary-empty")
      empty.textContent = "unused"
      tokens.push(empty)
    }
    container.replaceChildren(...tokens)
  }

  function paint(frame, index, totalFrames) {
    domainRange.textContent = `range ${frame.lo}–${frame.hi}`
    for (const { value, tick } of tickNodes) {
      let state = "range"
      if (value <= frame.maxInfeasible) state = "infeasible"
      if (value >= frame.minFeasible) state = "feasible"
      if (frame.answer === value) state = "answer"
      tick.dataset.state = state
      tick.dataset.current = frame.candidate === value ? "true" : "false"
      tick.setAttribute(
        "aria-label",
        `Capacity ${value}: ${state}${frame.candidate === value ? ", current check" : ""}`,
      )
    }

    const model = frame.evaluation
    const candidate = frame.candidate
    verdict.textContent = model
      ? model.feasible
        ? `${candidate} is feasible`
        : `${candidate} is too small`
      : "waiting for first check"
    verdict.dataset.state = model ? (model.feasible ? "feasible" : "infeasible") : "pending"

    for (let laneIndex = 0; laneIndex < laneNodes.length; laneIndex++) {
      const node = laneNodes[laneIndex]
      const lane = model?.lanes[laneIndex] || null
      packageTokens(node.packages, lane?.items || [])
      node.total.textContent =
        lane && candidate != null
          ? `${descriptor.unitLabel} ${lane.total}/${candidate}`
          : descriptor.unitLabel
      node.fill.style.width =
        lane && candidate ? `${Math.min(100, (lane.total / candidate) * 100)}%` : "0%"
      node.lane.dataset.state = lane ? "used" : "empty"
    }

    const extra = model ? model.lanes.slice(model.allowed) : []
    overflow.dataset.state = extra.length ? "overflow" : "empty"
    overflowTotal.textContent = extra.length
      ? `+${extra.length} day${extra.length === 1 ? "" : "s"}`
      : "none"
    for (let extraIndex = 0; extraIndex < overflowRows.length; extraIndex++) {
      const row = overflowRows[extraIndex]
      const lane = extra[extraIndex]
      row.row.dataset.state = lane ? "overflow" : "empty"
      row.rowLabel.textContent = lane ? `Day ${model.allowed + extraIndex + 1}` : "—"
      packageTokens(row.packages, lane?.items || [])
    }

    status.innerHTML =
      escapeHtml(frame.message) +
      ` <span class="steptrace__counts">· ${frame.probes} check${frame.probes === 1 ? "" : "s"} · step ${index + 1}/${totalFrames}</span>`
  }

  return {
    nodes: [root, legend, status],
    stageLayout: "fill" as const,
    paint,
    watch(frame) {
      return descriptor.watchRows(frame)
    },
  }
}

// ---- string-matching view: text with the pattern aligned underneath ----
const CELL_W = 34 // px; must match .steptrace__cell width for shift alignment
export function makeMatchView(frames) {
  if (frames[0].profile === "z-array") return makeZArrayView(frames)
  if (frames[0].profile === "boyer-moore") return makeBoyerMooreView(frames)

  const text = frames[0].text
  const pattern = frames[0].pattern

  const textRow = el("div", "steptrace__cells")
  const tcells = []
  for (let k = 0; k < text.length; k++) {
    const c = el("div", "steptrace__cell")
    c.textContent = text[k]
    textRow.append(c)
    tcells.push(c)
  }
  const patRow = el("div", "steptrace__cells steptrace__cells--pat")
  const pcells = []
  for (let k = 0; k < pattern.length; k++) {
    const c = el("div", "steptrace__cell steptrace__cell--pat")
    c.textContent = pattern[k]
    patRow.append(c)
    pcells.push(c)
  }
  // small sliding pattern on TOP, full-width main text on the BOTTOM
  const stage = el("div", "steptrace__match")
  stage.append(patRow, textRow)
  const status = statusEl()

  // The text strip is responsive (flex cells), so a text cell's px width isn't
  // fixed. Measure it and (a) size every pattern cell to match via --_cw and
  // (b) translate the pattern by shift × that width so the slide stays aligned.
  // A ResizeObserver re-applies geometry when the container width changes.
  let lastShift = 0
  function applyGeom() {
    const w = tcells.length ? tcells[0].getBoundingClientRect().width : CELL_W
    const cw = w > 0 ? w : CELL_W
    stage.style.setProperty("--_cw", cw + "px")
    patRow.style.transform = `translateX(${(lastShift * cw).toFixed(2)}px)`
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(applyGeom) : null
  if (ro) ro.observe(textRow)

  function paint(frame, i, total) {
    lastShift = frame.shift
    applyGeom()
    for (let k = 0; k < tcells.length; k++) tcells[k].dataset.state = ""
    for (let k = 0; k < pcells.length; k++) pcells[k].dataset.state = ""
    // matched regions (persist)
    for (const s of frame.found)
      for (let k = 0; k < pattern.length; k++)
        if (tcells[s + k]) tcells[s + k].dataset.state = "found"
    // current window under the pattern
    for (let k = 0; k < pattern.length; k++) {
      const t = tcells[frame.shift + k]
      if (t && t.dataset.state !== "found") t.dataset.state = "window"
    }
    // current comparison
    if (frame.cmpT != null && tcells[frame.cmpT])
      tcells[frame.cmpT].dataset.state = frame.cmpResult || "probe"
    if (frame.cmpP != null && pcells[frame.cmpP])
      pcells[frame.cmpP].dataset.state = frame.cmpResult || "probe"
    status.innerHTML =
      escapeHtml(frame.message) + ` <span class="steptrace__counts">· step ${i + 1}/${total}</span>`
  }

  function watch(frame) {
    const rows = [
      { k: "shift", v: String(frame.shift), sw: "var(--_blue)" },
      { k: "matches", v: String(frame.found.length), sw: "var(--_green)" },
    ]
    return rows
  }

  return { nodes: [stage, status], paint, watch, destroy: () => ro && ro.disconnect() }
}

function makeBoyerMooreView(frames) {
  const first = frames[0]
  const text = first.text
  const pattern = first.pattern
  const stage = el("div", "steptrace__match steptrace__bm")
  stage.dataset.profile = "boyer-moore"
  const viewport = el("div", "steptrace__bm-viewport")
  const board = el("div", "steptrace__bm-board")

  const makeCell = (character, patternCell = false) => {
    const cell = el(
      "div",
      `steptrace__cell steptrace__bm-cell${patternCell ? " steptrace__cell--pat" : ""}`,
    )
    const value = el("span", "steptrace__bm-char")
    value.textContent = character
    const cue = el("span", "steptrace__bm-compare-icon")
    cue.setAttribute("aria-hidden", "true")
    const matchIcon = el("span", "steptrace__bm-icon steptrace__bm-icon--match")
    matchIcon.append(successMarker())
    matchIcon.setAttribute("aria-hidden", "true")
    const mismatchIcon = el("span", "steptrace__bm-icon steptrace__bm-icon--mismatch")
    mismatchIcon.innerHTML = ICON.x
    mismatchIcon.setAttribute("aria-hidden", "true")
    cue.append(matchIcon, mismatchIcon)
    cell.append(value, cue)
    return cell
  }

  const patternRow = el("div", "steptrace__cells steptrace__cells--pat steptrace__bm-pattern")
  const patternCells = []
  for (let i = 0; i < pattern.length; i++) {
    const cell = makeCell(pattern[i], true)
    patternRow.append(cell)
    patternCells.push(cell)
  }

  const textRow = el("div", "steptrace__cells steptrace__bm-text")
  const textCells = []
  for (let i = 0; i < text.length; i++) {
    const cell = makeCell(text[i])
    textRow.append(cell)
    textCells.push(cell)
  }
  board.append(patternRow, textRow)
  viewport.append(board)
  stage.append(viewport)
  const status = statusEl()

  let currentFrame = first
  function applyGeom() {
    const measured = textCells[0]?.getBoundingClientRect?.().width || CELL_W
    const cw = measured > 0 ? measured : CELL_W
    stage.style.setProperty("--_cw", `${cw}px`)
    patternRow.style.transform = `translateX(${(currentFrame.shift * cw).toFixed(2)}px)`
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(applyGeom) : null
  if (ro) ro.observe(textRow)

  function paint(frame, index, total) {
    currentFrame = frame
    stage.dataset.frame = frame.type
    for (const cell of textCells) cell.dataset.state = ""
    for (const cell of patternCells) cell.dataset.state = ""
    for (const found of frame.found)
      for (let j = 0; j < pattern.length; j++)
        if (textCells[found + j]) textCells[found + j].dataset.state = "found"
    if (frame.matchedFrom != null)
      for (let j = frame.matchedFrom; j < pattern.length; j++) {
        patternCells[j].dataset.state = "suffix"
        const textCell = textCells[frame.shift + j]
        if (textCell && textCell.dataset.state !== "found") textCell.dataset.state = "suffix"
      }
    if (frame.cmpT != null && textCells[frame.cmpT])
      textCells[frame.cmpT].dataset.state = frame.cmpResult
    if (frame.cmpP != null && patternCells[frame.cmpP])
      patternCells[frame.cmpP].dataset.state = frame.cmpResult
    if (
      frame.type === "match" ||
      (frame.shiftDecision?.winner === "full-match" && frame.found.includes(frame.shift))
    )
      for (const cell of patternCells) cell.dataset.state = "found"
    applyGeom()
    status.innerHTML =
      escapeHtml(frame.message) +
      ` <span class="steptrace__counts">· step ${index + 1}/${total}</span>`
  }

  function watch(frame) {
    const suffix =
      frame.matchedFrom == null || frame.matchedFrom >= pattern.length
        ? "—"
        : pattern.slice(frame.matchedFrom)
    const choice = ["decision", "match", "shift", "done"].includes(frame.type)
      ? frame.shiftDecision
      : null
    const winner =
      choice?.winner === "bad-character"
        ? "bad wins"
        : choice?.winner === "good-suffix"
          ? "good wins"
          : choice?.winner === "full-match"
            ? "full match"
            : choice?.winner === "tie"
              ? "tie"
              : ""
    return [
      { k: "align", v: frame.shift, sw: "var(--_blue)" },
      { k: "j", v: frame.j ?? "—", sw: "var(--_violet)" },
      { k: "suffix", v: suffix, sw: "var(--_green)" },
      { k: "bad shift", v: choice?.bad ?? "—", sw: "var(--_blue)" },
      { k: "good shift", v: choice?.good ?? "—", sw: "var(--_violet)" },
      {
        k: "selected shift",
        v: choice ? `${choice.selected} · ${winner}` : "—",
        sw: "var(--_amber)",
      },
    ]
  }

  return {
    nodes: [stage, status],
    stableStage: true,
    paint,
    watch,
    destroy: () => ro && ro.disconnect(),
  }
}

export function resolveVisibleScrollLeft(
  scrollLeft,
  clientWidth,
  scrollWidth,
  targetStart,
  targetEnd,
  padding = 8,
) {
  if (
    !Number.isFinite(scrollLeft) ||
    !Number.isFinite(clientWidth) ||
    !Number.isFinite(scrollWidth) ||
    !Number.isFinite(targetStart) ||
    !Number.isFinite(targetEnd) ||
    clientWidth <= 0
  )
    return scrollLeft
  const maxScroll = Math.max(0, scrollWidth - clientWidth)
  const inset = Math.min(Math.max(0, padding), clientWidth / 2)
  if (targetStart < scrollLeft + inset) return Math.min(maxScroll, Math.max(0, targetStart - inset))
  if (targetEnd > scrollLeft + clientWidth - inset)
    return Math.min(maxScroll, Math.max(0, targetEnd - clientWidth + inset))
  return scrollLeft
}

function makeZArrayView(frames) {
  const text = frames[0].text
  const stage = el("div", "steptrace__z")
  stage.dataset.profile = "z-array"
  const viewport = el("div", "steptrace__z-viewport")
  const board = el("div", "steptrace__z-board")
  board.style.setProperty("--_z-length", String(Math.max(text.length, 1)))

  const makeRail = (label) => {
    const rail = el("div", "steptrace__z-rail")
    const heading = el("div", "steptrace__rail-label steptrace__z-label")
    heading.textContent = label
    rail.append(heading)
    return rail
  }

  const prefixRail = makeRail("prefix")
  const prefixClip = el("div", "steptrace__z-prefix-clip")
  const prefixTrack = el("div", "steptrace__cells steptrace__z-track")
  const prefixCells = []
  for (let k = 0; k < text.length; k++) {
    const cell = el("div", "steptrace__cell steptrace__z-cell steptrace__z-cell--prefix")
    cell.textContent = text[k]
    prefixTrack.append(cell)
    prefixCells.push(cell)
  }
  prefixClip.append(prefixTrack)
  prefixRail.append(prefixClip)

  const stringRail = makeRail("string")
  const stringRow = el("div", "steptrace__cells steptrace__z-string")
  const stringCells = []
  for (let k = 0; k < text.length; k++) {
    const edge = k === text.length - 1 ? " steptrace__z-cell--edge-end" : ""
    const cell = el("div", `steptrace__cell steptrace__z-cell steptrace__z-cell--string${edge}`)
    const value = el("span", "steptrace__z-char")
    value.textContent = text[k]
    const index = el("span", "steptrace__z-index")
    index.textContent = String(k)
    cell.append(value, index)
    stringRow.append(cell)
    stringCells.push(cell)
  }
  const cursor = el("div", "steptrace__z-cursor")
  cursor.setAttribute("aria-hidden", "true")
  const bracket = el("div", "steptrace__z-bracket")
  bracket.setAttribute("aria-hidden", "true")
  stringRow.append(bracket, cursor)
  stringRail.append(stringRow)

  const zRail = makeRail("Z array")
  const zRow = el("div", "steptrace__cells steptrace__z-values")
  const zCells = []
  for (let k = 0; k < text.length; k++) {
    const cell = el("div", "steptrace__cell steptrace__z-cell steptrace__z-cell--value")
    cell.textContent = "·"
    zRow.append(cell)
    zCells.push(cell)
  }
  zRail.append(zRow)

  board.append(prefixRail, stringRail, zRail)
  viewport.append(board)
  stage.append(viewport)
  const status = statusEl()

  let currentFrame = frames[0]
  function applyGeom() {
    const measured = stringCells[0]?.getBoundingClientRect?.().width || CELL_W
    const cw = measured > 0 ? measured : CELL_W
    const i = currentFrame.i
    const [l, r] = currentFrame.box || [0, 0]
    stage.style.setProperty("--_cw", `${cw}px`)
    prefixTrack.style.transform = `translateX(${((i ?? 0) * cw).toFixed(2)}px)`
    cursor.style.transform = `translateX(${((i ?? 0) * cw).toFixed(2)}px)`
    bracket.style.transform = `translateX(${(l * cw).toFixed(2)}px)`
    const shellEndInset = r === text.length - 1 ? 1 : 0
    const boxWidth = Math.max(1, r - l + 1) * cw
    bracket.style.width = `${Math.max(1, boxWidth - shellEndInset)}px`
  }
  function ensureActiveVisible() {
    if (currentFrame.i == null) return
    const candidate = currentFrame.compare?.candidate
    const firstIndex = Math.min(currentFrame.i, candidate ?? currentFrame.i)
    const lastIndex = Math.max(currentFrame.i, candidate ?? currentFrame.i)
    const firstRect = stringCells[firstIndex]?.getBoundingClientRect?.()
    const lastRect = stringCells[lastIndex]?.getBoundingClientRect?.()
    const viewportRect = viewport.getBoundingClientRect?.()
    if (!firstRect || !lastRect || !viewportRect) return
    const targetStart = viewport.scrollLeft + firstRect.left - viewportRect.left
    const targetEnd = viewport.scrollLeft + lastRect.left + lastRect.width - viewportRect.left
    const next = resolveVisibleScrollLeft(
      viewport.scrollLeft,
      viewport.clientWidth,
      viewport.scrollWidth,
      targetStart,
      targetEnd,
    )
    if (Math.abs(next - viewport.scrollLeft) < 0.5) return
    const behavior = stage.closest?.(".steptrace--reduced") ? "auto" : "smooth"
    if (typeof viewport.scrollTo === "function") viewport.scrollTo({ left: next, behavior })
    else viewport.scrollLeft = next
  }
  function syncLayout() {
    applyGeom()
    ensureActiveVisible()
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncLayout) : null
  if (ro) {
    ro.observe(stringRow)
    ro.observe(viewport)
  }

  function paint(frame, index, total) {
    currentFrame = frame
    stage.dataset.frame = frame.type
    stage.dataset.case = frame.sourceCase || ""
    const comparisonActive = !!frame.compare
    const copyActive = frame.type === "copy"
    const boxActive = !!frame.box && frame.box[0] <= frame.box[1]
    prefixClip.dataset.clipped = frame.i != null && frame.i > 0 ? "1" : "0"
    bracket.dataset.edgeStart = boxActive && frame.box[0] === 0 ? "1" : "0"
    bracket.dataset.edgeEnd = boxActive && frame.box[1] === text.length - 1 ? "1" : "0"
    cursor.dataset.visible = frame.i != null && !comparisonActive && !copyActive ? "1" : "0"
    bracket.dataset.visible = boxActive && !comparisonActive && !copyActive ? "1" : "0"
    for (let k = 0; k < text.length; k++) {
      prefixCells[k].dataset.state = ""
      stringCells[k].dataset.state = ""
      zCells[k].dataset.state = ""
      zCells[k].textContent = frame.z[k] == null ? "·" : String(frame.z[k])
      if (frame.box && k >= frame.box[0] && k <= frame.box[1]) stringCells[k].dataset.box = "1"
      else delete stringCells[k].dataset.box
    }
    if (frame.i != null && !comparisonActive && !copyActive && stringCells[frame.i])
      stringCells[frame.i].dataset.state = "probe"
    if (frame.type === "copy" && frame.k != null) {
      zCells[frame.k].dataset.state = "copy-source"
      zCells[frame.i].dataset.state = "copy-target"
    }
    if (frame.type === "commit" && frame.i != null) zCells[frame.i].dataset.state = "found"
    if (frame.compare) {
      const state = frame.compare.result
      prefixCells[frame.compare.prefix].dataset.state = state
      stringCells[frame.compare.candidate].dataset.state = state
    }
    syncLayout()
    status.innerHTML =
      escapeHtml(frame.message) +
      ` <span class="steptrace__counts">· step ${index + 1}/${total}</span>`
  }

  function watch(frame) {
    const box = frame.box || [0, 0]
    const boxValue = box[0] <= box[1] ? `[${box[0]}, ${box[1]}]` : "—"
    const source =
      frame.sourceCase === "outside"
        ? "direct"
        : frame.sourceCase === "copy" && frame.k != null
          ? `copy Z[${frame.k}]`
          : frame.sourceCase === "reuse-extend"
            ? "extend edge"
            : "—"
    return [
      {
        k: "i",
        v: frame.i ?? "—",
        sw: "var(--_blue)",
        hint: "Suffix start whose prefix-match length is being computed.",
      },
      { k: "Z-box", v: boxValue, sw: "var(--_violet)" },
      { k: "source", v: source, sw: "var(--_amber)" },
      {
        k: "Z[i]",
        v: frame.i == null ? "—" : (frame.z[frame.i] ?? "·"),
        sw: "var(--_green)",
      },
    ]
  }

  return {
    nodes: [stage, status],
    stableStage: true,
    paint,
    watch,
    destroy: () => ro && ro.disconnect(),
  }
}

// ---- array-pointer view: a segmented strip + [ ] end brackets + window ----
// The active window tints the cells' OWN background, so the strip's
// overflow:hidden rounded frame clips it flush — rounded only at the real
// ends, square at interior edges (no floating mid-strip radius). The blue [
// / violet ] brackets overlay the window ends; match recolours all of it green.
export function makeArrayStrip(values: readonly unknown[]) {
  const wrap = el("div", "steptrace__pwrap")
  const strip = el("div", "steptrace__pcells")
  const cells = values.map((value) => {
    const cell = el("div", "steptrace__pcell")
    cell.textContent = String(value)
    strip.append(cell)
    return cell
  })
  wrap.append(strip)
  return { wrap, strip, cells }
}

export function makePointerView(frames) {
  const n = frames[0].array.length
  // capture pointer names once so WATCH always shows the same rows (constant
  // height ⇒ no footer jitter even on frames that carry no pointers).
  const ptrNames = (function () {
    for (const f of frames) {
      const ks = Object.keys(f.pointers || {})
      if (ks.length) return ks
    }
    return []
  })()
  const { wrap, cells } = makeArrayStrip(frames[0].array)
  const brackets = el("div", "steptrace__pbrackets")
  const brL = el("div", "steptrace__pbr steptrace__pbr--l")
  const brR = el("div", "steptrace__pbr steptrace__pbr--r")
  brackets.append(brL, brR)
  wrap.append(brackets)
  const status = statusEl()

  function paint(frame) {
    const win = frame.window
    const matched = frame.marked && frame.marked.length > 0
    for (let k = 0; k < n; k++) {
      const c = cells[k]
      c.textContent = frame.array[k]
      let state = ""
      if (win && k >= win[0] && k <= win[1]) state = matched ? "match" : "window"
      c.dataset.state = state
      c.dataset.end = win && k === win[0] ? "l" : win && k === win[1] ? "r" : ""
    }
    if (!win) {
      brackets.style.display = "none"
    } else {
      brackets.style.display = ""
      brL.style.left = (win[0] / n) * 100 + "%"
      brR.style.left = ((win[1] + 1) / n) * 100 + "%"
      brL.dataset.round = win[0] === 0 ? "1" : "0"
      brR.dataset.round = win[1] === n - 1 ? "1" : "0"
      brackets.dataset.match = matched ? "1" : "0"
    }
    status.innerHTML = escapeHtml(frame.message)
  }

  function watch(frame) {
    const color = {
      left: "var(--_blue)",
      lo: "var(--_blue)",
      l: "var(--_blue)",
      i: "var(--_blue)",
      right: "var(--_violet)",
      hi: "var(--_violet)",
      r: "var(--_violet)",
      j: "var(--_violet)",
    }
    const p = frame.pointers || {}
    return ptrNames.map((name) => {
      const idx = p[name]
      return {
        k: name,
        v: idx != null ? `[${idx}] = ${frame.array[idx]}` : "—",
        sw: color[name.toLowerCase()] || "var(--_muted)",
      }
    })
  }

  return { nodes: [wrap, status], paint, watch }
}

export interface MatrixGridViewSemantics {
  tableLabel: string
  axisDescription?: string
  cornerLabel?: string
  stageLayout?: "compact" | "fill"
  formatValue(value: unknown): string
  cellLabel(frame: any, row: number, column: number): string
  stateForCell(frame: any, row: number, column: number): string
  decisionForCell?(frame: any, row: number, column: number): string
  rolesForCell?(frame: any, row: number, column: number): string[]
  headerRole?(frame: any, axis: "row" | "column", index: number): string
  footerModel?(frame: any): MatrixGridFooterModel
  roleLegend?: readonly MatrixGridRoleDescriptor[]
  watchRows(frame: any): Array<{ k: string; v: unknown; sw?: string; hint?: string }>
}

export interface MatrixGridRoleDescriptor {
  role: string
  badge: string
  label: string
}

export interface MatrixGridFooterModel {
  context: string
  summary: {
    text: string
    role?: "keep" | "write"
  }
}

export const lcsMatrixGridSemantics: MatrixGridViewSemantics = {
  tableLabel: "Dynamic-programming table",
  formatValue(value) {
    return value == null ? "" : String(value)
  },
  cellLabel(frame, row, column) {
    const value = frame.grid[row][column]
    return `Cell ${frame.rowLabels[row]}, ${frame.colLabels[column]}: ${value == null ? "empty" : value}`
  },
  stateForCell(frame, row, column) {
    const key = `${row},${column}`
    const curKey = frame.cur ? frame.cur.join(",") : null
    const depSet = new Set((frame.deps || []).map((dependency) => dependency.join(",")))
    const pathSet = new Set((frame.path || []).map((cell) => cell.join(",")))
    if (curKey === key) return "cur"
    if (pathSet.has(key)) return "path"
    if (depSet.has(key)) return "dep"
    return ""
  },
  watchRows(frame) {
    const cur = frame.cur
    const value = cur ? frame.grid[cur[0]][cur[1]] : null
    return [
      { k: "cell", v: cur ? `[${cur[0]}, ${cur[1]}]` : "—", sw: "var(--_blue)" },
      { k: "value", v: value == null ? "—" : String(value), sw: "var(--_green)" },
    ]
  },
}

function paintMatrixRoleBadge(element: HTMLElement, descriptor: MatrixGridRoleDescriptor) {
  element.dataset.role = descriptor.role
  element.replaceChildren(descriptor.badge === "success" ? successMarker() : descriptor.badge)
  element.title = descriptor.label
}

export function makeMatrixRoleBadge(descriptor: MatrixGridRoleDescriptor) {
  const badge = el("span", "steptrace__matrix-role-badge")
  badge.setAttribute("aria-hidden", "true")
  paintMatrixRoleBadge(badge, descriptor)
  return badge
}

function roleDescriptor(
  descriptors: readonly MatrixGridRoleDescriptor[],
  role: string,
): MatrixGridRoleDescriptor {
  const descriptor = descriptors.find((candidate) => candidate.role === role)
  if (!descriptor) throw new Error(`steptrace: matrix role "${role}" is not described.`)
  return descriptor
}

function makeMatrixFooter(
  table: HTMLTableElement,
  columnCount: number,
  descriptors: readonly MatrixGridRoleDescriptor[],
) {
  const root = document.createElement("tfoot")
  root.className = "steptrace__matrix-footer"
  root.setAttribute("aria-label", "Current matrix stage")
  const row = document.createElement("tr")
  const cell = document.createElement("td")
  cell.colSpan = columnCount
  const content = el("div", "steptrace__matrix-footer-row")
  const context = el("span", "steptrace__matrix-footer-context")
  const summary = el("span", "steptrace__matrix-footer-summary")
  content.append(context, summary)
  cell.append(content)
  row.append(cell)
  root.append(row)
  table.append(root)

  function paint(model: MatrixGridFooterModel) {
    context.textContent = model.context
    summary.replaceChildren()
    if (model.summary.role) {
      summary.append(makeMatrixRoleBadge(roleDescriptor(descriptors, model.summary.role)))
    }
    const text = el("span", "steptrace__matrix-footer-summary-text")
    text.textContent = model.summary.text
    summary.append(text)
    row.setAttribute("aria-label", `${model.context}; ${model.summary.text}`)
  }

  return { paint }
}

export function makeDPStoryView(frames) {
  return frames[0].problem === "coin-change"
    ? makeCoinChangeStoryView(frames)
    : makeGridPathStoryView(frames)
}

function makeCoinChangeStoryView(frames) {
  const first = frames[0]
  const root = el("div", "steptrace__dp-story")
  root.setAttribute("role", "region")
  root.setAttribute("aria-label", "Coin change counter")
  root.dataset.approach = first.approach
  const context = el("div", "steptrace__dp-story-context")
  const contextStart = el("span", "steptrace__dp-story-context-start")
  const contextEnd = el("span", "steptrace__dp-story-context-end")
  context.append(contextStart, contextEnd)
  const stage = el("div", "steptrace__dp-story-stage")
  const rack = el("div", "steptrace__coin-rack")
  const coinElements = first.coins.map((coin) => {
    const element = el("span", "steptrace__coin")
    element.textContent = `${coin}¢`
    element.dataset.coin = String(coin)
    rack.append(element)
    return element
  })
  stage.append(rack)
  root.append(context, stage)
  const status = statusEl()
  const tray = first.approach === "tabulation" ? null : el("div", "steptrace__coin-tray")
  const attempts = ["greedy", "naive"].includes(first.approach)
    ? el("div", "steptrace__coin-attempts")
    : null
  const memo = first.approach === "memoization" ? el("div", "steptrace__coin-memo") : null
  const amountBoard = first.approach === "tabulation" ? el("div", "steptrace__amount-board") : null
  const amountCells = []

  if (tray) stage.append(tray)
  if (attempts) stage.append(attempts)
  if (memo) stage.append(memo)
  if (amountBoard) {
    amountBoard.style.setProperty("--steptrace-amount-count", String(first.amounts.length))
    for (const amount of first.amounts) {
      const cell = el("div", "steptrace__amount-cell")
      const label = el("span", "steptrace__amount-label")
      const value = el("span", "steptrace__amount-value")
      label.textContent = `${amount}¢`
      value.textContent = "—"
      cell.append(label, value)
      amountBoard.append(cell)
      amountCells.push({ cell, value, amount })
    }
    stage.append(amountBoard)
  }

  const legendItems =
    first.approach === "memoization"
      ? [
          ["active", "coin being tried"],
          ["selected", "current branch"],
          ["stored", "saved remainder"],
          ["hit", "answer reused"],
        ]
      : first.approach === "tabulation"
        ? [
            ["current", "amount being written"],
            ["dependency", "smaller amount read"],
            ["stored", "solved amount"],
            ["best", "optimal amount chain"],
          ]
        : [
            ["active", "coin being tried"],
            ["selected", "coins on the counter"],
            ["repeated", "repeated subproblem"],
            ["best", "best exact change"],
          ]
  const legend = makeLegend(
    legendItems.map(([state, label]) => ({
      state,
      label,
      swatchClass: "steptrace__swatch steptrace__dp-story-swatch",
    })),
    "Dynamic-programming state legend",
  )

  function paintTray(frame) {
    if (!tray) return
    tray.replaceChildren()
    const trayLabel = el("span", "steptrace__coin-tray-label")
    trayLabel.textContent = frame.selected.length ? "on the counter" : "counter is empty"
    tray.append(trayLabel)
    for (const coin of frame.selected) {
      const element = el("span", "steptrace__coin")
      element.dataset.state = "selected"
      element.textContent = `${coin}¢`
      tray.append(element)
    }
  }

  function paintAttempts(frame) {
    if (!attempts) return
    attempts.replaceChildren()
    for (const attempt of frame.attempts) {
      const row = el("div", "steptrace__coin-attempt")
      row.dataset.state = attempt.state
      const label = el("span", "steptrace__coin-attempt-label")
      const value = el("span", "steptrace__coin-attempt-value")
      label.textContent = attempt.label
      value.textContent = attempt.value
      row.append(label, value)
      attempts.append(row)
    }
  }

  function paintMemo(frame) {
    if (!memo) return
    memo.replaceChildren()
    const heading = el("div", "steptrace__coin-memo-heading")
    heading.textContent = "Saved remainder answers"
    memo.append(heading)
    for (const entry of frame.memo) {
      const row = el("div", "steptrace__coin-memo-row")
      row.dataset.state = entry.state
      const key = el("span", "steptrace__coin-memo-key")
      const value = el("span", "steptrace__coin-memo-value")
      key.textContent = entry.key
      value.textContent = entry.state === "hit" ? `${entry.value} · reused` : entry.value
      row.append(key, value)
      memo.append(row)
    }
  }

  function paintAmounts(frame) {
    if (!amountBoard) return
    for (let index = 0; index < amountCells.length; index++) {
      const { cell, value, amount } = amountCells[index]
      const stored = frame.amountValues[index]
      value.textContent = stored == null ? "—" : String(stored)
      cell.setAttribute(
        "aria-label",
        stored == null
          ? `${amount}¢: unsolved`
          : `${amount}¢: ${stored} coin${stored === 1 ? "" : "s"}`,
      )
      cell.dataset.state =
        amount === frame.amountCurrent
          ? "current"
          : frame.amountPath.includes(amount)
            ? "best"
            : frame.amountDependencies.includes(amount)
              ? "dependency"
              : stored != null
                ? "stored"
                : ""
    }
  }

  return {
    nodes: [root, legend, status],
    stageLayout: "fill",
    stableStage: true,
    paint(frame, index, total) {
      contextStart.textContent =
        frame.approach === "tabulation"
          ? "Build exact change from 0¢"
          : `Customer pays ${frame.target}¢`
      contextEnd.textContent =
        frame.approach === "tabulation"
          ? frame.amountCurrent == null
            ? frame.best || "amount board empty"
            : `writing ${frame.amountCurrent}¢`
          : `remaining ${frame.remaining}¢`
      for (const element of coinElements) {
        const coin = Number(element.dataset.coin)
        element.dataset.state = coin === frame.activeCoin ? "active" : ""
      }
      paintTray(frame)
      paintAttempts(frame)
      paintMemo(frame)
      paintAmounts(frame)
      status.innerHTML =
        escapeHtml(frame.message) +
        ` <span class="steptrace__counts">· step ${index + 1}/${total}</span>`
    },
    watch(frame) {
      const plan = frame.selected.length
        ? frame.selected.map((coin) => `${coin}¢`).join(" + ")
        : "—"
      if (frame.approach === "memoization")
        return [
          {
            k: "remaining",
            v: `${frame.remaining}¢`,
            sw: "var(--_blue)",
            hint: "Remainder handled by the current recursive branch.",
          },
          {
            k: "plan",
            v: plan,
            sw: "var(--_amber)",
            hint: "Coins chosen before the current remainder was reached.",
          },
          {
            k: "memo",
            v: `${frame.memo.length} answers`,
            sw: "var(--_violet)",
            hint: "Remainder answers saved for later recursive calls.",
          },
          {
            k: "best",
            v: frame.best || "—",
            sw: "var(--_green)",
            hint: `Fewest exact coins found for the ${frame.target}-cent payment.`,
          },
        ]
      if (frame.approach === "tabulation")
        return [
          {
            k: "amount",
            v: frame.amountCurrent == null ? "—" : `${frame.amountCurrent}¢`,
            sw: "var(--_blue)",
            hint: "Amount currently being written on the bottom-up board.",
          },
          {
            k: "reads",
            v: frame.amountDependencies.length
              ? frame.amountDependencies.map((amount) => `${amount}¢`).join(", ")
              : "base",
            sw: "var(--_amber)",
            hint: "Smaller solved amounts read before writing the current amount.",
          },
          {
            k: "solved",
            v: String(frame.amountValues.filter((value) => value != null).length),
            sw: "var(--_violet)",
            hint: "Amount answers already written and available for reuse.",
          },
          {
            k: "best",
            v: frame.best || "—",
            sw: "var(--_green)",
            hint: `Fewest exact coins found for the ${frame.target}-cent payment.`,
          },
        ]
      return [
        {
          k: "remaining",
          v: `${frame.remaining}¢`,
          sw: "var(--_blue)",
          hint: "Amount still owed after the coins currently on the counter.",
        },
        {
          k: "plan",
          v: plan,
          sw: "var(--_amber)",
          hint: "Coins chosen by the current branch or strategy.",
        },
        {
          k: "attempts",
          v: String(frame.attempts.length),
          sw: "var(--_violet)",
          hint: "Complete or partial change plans exposed so far.",
        },
        {
          k: "best",
          v: frame.best || "—",
          sw: "var(--_green)",
          hint: `Fewest exact coins found for the ${frame.target}-cent payment.`,
        },
      ]
    },
  }
}

function makeGridPathStoryView(frames) {
  const first = frames[0]
  const table = el("table", "steptrace__warehouse-matrix")
  table.setAttribute("aria-label", "Warehouse route cost matrix")
  const thead = document.createElement("thead")
  const headerRow = document.createElement("tr")
  const corner = document.createElement("th")
  corner.setAttribute("scope", "col")
  corner.textContent = "cost ↓ / tile →"
  headerRow.append(corner)
  for (let column = 0; column < first.costs[0].length; column++) {
    const header = document.createElement("th")
    header.setAttribute("scope", "col")
    header.textContent = `C${column + 1}`
    headerRow.append(header)
  }
  thead.append(headerRow)
  table.append(thead)
  const tbody = document.createElement("tbody")
  const cells = []
  for (let row = 0; row < first.costs.length; row++) {
    const tableRow = document.createElement("tr")
    const header = document.createElement("th")
    header.setAttribute("scope", "row")
    header.textContent = `R${row + 1}`
    tableRow.append(header)
    const rowCells = []
    for (let column = 0; column < first.costs[row].length; column++) {
      const cell = document.createElement("td")
      const place = el("span", "steptrace__warehouse-cell-name")
      const cost = el("span", "steptrace__warehouse-cell-cost")
      const stored = el("span", "steptrace__warehouse-cell-stored")
      place.textContent =
        row === 0 && column === 0
          ? "START"
          : row === first.costs.length - 1 && column === first.costs[row].length - 1
            ? "GOAL"
            : `R${row + 1}C${column + 1}`
      cost.textContent = `cost ${first.costs[row][column]}`
      cell.append(place, cost, stored)
      tableRow.append(cell)
      rowCells.push({ cell, stored })
    }
    cells.push(rowCells)
    tbody.append(tableRow)
  }
  table.append(tbody)
  const tfoot = document.createElement("tfoot")
  const footerRow = document.createElement("tr")
  const footerCell = document.createElement("td")
  footerCell.colSpan = first.costs[0].length + 1
  const footer = el("div", "steptrace__warehouse-footer")
  const footerStart = el("span", "steptrace__warehouse-footer-start")
  const footerEnd = el("span", "steptrace__warehouse-footer-end")
  footer.append(footerStart, footerEnd)
  footerCell.append(footer)
  footerRow.append(footerCell)
  tfoot.append(footerRow)
  table.append(tfoot)
  const status = statusEl()
  const legendItems =
    first.approach === "memoization"
      ? [
          ["current", "tile being evaluated"],
          ["stored", "saved remaining cost"],
          ["repeated", "saved answer reused"],
          ["best", "best complete route"],
        ]
      : first.approach === "tabulation"
        ? [
            ["current", "tile being written"],
            ["dependency", "written neighbour read"],
            ["stored", "remaining cost stored"],
            ["best", "optimal route"],
          ]
        : [
            ["current", "tile being considered"],
            ["path", "current route"],
            ["repeated", "tile reached again"],
            ["best", "best complete route"],
          ]
  const legend = makeLegend(
    legendItems.map(([state, label]) => ({
      state,
      label,
      swatchClass: "steptrace__swatch steptrace__dp-story-swatch",
    })),
    "Dynamic-programming state legend",
  )

  return {
    nodes: [table, legend, status],
    stageLayout: "fill",
    paint(frame, index, total) {
      const path = new Set(frame.path.map(([row, column]) => `${row},${column}`))
      const repeated = new Set(frame.repeated.map(([row, column]) => `${row},${column}`))
      const best = new Set(frame.bestPath.map(([row, column]) => `${row},${column}`))
      const dependencies = new Set(
        frame.gridDependencies.map(([row, column]) => `${row},${column}`),
      )
      let storedCount = 0
      for (let row = 0; row < cells.length; row++) {
        for (let column = 0; column < cells[row].length; column++) {
          const key = `${row},${column}`
          const value = frame.gridValues[row][column]
          if (value != null) storedCount++
          cells[row][column].stored.textContent = value == null ? "" : `best ${value}`
          cells[row][column].cell.dataset.state =
            frame.current?.[0] === row && frame.current?.[1] === column
              ? "current"
              : best.has(key)
                ? "best"
                : repeated.has(key)
                  ? "repeated"
                  : dependencies.has(key)
                    ? "dependency"
                    : path.has(key)
                      ? "path"
                      : value != null
                        ? "stored"
                        : ""
          cells[row][column].cell.setAttribute(
            "aria-label",
            `R${row + 1}C${column + 1}, cost ${frame.costs[row][column]}${value == null ? "" : `, best remaining cost ${value}`}`,
          )
        }
      }
      footerStart.textContent =
        frame.approach === "greedy"
          ? "Greedy route"
          : frame.approach === "naive"
            ? "Recursive routes"
            : frame.approach === "memoization"
              ? "Memoized route"
              : "Fill from the goal"
      footerEnd.textContent =
        frame.approach === "memoization"
          ? `${storedCount} answers saved`
          : frame.approach === "tabulation"
            ? `${storedCount}/${cells.length * cells[0].length} tiles written`
            : frame.bestCost == null
              ? `route cost ${frame.routeCost}`
              : `best route ${frame.bestCost}`
      footerRow.setAttribute("aria-label", `${footerStart.textContent}; ${footerEnd.textContent}`)
      status.innerHTML =
        escapeHtml(frame.message) +
        ` <span class="steptrace__counts">· step ${index + 1}/${total}</span>`
    },
    watch(frame) {
      const current = frame.current ? `R${frame.current[0] + 1}C${frame.current[1] + 1}` : "—"
      const stored = frame.gridValues.flat().filter((value) => value != null).length
      if (frame.approach === "memoization")
        return [
          {
            k: "tile",
            v: current,
            sw: "var(--_blue)",
            hint: "Warehouse tile handled by the current recursive call.",
          },
          {
            k: "route",
            v: frame.routeLabel,
            sw: "var(--_amber)",
            hint: "Recursive route that reached the current tile.",
          },
          {
            k: "memo",
            v: `${stored} tiles`,
            sw: "var(--_violet)",
            hint: "Solved remaining costs stored directly in the warehouse map.",
          },
          {
            k: "best cost",
            v: frame.bestCost == null ? "—" : String(frame.bestCost),
            sw: "var(--_green)",
            hint: "Lowest complete travel cost found for the warehouse route.",
          },
        ]
      if (frame.approach === "tabulation")
        return [
          {
            k: "tile",
            v: current,
            sw: "var(--_blue)",
            hint: "Warehouse tile whose remaining cost is being written.",
          },
          {
            k: "reads",
            v: frame.gridDependencies.length
              ? frame.gridDependencies
                  .map(([row, column]) => `R${row + 1}C${column + 1}`)
                  .join(", ")
              : "base",
            sw: "var(--_amber)",
            hint: "Already-written right and down neighbours read by this tile.",
          },
          {
            k: "written",
            v: `${stored}/${frame.costs.length * frame.costs[0].length}`,
            sw: "var(--_violet)",
            hint: "Warehouse tiles with a stored remaining-route cost.",
          },
          {
            k: "best cost",
            v: frame.bestCost == null ? "—" : String(frame.bestCost),
            sw: "var(--_green)",
            hint: "Lowest complete travel cost found for the warehouse route.",
          },
        ]
      return [
        {
          k: "tile",
          v: current,
          sw: "var(--_blue)",
          hint: "Warehouse tile currently entered or evaluated.",
        },
        {
          k: "route",
          v: frame.routeLabel,
          sw: "var(--_amber)",
          hint: "Right/down route assembled so far from the loading bay.",
        },
        {
          k: "repeated",
          v: String(frame.repeated.length),
          sw: "var(--_violet)",
          hint: "Coordinates reached by more than one recursive route.",
        },
        {
          k: "best cost",
          v: frame.bestCost == null ? "—" : String(frame.bestCost),
          sw: "var(--_green)",
          hint: "Lowest complete travel cost found for the warehouse route.",
        },
      ]
    },
  }
}

// ---- dp view: a 2-D table that fills in cell by cell ----
export function makeDPView(frames, semantics = lcsMatrixGridSemantics) {
  const f0 = frames[0]
  const R = f0.rowLabels.length
  const C = f0.colLabels.length
  const guided = semantics.stageLayout === "fill"
  const roleLegend = semantics.roleLegend || []
  const table = el("table", `steptrace__dp${guided ? " steptrace__dp--guided" : ""}`)
  table.setAttribute("aria-label", semantics.tableLabel)
  const caption = document.createElement("caption")
  caption.className = "steptrace__dp-caption"
  caption.textContent = semantics.axisDescription || semantics.tableLabel
  table.append(caption)
  const thead = document.createElement("thead")
  const htr = document.createElement("tr")
  const corner = document.createElement("th")
  corner.setAttribute("scope", "col")
  corner.className = "steptrace__dp-corner"
  corner.textContent = semantics.cornerLabel || ""
  htr.append(corner)
  const columnHeaders = []
  for (let c = 0; c < C; c++) {
    const th = document.createElement("th")
    th.textContent = f0.colLabels[c]
    th.setAttribute("scope", "col")
    htr.append(th)
    columnHeaders.push(th)
  }
  thead.append(htr)
  table.append(thead)
  const tbody = document.createElement("tbody")
  const cellEls = []
  const rowHeaders = []
  for (let r = 0; r < R; r++) {
    const tr = document.createElement("tr")
    const th = document.createElement("th")
    th.textContent = f0.rowLabels[r]
    th.setAttribute("scope", "row")
    tr.append(th)
    rowHeaders.push(th)
    const rowCells = []
    for (let c = 0; c < C; c++) {
      const td = document.createElement("td")
      if (guided) {
        const value = el("span", "steptrace__dp-value")
        const markers = el("span", "steptrace__dp-markers")
        markers.setAttribute("aria-hidden", "true")
        const operandA = makeMatrixRoleBadge(roleDescriptor(roleLegend, "operand-a"))
        const operandB = makeMatrixRoleBadge(roleDescriptor(roleLegend, "operand-b"))
        const target = makeMatrixRoleBadge(roleDescriptor(roleLegend, "target"))
        markers.append(operandA, operandB, target)
        td.append(value, markers)
        rowCells.push({ td, value, target, pathMarker: null })
      } else {
        const value = el("span", "steptrace__dp-value")
        const pathMarker = el("span", "steptrace__dp-path-marker")
        pathMarker.append(successMarker())
        pathMarker.hidden = true
        td.append(value, pathMarker)
        rowCells.push({ td, value, target: null, pathMarker })
      }
      tr.append(td)
    }
    cellEls.push(rowCells)
    tbody.append(tr)
  }
  table.append(tbody)
  const footer = semantics.footerModel ? makeMatrixFooter(table, C + 1, roleLegend) : null
  const wrap = el("div", `steptrace__dp-wrap${guided ? " steptrace__dp-wrap--guided" : ""}`)
  wrap.append(table)
  const legend = roleLegend.length
    ? makeLegend(
        roleLegend.map((descriptor) => ({
          label: descriptor.label,
          swatchClass: "steptrace__matrix-role-badge",
          role: descriptor.role,
          marker:
            descriptor.badge === "success"
              ? successMarker()
              : document.createTextNode(descriptor.badge),
        })),
        "Matrix role legend",
        "steptrace__matrix-role-legend",
      )
    : null
  const stage = guided ? el("div", "steptrace__dp-stage steptrace__dp-stage--guided") : null
  if (stage) stage.append(wrap)
  const status = statusEl()
  const nodes = stage ? [stage, ...(legend ? [legend] : []), status] : [wrap, status]

  function paint(frame, i, total) {
    if (footer && semantics.footerModel) footer.paint(semantics.footerModel(frame))
    for (let r = 0; r < R; r++) {
      rowHeaders[r].dataset.role = semantics.headerRole?.(frame, "row", r) || ""
    }
    for (let c = 0; c < C; c++) {
      columnHeaders[c].dataset.role = semantics.headerRole?.(frame, "column", c) || ""
    }
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const { td, value, target, pathMarker } = cellEls[r][c]
        const v = frame.grid[r][c]
        value.textContent = semantics.formatValue(v)
        const state = semantics.stateForCell(frame, r, c)
        td.dataset.state = state
        if (pathMarker) pathMarker.hidden = state !== "path"
        td.dataset.roles = (semantics.rolesForCell?.(frame, r, c) || []).join(" ")
        const decision = semantics.decisionForCell?.(frame, r, c) || ""
        if (decision) td.dataset.decision = decision
        else delete td.dataset.decision
        if (target) {
          const role = decision === "improve" ? "write" : decision === "keep" ? "keep" : "target"
          paintMatrixRoleBadge(target, roleDescriptor(roleLegend, role))
        }
        td.setAttribute("aria-label", semantics.cellLabel(frame, r, c))
      }
    }
    status.innerHTML =
      escapeHtml(frame.message) + ` <span class="steptrace__counts">· step ${i + 1}/${total}</span>`
  }

  function watch(frame) {
    return semantics.watchRows(frame)
  }

  return {
    nodes,
    stageLayout: semantics.stageLayout || "compact",
    paint,
    watch,
  }
}

// ---- union-find view: a row of elements with parent-pointer arcs above ----
export function makeUnionFindView(frames) {
  const n = frames[0].n
  const SP = 56
  const UR = 16
  const MX = 26
  const BASE = 150
  const TOP = 26
  const width = MX * 2 + Math.max(0, n - 1) * SP + UR * 2
  const height = 180
  const cx = (i) => MX + UR + i * SP
  const PALETTE = [
    "var(--_blue)",
    "var(--_violet)",
    "var(--_amber)",
    "var(--_green)",
    "var(--_muted)",
  ]

  const svg = document.createElementNS(SVGNS, "svg")
  svg.setAttribute("class", "steptrace__svg steptrace__uf")
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`)
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", "Union-Find forest")
  const arcLayer = document.createElementNS(SVGNS, "g")
  svg.append(arcLayer)

  const nodeEls = []
  for (let i = 0; i < n; i++) {
    const g = document.createElementNS(SVGNS, "g")
    g.setAttribute("class", "steptrace__ufnode")
    const back = document.createElementNS(SVGNS, "circle")
    back.setAttribute("class", "steptrace__nback")
    back.setAttribute("cx", String(cx(i)))
    back.setAttribute("cy", String(BASE))
    back.setAttribute("r", String(UR))
    const circle = document.createElementNS(SVGNS, "circle")
    circle.setAttribute("class", "steptrace__ncirc")
    circle.setAttribute("cx", String(cx(i)))
    circle.setAttribute("cy", String(BASE))
    circle.setAttribute("r", String(UR))
    const id = document.createElementNS(SVGNS, "text")
    id.setAttribute("class", "steptrace__id")
    id.setAttribute("x", String(cx(i)))
    id.setAttribute("y", String(BASE))
    id.setAttribute("text-anchor", "middle")
    id.setAttribute("dominant-baseline", "central")
    id.textContent = String(i)
    g.append(back, circle, id)
    svg.append(g)
    nodeEls.push({ g, circle })
  }

  const wrap = el("div", "steptrace__graph")
  wrap.append(svg)
  const status = statusEl()

  function paint(frame, i, total) {
    const uniqueRoots = [...new Set(frame.roots as PropertyKey[])]
    const rootColor: Record<PropertyKey, string> = {}
    uniqueRoots.forEach((r, idx) => (rootColor[r] = PALETTE[idx % PALETTE.length]))
    const hl = new Set(frame.highlight)
    const ae = frame.activeEdge
    for (let k = 0; k < n; k++) {
      const ne = nodeEls[k]
      const col = rootColor[frame.roots[k]]
      ne.circle.style.stroke = col
      ne.circle.style.fill = `color-mix(in srgb, ${col} 22%, transparent)`
      ne.g.dataset.root = frame.parent[k] === k ? "true" : "false"
      ne.g.dataset.hl = hl.has(k) ? "true" : "false"
    }
    arcLayer.replaceChildren()
    for (let k = 0; k < n; k++) {
      const p = frame.parent[k]
      if (p === k) continue
      const x1 = cx(k)
      const x2 = cx(p)
      const midX = (x1 + x2) / 2
      const arc = document.createElementNS(SVGNS, "path")
      arc.setAttribute("class", "steptrace__ufarc")
      arc.setAttribute("d", `M ${x1} ${BASE - UR} Q ${midX} ${TOP} ${x2} ${BASE - UR}`)
      arc.setAttribute("fill", "none")
      const active = (ae && ae[0] === k && ae[1] === p) || (hl.has(k) && hl.has(p))
      arc.dataset.active = active ? "true" : "false"
      arcLayer.append(arc)
    }
    status.innerHTML =
      escapeHtml(frame.message) + ` <span class="steptrace__counts">· step ${i + 1}/${total}</span>`
  }

  function watch(frame) {
    const sets = new Set(frame.roots).size
    const ae = frame.activeEdge
    return [
      { k: "sets", v: String(sets), sw: "var(--_blue)" },
      { k: "edge", v: ae ? `${ae[0]} — ${ae[1]}` : "—", sw: "var(--_violet)" },
    ]
  }

  return { nodes: [wrap, status], paint, watch }
}

// ---- bits view: a tally of the original 1s + three lanes read as an equation ----
// The tally has one square per set bit of the ORIGINAL value (count known from
// frame 0 ⇒ fixed width, zero jitter); squares fill as bits clear. The three
// strips align for free (flex:1 × width in an identical gutter — no measurement).
// Everything is built ONCE; paint() only rewrites textContent + data-* and the
// constant data-live flag (dimmed placeholders never vanish).
export function makeBitsView(frames) {
  const width = frames[0].width
  const total = frames[0].total
  const stage = el("div", "steptrace__bits")

  // tally: the whole story at a glance — "how many 1s are left to delete".
  const tally = el("div", "steptrace__btally")
  const tallyLead = el("div", "steptrace__btally-lead")
  tallyLead.textContent = "1s cleared"
  const tallyBoxes = el("div", "steptrace__btally-boxes")
  const boxes = []
  for (let k = 0; k < total; k++) {
    const b = el("div", "steptrace__btally-box")
    tallyBoxes.append(b)
    boxes.push(b)
  }
  const tallyCount = el("div", "steptrace__btally-count")
  tally.append(tallyLead, tallyBoxes, tallyCount)
  stage.append(tally)

  // index header: a light ruler — nibble boundaries only (bit 0, 4, 8 …).
  const idxRow = el("div", "steptrace__brow steptrace__brow--idx")
  const idxGutter = el("div", "steptrace__bgutter")
  idxGutter.textContent = "bit"
  const idxStrip = el("div", "steptrace__bcells steptrace__bcells--idx")
  for (let j = 0; j < width; j++) {
    const bi = width - 1 - j
    const c = el("div", "steptrace__bidx")
    c.textContent = bi % 4 === 0 ? String(bi) : ""
    idxStrip.append(c)
  }
  idxRow.append(idxGutter, idxStrip)
  stage.append(idxRow)

  // gutter operators (constant): x, then "− 1" and "&" so the stack reads as
  // arithmetic top-to-bottom. Painted once — labels never change.
  const OP = { a: false, b: true, r: true }
  const lanes = {}
  for (const key of ["a", "b", "r"]) {
    const row = el("div", "steptrace__brow")
    const gutter = el("div", "steptrace__bgutter")
    const label = frames[0].labels[key]
    if (OP[key]) {
      const op = el("span", "steptrace__bop")
      op.textContent = label
      gutter.append(op)
    } else {
      gutter.textContent = label
    }
    const strip = el("div", "steptrace__bcells")
    const cells = []
    for (let j = 0; j < width; j++) {
      const c = el("div", "steptrace__bcell")
      strip.append(c)
      cells.push(c)
    }
    row.append(gutter, strip)
    stage.append(row)
    lanes[key] = { row, cells }
  }
  const status = statusEl()

  function paint(frame, i, stepTotal) {
    for (let k = 0; k < boxes.length; k++) {
      boxes[k].dataset.filled = k < frame.pop ? "1" : "0"
      boxes[k].dataset.just = k === frame.just ? "1" : "0"
    }
    tallyCount.textContent = `${frame.pop} / ${frame.total}`
    for (const key of ["a", "b", "r"]) {
      const lane = lanes[key]
      const data = frame[key]
      lane.row.dataset.live = data.live ? "1" : "0"
      for (let j = 0; j < width; j++) {
        const bi = width - 1 - j
        const c = lane.cells[j]
        c.textContent = String(data.bits[bi])
        c.dataset.bit = String(data.bits[bi])
        c.dataset.state = data.state[bi] || ""
      }
    }
    status.innerHTML =
      escapeHtml(frame.message) +
      ` <span class="steptrace__counts">· step ${i + 1}/${stepTotal}</span>`
  }

  // exactly 3 rows every frame ⇒ constant footer height (no jitter)
  function watch(frame) {
    return [
      {
        k: "x",
        v: `${frame.value} = 0b${frame.value.toString(2).padStart(frame.width, "0")}`,
        sw: "var(--_accent)",
      },
      { k: "lowest 1", v: frame.low >= 0 ? `bit ${frame.low}` : "—", sw: "var(--_amber)" },
      { k: "1s cleared", v: `${frame.pop} / ${frame.total}`, sw: "var(--_violet)" },
    ]
  }

  return { nodes: [stage, status], paint, watch }
}

let backtrackTreeSerial = 0

// ---- backtrack view: an n×n board + a persistent decision tree ----
// Queen columns are the root-to-node path. `attacked` is DERIVED here from
// `queens` (frames stay small). The tree is built once from those same frames:
// committed choices become decision nodes, repeated rejects collapse into one
// prune leaf per parent, and paint() only changes state attributes and labels.
export function makeBacktrackView(frames) {
  const n = frames[0].n
  const wrap = el("div", "steptrace__bt")
  wrap.setAttribute("role", "region")
  wrap.setAttribute("aria-label", "N-Queens search board and decision tree")
  const layout = el("div", "steptrace__bt-layout")
  const boardColumn = el("div", "steptrace__bt-board-column")
  const board = el("div", "steptrace__btboard")
  board.setAttribute("role", "grid")
  board.setAttribute("aria-label", `${n} by ${n} chess board`)
  board.style.setProperty("--_n", String(n))
  const cells = []
  for (let r = 0; r < n; r++) {
    const rowCells = []
    for (let c = 0; c < n; c++) {
      const cell = el("div", "steptrace__btcell")
      cell.dataset.parity = String((r + c) % 2)
      cell.setAttribute("role", "gridcell")
      const glyph = el("div", "steptrace__btqueen")
      glyph.innerHTML = ICON.chessQueen
      glyph.setAttribute("aria-hidden", "true")
      cell.append(glyph)
      board.append(cell)
      rowCells.push(cell)
    }
    cells.push(rowCells)
  }
  const strip = el("div", "steptrace__btpath")
  const slots = []
  for (let r = 0; r < n; r++) {
    const slot = el("div", "steptrace__btslot")
    slot.textContent = "—" // —
    strip.append(slot)
    slots.push(slot)
  }
  boardColumn.append(board, strip)

  const columnsFromQueens = (queens) => {
    const columns = []
    for (const column of queens) {
      if (column == null) break
      columns.push(column)
    }
    return columns
  }
  const decisionId = (columns) => (columns.length ? `d:${columns.join(".")}` : "root")
  const pathIds = (columns) => [
    "root",
    ...columns.map((_, index) => decisionId(columns.slice(0, index + 1))),
  ]

  const treeNodes = []
  const treeNodeById = new Map()
  const addTreeNode = (node) => {
    if (treeNodeById.has(node.id)) return treeNodeById.get(node.id)
    const stored = { ...node, children: [] }
    treeNodes.push(stored)
    treeNodeById.set(stored.id, stored)
    if (stored.parent) treeNodeById.get(stored.parent)?.children.push(stored.id)
    return stored
  }
  addTreeNode({
    id: "root",
    parent: null,
    kind: "root",
    depth: 0,
    firstFrame: 0,
    column: null,
    attempts: [],
  })

  let solutionNode = null
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex]
    const columns = columnsFromQueens(frame.queens)
    if (frame.type === "place" && frame.cursor) {
      const id = decisionId(columns)
      addTreeNode({
        id,
        parent: decisionId(columns.slice(0, -1)),
        kind: "decision",
        depth: frame.cursor.row + 1,
        firstFrame: frameIndex,
        row: frame.cursor.row,
        column: frame.cursor.col,
        attempts: [],
      })
    } else if (frame.type === "reject" && frame.cursor) {
      const parent = decisionId(columns)
      const id = `p:${parent}`
      const pruneNode = addTreeNode({
        id,
        parent,
        kind: "prune",
        depth: columns.length + 1,
        firstFrame: frameIndex,
        column: null,
        attempts: [],
      })
      pruneNode.attempts.push({
        frameIndex,
        row: frame.cursor.row,
        column: frame.cursor.col,
        conflict: frame.conflict,
      })
    } else if (frame.type === "solved") {
      const parent = decisionId(columns)
      solutionNode = addTreeNode({
        id: "solution",
        parent,
        kind: "solution",
        depth: columns.length + 1,
        firstFrame: frameIndex,
        column: null,
        attempts: [],
      })
    }
  }

  const treeEdges = treeNodes
    .filter((node) => node.parent)
    .map((node) => ({ from: node.parent, to: node.id, kind: node.kind }))
  const leafSlots = new Map()
  let leafCount = 0
  function assignLeafSlots(nodeId) {
    const node = treeNodeById.get(nodeId)
    if (!node.children.length) {
      const slot = leafCount++
      leafSlots.set(nodeId, slot)
      return slot
    }
    const childSlots = node.children.map(assignLeafSlots)
    const slot = (childSlots[0] + childSlots[childSlots.length - 1]) / 2
    leafSlots.set(nodeId, slot)
    return slot
  }
  assignLeafSlots("root")
  const maxTreeDepth = Math.max(...treeNodes.map((node) => node.depth))

  function makeTreeLayout() {
    const leafGap = 36
    const depthGap = 42
    const leafPad = 90
    const leafEndPad = 10
    const depthPad = 20
    const positions = Object.fromEntries(
      treeNodes.map((node) => {
        const leaf = leafSlots.get(node.id)
        return [node.id, { x: leafPad + leaf * leafGap, y: depthPad + node.depth * depthGap }]
      }),
    )
    return {
      positions,
      width: leafPad + leafEndPad + Math.max(0, leafCount - 1) * leafGap,
      height: depthPad * 2 + maxTreeDepth * depthGap,
      leafGap,
      depthGap,
      leafPad,
      depthPad,
    }
  }
  const treeLayout = makeTreeLayout()

  const tree = el("aside", "steptrace__bt-tree")
  tree.setAttribute("role", "region")
  tree.setAttribute("aria-label", "N-Queens decision tree")
  tree.dataset.orientation = "portrait"
  const treeHead = el("div", "steptrace__bt-tree-head")
  const treeLabel = el("span", "steptrace__rail-label steptrace__bt-tree-label")
  treeLabel.textContent = "DECISION TREE"
  const treeDepth = el("span", "steptrace__bt-tree-depth")
  treeHead.append(treeLabel, treeDepth)
  const treeCaption = el("div", "steptrace__bt-tree-caption")
  treeCaption.setAttribute("aria-live", "polite")
  treeCaption.setAttribute("aria-atomic", "true")
  const treeCanvas = el("div", "steptrace__bt-tree-canvas")
  const svgNode = (tag) =>
    typeof document.createElementNS === "function"
      ? document.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElement(tag)
  const treeSvg = svgNode("svg")
  const treeTitle = svgNode("title")
  const treeDescription = svgNode("desc")
  const treeId = `steptrace-backtrack-tree-${++backtrackTreeSerial}`
  const returnMarkerId = `${treeId}-return`
  treeTitle.id = `${treeId}-title`
  treeDescription.id = `${treeId}-description`
  treeSvg.setAttribute("class", "steptrace__bt-tree-svg")
  treeSvg.setAttribute("role", "img")
  treeSvg.setAttribute("aria-labelledby", `${treeTitle.id} ${treeDescription.id}`)
  treeSvg.setAttribute("preserveAspectRatio", "xMidYMid meet")

  const treeDefs = svgNode("defs")
  const returnMarker = svgNode("marker")
  returnMarker.setAttribute("id", returnMarkerId)
  returnMarker.setAttribute("viewBox", "0 0 8 8")
  returnMarker.setAttribute("refX", "4")
  returnMarker.setAttribute("refY", "4")
  returnMarker.setAttribute("markerWidth", "5")
  returnMarker.setAttribute("markerHeight", "5")
  returnMarker.setAttribute("orient", "auto-start-reverse")
  const returnArrow = svgNode("path")
  returnArrow.setAttribute("class", "steptrace__bt-tree-return-arrow")
  returnArrow.setAttribute("d", "M0 0 8 4 0 8z")
  returnMarker.append(returnArrow)
  treeDefs.append(returnMarker)

  const depthLayer = svgNode("g")
  depthLayer.setAttribute("class", "steptrace__bt-tree-depths")
  const depthLabels = []
  for (let depth = 0; depth <= maxTreeDepth; depth++) {
    const depthGroup = svgNode("g")
    depthGroup.setAttribute("class", "steptrace__bt-tree-depth")
    depthGroup.setAttribute("aria-hidden", "true")
    depthGroup.setAttribute("focusable", "false")
    const depthLabel = svgNode("text")
    const depthLine = svgNode("line")
    depthLabel.setAttribute("class", "steptrace__bt-tree-depth-label")
    depthLabel.setAttribute("text-anchor", "start")
    depthLabel.setAttribute("dominant-baseline", "central")
    depthLabel.textContent = depth === 0 ? "root" : depth <= n ? `R${depth - 1}` : "Result"
    depthLine.setAttribute("class", "steptrace__bt-tree-depth-line")
    depthLine.setAttribute("aria-hidden", "true")
    depthLine.setAttribute("focusable", "false")
    depthGroup.append(depthLabel)
    depthLayer.append(depthLine)
    depthLayer.append(depthGroup)
    depthLabels.push({ group: depthGroup, label: depthLabel, line: depthLine })
  }

  const edgeLayer = svgNode("g")
  edgeLayer.setAttribute("class", "steptrace__bt-tree-edges")
  const edgeElements = treeEdges.map((edge) => {
    const line = svgNode("line")
    line.setAttribute("class", "steptrace__rtedge steptrace__bt-tree-edge")
    line.setAttribute("aria-hidden", "true")
    line.setAttribute("focusable", "false")
    line.dataset.kind = edge.kind
    line.dataset.from = edge.from
    line.dataset.to = edge.to
    edgeLayer.append(line)
    return { ...edge, element: line }
  })

  const nodeLayer = svgNode("g")
  nodeLayer.setAttribute("class", "steptrace__bt-tree-nodes")
  const nodeElements = new Map()
  for (const node of treeNodes) {
    const group = svgNode("g")
    const ring = svgNode("circle")
    const surface = svgNode("circle")
    const label = svgNode("text")
    group.setAttribute("class", "steptrace__node steptrace__rtnode steptrace__bt-tree-node")
    group.setAttribute("aria-hidden", "true")
    group.setAttribute("focusable", "false")
    group.dataset.kind = node.kind
    group.dataset.node = node.id
    ring.setAttribute("class", "steptrace__rtring")
    ring.setAttribute("r", String(GRAPH_NODE_RADIUS_PX + GRAPH_NODE_HALO_GAP_PX))
    surface.setAttribute("class", "steptrace__ncirc steptrace__rtcirc")
    surface.setAttribute("r", String(GRAPH_NODE_RADIUS_PX))
    label.setAttribute("class", "steptrace__id steptrace__rtlabel steptrace__bt-tree-node-label")
    label.setAttribute("text-anchor", "middle")
    label.setAttribute("dominant-baseline", "central")
    group.append(ring, surface, label)
    nodeLayer.append(group)
    nodeElements.set(node.id, { group, label })
  }
  treeSvg.append(treeDefs, treeTitle, treeDescription, depthLayer, edgeLayer, nodeLayer)
  treeCanvas.append(treeSvg)

  const treeLegend = makeLegend(
    [
      { label: "branch", state: "split", swatchClass: "steptrace__swatch steptrace__rtswatch" },
      { label: "prune", state: "prune", swatchClass: "steptrace__swatch steptrace__rtswatch" },
      { label: "return", state: "return", swatchClass: "steptrace__swatch steptrace__rtswatch" },
      { label: "solution", state: "combine", swatchClass: "steptrace__swatch steptrace__rtswatch" },
    ],
    "Decision tree state legend",
    "steptrace__bt-tree-legend",
  )
  tree.append(treeHead, treeCaption, treeCanvas, treeLegend)

  const geometryPoints = new Map(
    treeNodes.map((node) => [node.id, { ...treeLayout.positions[node.id] }]),
  )
  const depthGeometryPoints = depthLabels.map((_, depth) => ({
    x: 3,
    y: treeLayout.depthPad + depth * treeLayout.depthGap,
  }))
  let treeGeometry = null

  function applyTreeLayout() {
    treeSvg.setAttribute("viewBox", `0 0 ${treeLayout.width} ${treeLayout.height}`)
    treeGeometry?.update()
  }
  applyTreeLayout()
  treeGeometry = observeFixedSvgNodes(
    treeSvg,
    [
      ...treeNodes.map((node) => ({
        element: nodeElements.get(node.id).group,
        point: geometryPoints.get(node.id),
      })),
      ...depthLabels.map(({ group }, depth) => ({
        element: group,
        point: depthGeometryPoints[depth],
      })),
    ],
    (unitsPerCssPixel) => {
      const inset = GRAPH_NODE_RADIUS_PX * unitsPerCssPixel
      const renderedTreeWidth = treeLayout.width / unitsPerCssPixel
      const canvasWidth = Number(treeCanvas.clientWidth) || 0
      const sideGutter = Math.max(0, (canvasWidth - renderedTreeWidth) / 2)
      const guideShift = Math.max(0, sideGutter - 8)
      for (const edge of edgeElements) {
        const points = trimGraphEdge(
          geometryPoints.get(edge.from),
          geometryPoints.get(edge.to),
          inset,
        )
        for (const [attribute, value] of Object.entries(points))
          edge.element.setAttribute(attribute, String(value))
      }
      for (let depth = 0; depth < depthLabels.length; depth++) {
        const { group, line } = depthLabels[depth]
        const y = treeLayout.depthPad + depth * treeLayout.depthGap
        const labelX = (3 - guideShift) * unitsPerCssPixel
        Object.assign(depthGeometryPoints[depth], { x: labelX, y })
        group.setAttribute("transform", `translate(${labelX} ${y}) scale(${unitsPerCssPixel})`)
        const firstNodeX = Math.min(
          ...treeNodes
            .filter((node) => node.depth === depth)
            .map((node) => treeLayout.positions[node.id].x),
        )
        line.setAttribute("x1", String((42 - guideShift) * unitsPerCssPixel))
        line.setAttribute("y1", String(y))
        line.setAttribute("x2", String(firstNodeX - (GRAPH_NODE_RADIUS_PX + 2) * unitsPerCssPixel))
        line.setAttribute("y2", String(y))
      }
    },
  )

  layout.append(boardColumn, tree)
  wrap.append(layout)
  const status = statusEl()

  // squares attacked by already-committed queens (column / row / diagonal)
  function attackedSet(queens) {
    const hit = new Set()
    for (let qr = 0; qr < n; qr++) {
      const qc = queens[qr]
      if (qc == null) continue
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (queens[r] === c) continue
          if (c === qc || r === qr || Math.abs(qr - r) === Math.abs(qc - c)) hit.add(r + "," + c)
        }
      }
    }
    return hit
  }

  function paint(frame, frameIndex) {
    const q = frame.queens
    const cur = frame.cursor
    const conf = frame.conflict
    const attacked = attackedSet(q)
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = cells[r][c]
        const hasQueen = q[r] === c
        const isCursor = cur && cur.row === r && cur.col === c
        let state = ""
        if (frame.solved && hasQueen) state = "solved"
        else if (isCursor && frame.type === "reject") state = "reject"
        else if (isCursor && frame.type === "backtrack") state = "remove"
        else if (isCursor && frame.type === "place") state = "try"
        else if (hasQueen) state = "queen"
        else if (attacked.has(r + "," + c)) state = "attacked"
        cell.dataset.state = state
        cell.dataset.hasQueen = hasQueen ? "1" : "0"
        cell.dataset.conflict = conf && conf.row === r && conf.col === c ? "1" : "0"
        cell.setAttribute(
          "aria-label",
          `Row ${r}, column ${c}, ${
            hasQueen
              ? "queen"
              : isCursor
                ? frame.type === "reject"
                  ? "rejected"
                  : frame.type === "backtrack"
                    ? "queen removed"
                    : "candidate"
                : attacked.has(r + "," + c)
                  ? "attacked"
                  : "safe"
          }`,
        )
      }
    }
    for (let r = 0; r < n; r++) {
      const slot = slots[r]
      const col = q[r]
      slot.textContent = col == null ? "—" : String(col)
      let sstate = col == null ? "" : "on"
      if (cur && cur.row === r) {
        if (frame.type === "reject") sstate = "reject"
        else if (frame.type === "backtrack") sstate = "remove"
        else if (frame.type === "place") sstate = "try"
      }
      slot.dataset.state = sstate
    }
    const columns = columnsFromQueens(frame.queens)
    const activePath = new Set(pathIds(columns))
    const finalPath = new Set(
      solutionNode ? [...pathIds(columnsFromQueens(frames.at(-1).queens)), solutionNode.id] : [],
    )
    let activeNode = decisionId(columns)
    let returnSource = null
    let event = "start"
    let caption = "Start at root"
    if (frame.type === "place" && cur) {
      activeNode = decisionId(columns)
      event = "branch"
      caption = `Branch R${cur.row} C${cur.col} · descend to R${cur.row + 1}`
    } else if (frame.type === "reject" && cur) {
      activeNode = `p:${decisionId(columns)}`
      activePath.add(activeNode)
      event = "prune"
      caption = frame.conflict
        ? `Prune R${cur.row} C${cur.col} · blocked by R${frame.conflict.row} C${frame.conflict.col}`
        : `Prune R${cur.row} C${cur.col}`
    } else if (frame.type === "backtrack" && cur) {
      const returningColumns = [...columns, cur.col]
      returnSource = decisionId(returningColumns)
      activeNode = decisionId(columns)
      event = "return"
      caption = columns.length
        ? `Return R${cur.row} C${cur.col} → R${columns.length - 1} C${columns.at(-1)}`
        : `Return R${cur.row} C${cur.col} → root`
    } else if (frame.solved && solutionNode) {
      activeNode = solutionNode.id
      event = "solution"
      caption = `Solution [${frame.queens.join(", ")}]`
    }
    const solutionPath = event === "solution" ? finalPath : new Set()
    tree.dataset.event = event
    treeDepth.textContent = `depth ${frame.depth} / ${frame.n}`
    treeCaption.textContent = caption
    treeTitle.textContent = `N-Queens decision tree: ${caption}`
    treeDescription.textContent = `${caption}. ${frame.message}`

    for (const node of treeNodes) {
      const elements = nodeElements.get(node.id)
      const visible = node.firstFrame <= frameIndex
      const onPath = activePath.has(node.id)
      const onSolution = solutionPath.has(node.id)
      const returning = node.id === returnSource
      elements.group.dataset.vis = visible ? "1" : "0"
      elements.group.dataset.active = node.id === activeNode ? "true" : "false"
      elements.group.dataset.path = onPath ? "true" : "false"
      elements.group.dataset.solution = onSolution ? "true" : "false"
      elements.group.dataset.returnSource = returning ? "true" : "false"
      elements.group.dataset.collapsed =
        visible && !onPath && !onSolution && !returning && node.id !== activeNode ? "true" : "false"
      elements.group.dataset.state =
        node.kind === "prune"
          ? "prune"
          : returning
            ? "return"
            : node.kind === "solution"
              ? "combine"
              : node.kind === "decision"
                ? "split"
                : "compute"
      if (!visible) elements.label.textContent = ""
      else if (node.kind === "root") elements.label.textContent = "R"
      else if (node.kind === "decision") elements.label.textContent = String(node.column)
      else if (node.kind === "solution") elements.label.textContent = "S"
      else {
        const seenAttempts = node.attempts.filter(
          (attempt) => attempt.frameIndex <= frameIndex,
        ).length
        elements.label.textContent = `×${seenAttempts}`
      }
    }

    for (const edge of edgeElements) {
      const child = treeNodeById.get(edge.to)
      const visible = child.firstFrame <= frameIndex
      const onPath = activePath.has(edge.from) && activePath.has(edge.to)
      const onSolution = solutionPath.has(edge.from) && solutionPath.has(edge.to)
      const returning = edge.to === returnSource
      edge.element.dataset.vis = visible ? "1" : "0"
      edge.element.dataset.path = onPath ? "true" : "false"
      edge.element.dataset.solution = onSolution ? "true" : "false"
      edge.element.dataset.return = returning ? "true" : "false"
      edge.element.dataset.collapsed =
        visible && !onPath && !onSolution && !returning ? "true" : "false"
      edge.element.setAttribute("marker-start", returning ? `url(#${returnMarkerId})` : "none")
    }
    status.innerHTML = escapeHtml(frame.message)
  }

  // exactly 3 rows every frame ⇒ constant footer height (depth up-then-down = a backtrack)
  function watch(frame) {
    const cur = frame.cursor
    return [
      { k: "depth", v: `${frame.depth} / ${frame.n}`, sw: "var(--_blue)" },
      { k: "trying", v: cur ? `(${cur.row}, ${cur.col})` : "—", sw: "var(--_amber)" },
      { k: "pruned", v: String(frame.pruned), sw: "var(--_muted)" },
    ]
  }

  return {
    nodes: [wrap, status],
    paint,
    watch,
    destroy: () => {
      treeGeometry.destroy()
    },
  }
}

let executionTreeViewSerial = 0

export interface ExecutionTreeViewDescriptor {
  ariaLabel: string
  shape: "circle" | "card"
  nodeWidth: number
  nodeHeight: number
  minSvgWidth: number
  canvasScale?: number
  fitWidth?: boolean
  responsiveLayout?: boolean
  tieredLayout?: boolean
  tieredCards?: boolean
  centerVisible?: boolean
  stableStage?: boolean
  preserveDetail?: boolean
  showStateBadge?: boolean
  stateLabels: Record<string, string>
  legend: ReadonlyArray<{ state: string; label: string }>
  frameModel(frame: any): {
    phase: string
    action: string
    active: string | null
    path: string[]
    visible: string[]
    states: Record<string, string>
    results: Record<string, unknown>
    collapsed: string[]
  }
  nodeLines(node: any): [string, string]
  watchRows(frame: any, model: ReturnType<ExecutionTreeViewDescriptor["frameModel"]>): any[]
}

export function centerVisibleTree(rects, canvasWidth, canvasHeight) {
  if (!rects.length) return { x: 0, y: 0 }
  const left = Math.min(...rects.map((rect) => rect.left))
  const right = Math.max(...rects.map((rect) => rect.right))
  const top = Math.min(...rects.map((rect) => rect.top))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))
  return {
    x: canvasWidth / 2 - (left + right) / 2,
    y: canvasHeight / 2 - (top + bottom) / 2,
  }
}

export function tieredArrayCells(values, width) {
  const cellWidth = width / Math.max(1, values.length)
  return {
    cells: values.map((value, index) => ({
      value,
      x: -width / 2 + cellWidth * (index + 0.5),
    })),
    separators: values.slice(1).map((_, index) => -width / 2 + cellWidth * (index + 1)),
  }
}

export function makeExecutionTreeView(frames, descriptor: ExecutionTreeViewDescriptor) {
  const f0 = frames[0]
  const nodes = f0.nodes
  const halfHeight = descriptor.nodeHeight / 2
  const padY = halfHeight + 12
  const naturalNodeWidth = (node) => node.width || descriptor.nodeWidth
  const lefts = nodes.map((node) => node.x - naturalNodeWidth(node) / 2)
  const rights = nodes.map((node) => node.x + naturalNodeWidth(node) / 2)
  const ys = nodes.map((node) => node.y)
  const minX = Math.min(...lefts)
  const minY = Math.min(...ys)
  const naturalWidth = Math.max(...rights) - minX + 24
  const naturalHeight = Math.max(...ys) - minY + padY * 2
  const naturalPosition = Object.fromEntries(
    nodes.map((node) => [node.id, { x: node.x - minX + 12, y: node.y - minY + padY }]),
  )
  const naturalWidths = Object.fromEntries(nodes.map((node) => [node.id, naturalNodeWidth(node)]))
  const naturalLayout = {
    width: naturalWidth,
    height: naturalHeight,
    position: naturalPosition,
    widths: naturalWidths,
  }

  const visibleNodeIds = new Set(frames.flatMap((frame) => frame.visible))
  const layoutNodes = nodes.filter((node) => visibleNodeIds.has(node.id))
  const tiers = new Map<number, any[]>()
  for (const node of layoutNodes) {
    const tier = tiers.get(node.depth) || []
    tier.push(node)
    tiers.set(node.depth, tier)
  }
  for (const tier of tiers.values()) tier.sort((left, right) => left.x - right.x)
  const maxTierSize = Math.max(...[...tiers.values()].map((tier) => tier.length))
  const maxDepth = Math.max(...nodes.map((node) => node.depth))

  function tierLayout(width, maxNodeWidth, gap) {
    const widths = {
      ...naturalWidths,
      ...Object.fromEntries(
        layoutNodes.map((node) => [node.id, Math.min(naturalNodeWidth(node), maxNodeWidth)]),
      ),
    }
    const position = { ...naturalPosition }
    const levelGap = descriptor.nodeHeight + 22
    for (const [depth, tier] of tiers) {
      const tierWidth =
        tier.reduce((total, node) => total + widths[node.id], 0) + gap * (tier.length - 1)
      let x = (width - tierWidth) / 2
      for (const node of tier) {
        position[node.id] = {
          x: x + widths[node.id] / 2,
          y: padY + depth * levelGap,
        }
        x += widths[node.id] + gap
      }
    }
    return {
      width,
      height: padY * 2 + maxDepth * levelGap,
      position,
      widths,
    }
  }

  const desktopGap = 12
  const desktopTierWidth =
    Math.max(
      ...[...tiers.values()].map(
        (tier) =>
          tier.reduce(
            (total, node) => total + Math.min(naturalNodeWidth(node), descriptor.nodeWidth),
            0,
          ) +
          desktopGap * (tier.length - 1),
      ),
    ) + 24
  const desktopLayout = descriptor.tieredLayout
    ? tierLayout(
        Math.max(descriptor.minSvgWidth, desktopTierWidth),
        descriptor.nodeWidth,
        desktopGap,
      )
    : naturalLayout
  let layout = desktopLayout
  const nodeWidth = (node) => layout.widths[node.id] || naturalNodeWidth(node)

  const svg = document.createElementNS(SVGNS, "svg")
  const title = document.createElementNS(SVGNS, "title")
  const description = document.createElementNS(SVGNS, "desc")
  const accessibleId = `steptrace-execution-tree-${++executionTreeViewSerial}`
  title.id = `${accessibleId}-title`
  description.id = `${accessibleId}-description`
  svg.setAttribute("class", "steptrace__rtsvg")
  svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`)
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-labelledby", `${title.id} ${description.id}`)
  const canvasWidth = Math.max(descriptor.minSvgWidth, layout.width * (descriptor.canvasScale || 1))
  svg.style.setProperty("--steptrace-tree-width", `${canvasWidth}px`)
  svg.append(title, description)

  const treeLayer = descriptor.centerVisible ? document.createElementNS(SVGNS, "g") : svg
  if (descriptor.centerVisible) {
    treeLayer.setAttribute("class", "steptrace__rtcontent")
    svg.append(treeLayer)
  }

  const edgeElements = []
  for (const edge of f0.edges) {
    const from = layout.position[edge.from]
    const to = layout.position[edge.to]
    const line = document.createElementNS(SVGNS, "line")
    line.setAttribute("class", "steptrace__rtedge")
    line.setAttribute("x1", String(from.x))
    line.setAttribute("y1", String(from.y + halfHeight))
    line.setAttribute("x2", String(to.x))
    line.setAttribute("y2", String(to.y - halfHeight))
    line.setAttribute("aria-hidden", "true")
    line.setAttribute("focusable", "false")
    treeLayer.append(line)
    edgeElements.push({ element: line, from: edge.from, to: edge.to })
  }

  const nodeElements = {}
  for (const node of nodes) {
    const point = layout.position[node.id]
    const width = nodeWidth(node)
    const halfWidth = width / 2
    const group = document.createElementNS(SVGNS, "g")
    group.setAttribute("class", "steptrace__rtnode")
    group.setAttribute("transform", `translate(${point.x} ${point.y})`)
    group.setAttribute("aria-hidden", "true")
    group.setAttribute("focusable", "false")
    group.dataset.shape = descriptor.shape

    const ring = document.createElementNS(SVGNS, descriptor.shape === "circle" ? "circle" : "rect")
    ring.setAttribute("class", "steptrace__rtring")
    const surface = document.createElementNS(
      SVGNS,
      descriptor.shape === "circle" ? "circle" : "rect",
    )
    surface.setAttribute("class", "steptrace__rtcirc")
    if (descriptor.shape === "circle") {
      ring.setAttribute("r", String(halfWidth + 3))
      surface.setAttribute("r", String(halfWidth))
    } else {
      surface.setAttribute("x", String(-halfWidth))
      surface.setAttribute("y", String(-halfHeight))
      surface.setAttribute("width", String(width))
      surface.setAttribute("height", String(descriptor.nodeHeight))
      surface.setAttribute("rx", "7")
      ring.setAttribute("x", String(-halfWidth - 2))
      ring.setAttribute("y", String(-halfHeight - 2))
      ring.setAttribute("width", String(width + 4))
      ring.setAttribute("height", String(descriptor.nodeHeight + 4))
      ring.setAttribute("rx", "9")
    }

    const label = document.createElementNS(SVGNS, "text")
    const detail = document.createElementNS(SVGNS, "text")
    const result = document.createElementNS(SVGNS, "text")
    const badge = document.createElementNS(SVGNS, "text")
    const divider = descriptor.tieredCards ? document.createElementNS(SVGNS, "line") : null
    const valueTier = descriptor.tieredCards ? document.createElementNS(SVGNS, "g") : null
    const valueCells = []
    label.setAttribute("class", "steptrace__rtlabel")
    detail.setAttribute("class", "steptrace__rtdetail")
    result.setAttribute("class", "steptrace__rtval")
    badge.setAttribute("class", "steptrace__rtbadge")
    for (const element of [label, detail, result]) element.setAttribute("text-anchor", "middle")
    const [primaryLine, secondaryLine] = descriptor.nodeLines(node)
    label.textContent = primaryLine
    detail.textContent = secondaryLine
    if (descriptor.shape === "circle") {
      label.setAttribute("y", "0")
      label.setAttribute("dominant-baseline", "central")
      result.setAttribute("y", String(halfHeight + 9))
    } else if (descriptor.tieredCards) {
      label.setAttribute("y", "13")
      label.setAttribute("dominant-baseline", "central")
      divider?.setAttribute("class", "steptrace__rtdivider")
      divider?.setAttribute("x1", String(-halfWidth + 1))
      divider?.setAttribute("x2", String(halfWidth - 1))
      divider?.setAttribute("y1", "6")
      divider?.setAttribute("y2", "6")
      valueTier?.setAttribute("class", "steptrace__rtarray")
      const tier = tieredArrayCells(node.values, width)
      for (const x of tier.separators) {
        const separator = document.createElementNS(SVGNS, "line")
        separator.setAttribute("class", "steptrace__rtcell-separator")
        separator.setAttribute("x1", String(x))
        separator.setAttribute("x2", String(x))
        separator.setAttribute("y1", String(-halfHeight + 1))
        separator.setAttribute("y2", "6")
        valueTier?.append(separator)
      }
      for (const cell of tier.cells) {
        const value = document.createElementNS(SVGNS, "text")
        value.setAttribute("class", "steptrace__rtcell-value")
        value.setAttribute("x", String(cell.x))
        value.setAttribute("y", "-7")
        value.setAttribute("text-anchor", "middle")
        value.setAttribute("dominant-baseline", "central")
        value.textContent = String(cell.value)
        valueTier?.append(value)
        valueCells.push(value)
      }
    } else {
      label.setAttribute("y", descriptor.showStateBadge ? "-10" : "-4")
      detail.setAttribute("y", descriptor.showStateBadge ? "3" : "9")
      if (descriptor.showStateBadge) {
        badge.setAttribute("y", "16")
        badge.setAttribute("text-anchor", "middle")
      }
    }
    group.append(ring, surface)
    if (divider) group.append(divider)
    if (valueTier) group.append(valueTier)
    group.append(label)
    if (!descriptor.tieredCards) group.append(detail)
    group.append(result, badge)
    treeLayer.append(group)
    nodeElements[node.id] = {
      group,
      ring,
      surface,
      detail,
      result,
      badge,
      secondaryLine,
      valueCells,
    }
  }

  function centerTransform(visibleIds) {
    const visible = new Set(visibleIds)
    const rects = nodes
      .filter((node) => visible.has(node.id))
      .map((node) => {
        const point = layout.position[node.id]
        const halfNodeWidth = nodeWidth(node) / 2
        return {
          left: point.x - halfNodeWidth,
          right: point.x + halfNodeWidth,
          top: point.y - halfHeight,
          bottom: point.y + halfHeight,
        }
      })
    const offset = centerVisibleTree(rects, layout.width, layout.height)
    return `translate(${offset.x}px, ${offset.y}px)`
  }

  if (descriptor.centerVisible) treeLayer.style.transform = centerTransform(f0.visible)

  const legend = makeLegend(
    descriptor.legend.map((item) => ({
      label: item.label,
      state: item.state,
      swatchClass: "steptrace__swatch steptrace__rtswatch",
    })),
    `${descriptor.ariaLabel} state legend`,
  )

  const wrap = el("div", "steptrace__rectree")
  wrap.setAttribute("role", "region")
  wrap.setAttribute("aria-label", `${descriptor.ariaLabel} visualization`)
  wrap.dataset.fitWidth = descriptor.fitWidth ? "true" : "false"
  wrap.dataset.profile = f0.profile || ""
  wrap.dataset.compact = "false"
  wrap.tabIndex = 0
  wrap.append(svg)

  function responsiveTreeLayout(availableWidth) {
    if (
      !descriptor.responsiveLayout ||
      !Number.isFinite(availableWidth) ||
      availableWidth <= 0 ||
      typeof matchMedia !== "function" ||
      !matchMedia("(max-width: 560px)").matches
    )
      return desktopLayout

    const width = Math.max(280, Math.floor(availableWidth))
    const gap = descriptor.showStateBadge ? 4 : 8
    const fittedWidth = Math.floor((width - 24 - gap * (maxTierSize - 1)) / maxTierSize)
    const compactWidth = Math.max(36, Math.min(descriptor.nodeWidth, fittedWidth))
    return tierLayout(width, compactWidth, gap)
  }

  let lastAvailableWidth = -1
  function applyTreeLayout() {
    const availableWidth = wrap.clientWidth
    if (Math.abs(availableWidth - lastAvailableWidth) < 0.5) return
    lastAvailableWidth = availableWidth
    const next = responsiveTreeLayout(availableWidth)
    layout = next
    wrap.dataset.compact = layout === desktopLayout ? "false" : "true"
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`)
    svg.style.setProperty("--steptrace-tree-width", `${layout.width}px`)
    for (const node of nodes) {
      const elements = nodeElements[node.id]
      const point = layout.position[node.id]
      const width = nodeWidth(node)
      const halfWidth = width / 2
      elements.group.setAttribute("transform", `translate(${point.x} ${point.y})`)
      if (descriptor.shape === "circle") {
        elements.ring.setAttribute("r", String(halfWidth + 3))
        elements.surface.setAttribute("r", String(halfWidth))
      } else {
        elements.surface.setAttribute("x", String(-halfWidth))
        elements.surface.setAttribute("width", String(width))
        elements.ring.setAttribute("x", String(-halfWidth - 2))
        elements.ring.setAttribute("width", String(width + 4))
      }
    }
    for (const edge of edgeElements) {
      const from = layout.position[edge.from]
      const to = layout.position[edge.to]
      edge.element.setAttribute("x1", String(from.x))
      edge.element.setAttribute("y1", String(from.y + halfHeight))
      edge.element.setAttribute("x2", String(to.x))
      edge.element.setAttribute("y2", String(to.y - halfHeight))
    }
    if (descriptor.centerVisible) treeLayer.style.transform = centerTransform(f0.visible)
  }

  const resizeObserver =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(applyTreeLayout)
  if (resizeObserver) resizeObserver.observe(wrap)
  const status = statusEl()

  function paint(frame, index, total) {
    applyTreeLayout()
    const model = descriptor.frameModel(frame)
    const visible = new Set(model.visible)
    const collapsed = new Set(model.collapsed)
    const path = new Set(model.path)
    const related =
      model.phase === "combine"
        ? new Set(f0.edges.filter((edge) => edge.from === model.active).map((edge) => edge.to))
        : new Set()
    const activeNode = nodes.find((node) => node.id === model.active)
    if (descriptor.centerVisible) treeLayer.style.transform = centerTransform(model.visible)
    title.textContent = `${descriptor.ariaLabel}: ${model.phase}`
    description.textContent = `${model.phase}. Active subproblem ${activeNode ? descriptor.nodeLines(activeNode).join("; ") : "none"}. ${model.action}. ${stripTags(frame.message)}`
    for (const node of nodes) {
      const elements = nodeElements[node.id]
      const state = model.states[node.id] || ""
      elements.group.dataset.vis = visible.has(node.id) ? "1" : "0"
      elements.group.dataset.collapsed = collapsed.has(node.id) ? "true" : "false"
      elements.group.dataset.state = state
      elements.group.dataset.active = model.active === node.id ? "true" : "false"
      elements.group.dataset.path = path.has(node.id) ? "true" : "false"
      elements.group.dataset.related = related.has(node.id) ? "true" : "false"
      const value = model.results[node.id]
      const resultText = Array.isArray(value)
        ? value.length
          ? `[${value.join(", ")}]`
          : ""
        : value == null
          ? ""
          : String(value)
      if (descriptor.shape === "card") {
        if (descriptor.tieredCards) {
          const values = Array.isArray(value) ? value : node.values
          for (let index = 0; index < elements.valueCells.length; index++)
            elements.valueCells[index].textContent = String(values[index] ?? "")
        } else {
          elements.detail.textContent = descriptor.preserveDetail
            ? elements.secondaryLine
            : resultText || elements.secondaryLine
        }
        elements.result.textContent = ""
        elements.badge.textContent = descriptor.showStateBadge
          ? descriptor.stateLabels[state] || ""
          : ""
      } else {
        elements.result.textContent = resultText ? `→ ${resultText}` : ""
        elements.badge.textContent = descriptor.stateLabels[state] || ""
      }
    }
    for (const edge of edgeElements) {
      edge.element.dataset.vis = visible.has(edge.to) ? "1" : "0"
      edge.element.dataset.collapsed = collapsed.has(edge.to) ? "true" : "false"
      edge.element.dataset.path = path.has(edge.from) && path.has(edge.to) ? "true" : "false"
      edge.element.dataset.related =
        model.active === edge.from && related.has(edge.to) ? "true" : "false"
    }
    status.innerHTML =
      escapeHtml(frame.message) +
      ` <span class="steptrace__counts">· step ${index + 1}/${total}</span>`
  }

  function watch(frame) {
    const model = descriptor.frameModel(frame)
    return descriptor.watchRows(frame, model)
  }

  return {
    nodes: [wrap, legend, status],
    stageLayout: "fill",
    stableStage: descriptor.stableStage,
    paint,
    watch,
    destroy: () => resizeObserver?.disconnect(),
  }
}

const legacyRecTreeDescriptor: ExecutionTreeViewDescriptor = {
  ariaLabel: "Recursion tree",
  shape: "circle",
  nodeWidth: 32,
  nodeHeight: 32,
  minSvgWidth: 320,
  stateLabels: {},
  legend: [
    { state: "compute", label: "compute" },
    { state: "miss", label: "store (miss)" },
    { state: "hit", label: "reuse (hit)" },
  ],
  frameModel(frame) {
    return {
      phase: frame.phase === "memo" ? "Memoized recursion" : "Plain recursion",
      action: frame.message,
      active: frame.active,
      path: frame.active ? [frame.active] : [],
      visible: frame.vis,
      states: frame.state,
      results: frame.vals,
      collapsed: frame.collapsed,
    }
  },
  nodeLines(node) {
    return [node.label, ""]
  },
  watchRows(frame) {
    const last = frame.memo.length ? frame.memo[frame.memo.length - 1] : null
    const event =
      frame.type === "miss" || frame.type === "hit" || frame.type === "base" ? frame.type : "—"
    return [
      { k: "calls", v: String(frame.calls), sw: "var(--_blue)" },
      { k: "memo", v: last ? `f(${last.k}) = ${last.v}` : "—", sw: "var(--_green)" },
      { k: "event", v: event, sw: "var(--_violet)" },
    ]
  },
}

export function makeRecTreeView(frames) {
  return makeExecutionTreeView(frames, legacyRecTreeDescriptor)
}

// ---- graph view: svg ----
const SVGNS = "http://www.w3.org/2000/svg"

export function makeGraphView(frames, graph, frontierLabel) {
  const pad = 34
  const xs = graph.nodes.map((n) => n.x)
  const ys = graph.nodes.map((n) => n.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const w = Math.max(...xs) - minX + pad * 2
  const h = Math.max(...ys) - minY + pad * 2
  const pos = Object.fromEntries(
    graph.nodes.map((n) => [n.id, { x: n.x - minX + pad, y: n.y - minY + pad }]),
  )

  const svg = document.createElementNS(SVGNS, "svg")
  svg.setAttribute("class", "steptrace__svg")
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`)
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", "Graph traversal")

  if (graph.directed) {
    const defs = document.createElementNS(SVGNS, "defs")
    defs.innerHTML =
      `<marker id="st-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
      `<path class="steptrace__arrow" d="M0,0 L10,5 L0,10 z"/></marker>`
    svg.append(defs)
  }

  // edges first (under nodes)
  const edgeEls = []
  for (const e of graph.edges) {
    const a = pos[e.from]
    const b = pos[e.to]
    const line = document.createElementNS(SVGNS, "line")
    line.setAttribute("class", "steptrace__edge")
    line.setAttribute("x1", String(a.x))
    line.setAttribute("y1", String(a.y))
    line.setAttribute("x2", String(b.x))
    line.setAttribute("y2", String(b.y))
    if (graph.directed) line.setAttribute("marker-end", "url(#st-arrow)")
    svg.append(line)
    edgeEls.push({ el: line, from: e.from, to: e.to, a, b })
    if (e.weight != null) {
      const label = document.createElementNS(SVGNS, "text")
      label.setAttribute("class", "steptrace__edge-label")
      label.setAttribute("x", String((a.x + b.x) / 2))
      label.setAttribute("y", String((a.y + b.y) / 2 - 4))
      label.setAttribute("text-anchor", "middle")
      label.textContent = String(e.weight)
      svg.append(label)
    }
  }

  // nodes
  const nodeEls = {}
  for (const n of graph.nodes) {
    const p = pos[n.id]
    const g = document.createElementNS(SVGNS, "g")
    g.setAttribute("class", "steptrace__node")
    // opaque backing disc (page-coloured) so edges never bleed through the
    // translucent node fill; the tinted ncirc sits on top.
    const back = document.createElementNS(SVGNS, "circle")
    back.setAttribute("class", "steptrace__nback")
    back.setAttribute("cx", p.x)
    back.setAttribute("cy", p.y)
    back.setAttribute("r", String(GRAPH_NODE_RADIUS_PX))
    const circle = document.createElementNS(SVGNS, "circle")
    circle.setAttribute("class", "steptrace__ncirc")
    circle.setAttribute("cx", p.x)
    circle.setAttribute("cy", p.y)
    circle.setAttribute("r", String(GRAPH_NODE_RADIUS_PX))
    // search goal marker: a static dashed halo, present from frame 0
    if (frames[0] && frames[0].target === n.id) {
      const halo = document.createElementNS(SVGNS, "circle")
      halo.setAttribute("class", "steptrace__ntarget")
      halo.setAttribute("cx", p.x)
      halo.setAttribute("cy", p.y)
      halo.setAttribute("r", String(GRAPH_NODE_RADIUS_PX + GRAPH_NODE_HALO_GAP_PX))
      g.append(halo)
    }
    const id = document.createElementNS(SVGNS, "text")
    id.setAttribute("class", "steptrace__id")
    id.setAttribute("x", p.x)
    id.setAttribute("y", p.y)
    id.setAttribute("text-anchor", "middle")
    id.setAttribute("dominant-baseline", "central")
    id.textContent = n.id
    const dist = document.createElementNS(SVGNS, "text")
    dist.setAttribute("class", "steptrace__d")
    dist.setAttribute("x", p.x)
    dist.setAttribute("y", String(p.y - GRAPH_NODE_RADIUS_PX - 5))
    dist.setAttribute("text-anchor", "middle")
    const mark = document.createElementNS(SVGNS, "svg")
    mark.setAttribute("class", "steptrace__nmark")
    mark.setAttribute("x", String(p.x - 6))
    mark.setAttribute("y", String(p.y + GRAPH_NODE_RADIUS_PX + 5))
    mark.setAttribute("width", "12")
    mark.setAttribute("height", "12")
    mark.setAttribute("viewBox", "0 0 24 24")
    mark.setAttribute("aria-hidden", "true")
    mark.innerHTML =
      '<rect data-state-icon="current" x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>' +
      '<path data-state-icon="frontier" d="m12 3 9 9-9 9-9-9Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>'
    const visitedMark = successMarker("steptrace__nmark-success")
    visitedMark.setAttribute("x", String(p.x + GRAPH_NODE_RADIUS_PX - 8))
    visitedMark.setAttribute("y", String(p.y - GRAPH_NODE_RADIUS_PX - 4))
    visitedMark.setAttribute("width", "12")
    visitedMark.setAttribute("height", "12")
    g.append(back, circle, id, dist, mark, visitedMark)
    svg.append(g)
    nodeEls[n.id] = { g, dist, mark }
  }

  // legend is returned as its own node so the stage column can pin it to its
  // bottom edge; the live queue + visited set move to the rail WATCH (see
  // watch() below), matching the other renderers' rails.
  const legend = makeLegend(
    [
      { label: "current", swatchClass: "steptrace__swatch steptrace__swatch--current" },
      { label: "frontier", swatchClass: "steptrace__swatch steptrace__swatch--frontier" },
      {
        label: "visited",
        swatchClass: "steptrace__swatch steptrace__swatch--visited",
        marker: successMarker(),
      },
    ],
    "Graph state legend",
  )

  const graphWrap = el("div", "steptrace__graph")
  graphWrap.append(svg)
  const geometry = observeFixedSvgNodes(
    svg,
    graph.nodes.map((node) => ({
      element: nodeEls[node.id].g,
      point: pos[node.id],
      coordinates: "absolute",
    })),
    (unitsPerCssPixel) => {
      const radius = GRAPH_NODE_RADIUS_PX * unitsPerCssPixel
      const targetRadius = (GRAPH_NODE_RADIUS_PX + (graph.directed ? 3 : 0)) * unitsPerCssPixel
      for (const edge of edgeEls) {
        const trimmed = trimGraphEdge(edge.a, edge.b, radius, targetRadius)
        edge.el.setAttribute("x1", String(trimmed.x1))
        edge.el.setAttribute("y1", String(trimmed.y1))
        edge.el.setAttribute("x2", String(trimmed.x2))
        edge.el.setAttribute("y2", String(trimmed.y2))
      }
    },
  )

  const status = statusEl()

  function paint(frame, i, total) {
    const visited = new Set(frame.visited)
    const frontier = new Set(frame.frontier)
    for (const n of graph.nodes) {
      const ne = nodeEls[n.id]
      let state = ""
      if (visited.has(n.id)) state = "visited"
      if (frontier.has(n.id)) state = "frontier"
      if (frame.current === n.id) state = "current"
      ne.g.dataset.state = state
      ne.mark.dataset.state = state
      const d = frame.dist[n.id]
      ne.dist.textContent = d == null ? "" : `d:${d}`
    }
    const selected = frame.selected || []
    const isSel = (from, to) =>
      selected.some(
        (s) => (s[0] === from && s[1] === to) || (!graph.directed && s[0] === to && s[1] === from),
      )
    for (const e of edgeEls) {
      const act =
        frame.edge &&
        ((frame.edge.from === e.from && frame.edge.to === e.to) ||
          (!graph.directed && frame.edge.from === e.to && frame.edge.to === e.from))
      const sel = isSel(e.from, e.to)
      e.el.dataset.active = act ? "true" : "false"
      e.el.dataset.selected = sel ? "true" : "false"
      e.el.dataset.dim = selected.length && !sel ? "true" : "false"
    }
    status.innerHTML =
      escapeHtml(frame.message) +
      ` <span class="steptrace__counts">· ${frame.visited.length} visited · step ${i + 1}/${total}</span>`
  }

  function watch(frame) {
    return [
      {
        k: "queue",
        v: "[ " + (frame.frontier.length ? frame.frontier.join(", ") : "∅") + " ]",
        sw: "var(--_amber)",
      },
      {
        k: "visited",
        v: "{ " + (frame.visited.length ? frame.visited.join(", ") : "∅") + " }",
        sw: "var(--_green)",
      },
    ]
  }

  return { nodes: [graphWrap, legend, status], paint, watch, destroy: geometry.destroy }
}

// ---- small DOM helpers (structure only; no styling) ----
export function statusEl() {
  const status = el("div", "steptrace__status")
  status.setAttribute("role", "status")
  status.setAttribute("aria-live", "polite")
  return status
}

export function makeLegend(items, ariaLabel, extraClass = "") {
  const legend = el("div", `steptrace__legend${extraClass ? ` ${extraClass}` : ""}`)
  legend.setAttribute("role", "list")
  legend.setAttribute("aria-label", ariaLabel)
  for (const item of items) {
    const row = el("span", "steptrace__legend-row")
    row.setAttribute("role", "listitem")
    const swatch = el(
      "span",
      `steptrace__legend-swatch${item.swatchClass ? ` ${item.swatchClass}` : ""}`,
    )
    if (item.state) swatch.dataset.state = item.state
    if (item.role) swatch.dataset.role = item.role
    if (item.color) swatch.style.setProperty("--_legend-color", item.color)
    if (item.marker) swatch.append(item.marker)
    row.append(swatch, document.createTextNode(item.label))
    legend.append(row)
  }
  return legend
}

export function el(tag, cls = "") {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  return n
}
export function escapeHtml(s) {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  )
}
export function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, "")
}
export function pad2(n) {
  return String(n).padStart(2, "0")
}
export const CHECK_PATH = "M20 6 9 17l-5-5"
export function successMarker(extraClass = "") {
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  marker.setAttribute("class", `steptrace__success-marker${extraClass ? ` ${extraClass}` : ""}`)
  marker.setAttribute("viewBox", "0 0 24 24")
  marker.setAttribute("aria-hidden", "true")
  marker.innerHTML = `<circle cx="12" cy="12" r="12"/><path d="${CHECK_PATH}"/>`
  return marker
}
// Lucide transport glyphs stay inline so they inherit the host's currentColor.
export const ICON = {
  reset:
    '<svg class="lucide lucide-rotate-ccw" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
  back: '<svg class="lucide lucide-skip-back" viewBox="0 0 24 24"><path d="M17.971 4.285A2 2 0 0 1 21 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z"/><path d="M3 20V4"/></svg>',
  fwd: '<svg class="lucide lucide-skip-forward" viewBox="0 0 24 24"><path d="M21 4v16"/><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"/></svg>',
  play: '<svg class="lucide lucide-play" viewBox="0 0 24 24"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>',
  pause:
    '<svg class="lucide lucide-pause" viewBox="0 0 24 24"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>',
  kebab:
    '<svg class="lucide lucide-ellipsis" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>',
  compare:
    '<svg class="steptrace__cue-compare" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 16-4-4 4-4"/><path d="M3 12h18"/><path d="m17 8 4 4-4 4"/></svg>',
  swap: '<svg class="steptrace__cue-swap" viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.2 15.2 4.8 4.8"/></svg>',
  chessQueen:
    '<svg class="lucide lucide-chess-queen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="m12.474 5.943 1.567 5.34a1 1 0 0 0 1.75.328l2.616-3.402"/><path d="m20 9-3 9"/><path d="m5.594 8.209 2.615 3.403a1 1 0 0 0 1.75-.329l1.567-5.34"/><path d="M7 18 4 9"/><circle cx="12" cy="4" r="2"/><circle cx="20" cy="7" r="2"/><circle cx="4" cy="7" r="2"/></svg>',
}
export function iconBtn(label, svg, extra = "") {
  const b = document.createElement("button")
  b.type = "button"
  b.className = "steptrace__btn" + (extra ? " " + extra : "")
  b.innerHTML = svg
  b.setAttribute("aria-label", label)
  b.title = label
  return b
}

// ---- teaching layer: semantic milestones + invariant/result copy ----
// These helpers deliberately read immutable frames instead of adding a second
// narration channel to every algorithm. New algorithms get a sensible generic
// timeline, while built-ins receive renderer- and algorithm-specific language.
export function buildMilestones(algorithm, kind, frames) {
  const marks = []
  const push = (i, label) => {
    if (i < 0 || i >= frames.length || !label) return
    const prev = marks[marks.length - 1]
    if (prev && (prev.i === i || prev.label === label)) return
    marks.push({ i, label })
  }
  const firstGap = frames.find((frame) => Number.isInteger(frame.gap))?.gap
  const familyProfile = frames[0]?.profile
  const firstDistributionPass = frames.find((frame) => frame.type === "pass")
  const prefixOperation = (frame) =>
    frame.operation && frame.key
      ? `${frame.operation[0].toUpperCase()}${frame.operation.slice(1)} ${frame.key}`
      : null
  const initial =
    kind === "sort"
      ? firstGap != null
        ? `Gap ${firstGap}`
        : familyProfile === "cyclic"
          ? "Place values"
          : familyProfile === "counting"
            ? "Tally keys"
            : familyProfile === "radix"
              ? `${firstDistributionPass?.passLabel || "Digit"} pass`
              : familyProfile === "bucket"
                ? "Scatter ranges"
                : familyProfile === "introsort"
                  ? "Quicksort"
                  : algorithm === "bubble-sort"
                    ? "Pass 1"
                    : algorithm === "insertion-sort"
                      ? "Prefix 1"
                      : algorithm === "selection-sort"
                        ? "Select 1"
                        : algorithm === "heap-sort"
                          ? "Build heap"
                          : algorithm === "merge-sort"
                            ? "Runs of 1"
                            : "Partition"
      : kind === "search"
        ? familyProfile === "exponential"
          ? "Gallop"
          : familyProfile === "interpolation"
            ? "Estimate"
            : familyProfile === "jump"
              ? "Jump blocks"
              : familyProfile === "ternary"
                ? "Narrow peak"
                : familyProfile === "shipping-capacity"
                  ? "Answer range"
                  : "Search range"
        : kind === "string"
          ? familyProfile === "z-array"
            ? "Initialize Z"
            : familyProfile === "boyer-moore"
              ? "Preprocess rules"
              : ["trie", "aho-corasick", "ternary-search-tree"].includes(familyProfile)
                ? prefixOperation(frames[0])
                : "Shift 0"
          : kind === "backtrack"
            ? "Depth 0"
            : kind === "rectree"
              ? familyProfile === "divide-and-conquer"
                ? "Whole problem"
                : familyProfile === "branch-and-bound"
                  ? "Root bound 116"
                  : familyProfile === "merge-sort"
                    ? "Whole array"
                    : familyProfile === "memoization"
                      ? "Empty cache"
                      : familyProfile === "coin-change-top-down"
                        ? "Amount 30¢"
                        : familyProfile === "grid-path-top-down"
                          ? "Loading bay"
                          : "Call tree"
              : kind === "pointers" &&
                  ["merge-intervals", "activity-selection"].includes(familyProfile)
                ? "Input order"
                : kind === "pointers" && familyProfile === "fast-slow-pointers"
                  ? "Start together"
                  : "Initialize"
  push(0, initial)
  let lastRange = ""
  let lastGap = firstGap
  let lastRow = null
  let lastWindow = ""
  let lastDepth = null
  for (let i = 1; i < frames.length - 1; i++) {
    const f = frames[i]
    if (kind === "sort") {
      if (familyProfile === "counting" && f.type === "prefix" && frames[i - 1].type !== "prefix") {
        push(i, "Reserve output ranges")
      } else if (
        familyProfile === "counting" &&
        f.type === "place" &&
        frames[i - 1].type !== "place"
      ) {
        push(i, "Place stably")
      } else if (familyProfile === "radix" && f.type === "pass" && frames[i - 1].type !== "pass") {
        push(i, `${f.passLabel} pass`)
      } else if (
        familyProfile === "radix" &&
        f.type === "gather" &&
        frames[i - 1].type !== "gather"
      ) {
        push(i, `Gather ${f.passLabel}`)
      } else if (familyProfile === "bucket" && f.type === "pass" && frames[i - 1].type !== "pass") {
        push(i, "Scatter ranges")
      } else if (
        familyProfile === "bucket" &&
        f.type === "local-sort" &&
        frames[i - 1].type !== "local-sort"
      ) {
        push(i, "Sort buckets")
      } else if (
        familyProfile === "bucket" &&
        f.type === "gather" &&
        frames[i - 1].type !== "gather"
      ) {
        push(i, "Gather ranges")
      } else if (familyProfile === "introsort" && f.type === "fallback") {
        push(i, "Heap fallback")
      } else if (familyProfile === "introsort" && f.type === "cleanup") {
        push(i, "Insertion cleanup")
      }
      if (Number.isInteger(f.gap) && f.gap !== lastGap) {
        push(i, `Gap ${f.gap}`)
        lastGap = f.gap
      }
      const range = f.range ? f.range.join(":") : ""
      if (range && range !== lastRange) {
        const word =
          algorithm === "merge-sort" ? "Merge" : algorithm === "heap-sort" ? "Heap" : "Range"
        push(i, `${word} ${f.range[0]}–${f.range[1]}`)
      } else if (f.type === "mark-sorted") {
        const fixed = f.sorted.length
        const word =
          familyProfile === "cyclic"
            ? "Placed"
            : algorithm === "insertion-sort"
              ? "Prefix"
              : algorithm === "selection-sort"
                ? "Select"
                : "Fixed"
        const count =
          algorithm === "bubble-sort" || algorithm === "selection-sort"
            ? Math.min(fixed + 1, f.array.length)
            : fixed
        push(i, algorithm === "bubble-sort" ? `Pass ${count}` : `${word} ${count}`)
      }
      lastRange = range || lastRange
    } else if (
      kind === "graph" &&
      (f.type === "visit" || f.type === "expand") &&
      f.current != null
    ) {
      const word =
        algorithm === "a-star"
          ? "Expand"
          : algorithm === "dijkstra"
            ? "Settle"
            : algorithm === "topological-sort"
              ? "Output"
              : "Visit"
      push(i, `${word} ${f.current}`)
    } else if (kind === "search") {
      if (familyProfile === "exponential" && f.type === "phase" && f.phase === "binary")
        push(i, "Binary search")
      else if (f.type === "phase" && f.phase === "scan")
        push(i, familyProfile === "ternary" ? "Final scan" : "Linear scan")
      else if (f.type === "phase" && f.phase === "interpolation") push(i, "Interpolation")
      else if (f.type === "phase" && f.phase === "ternary") push(i, "Ternary")
      else if (familyProfile === "shipping-capacity" && f.type === "evaluate")
        push(i, `Check ${f.candidate}`)
      else if (f.type === "probe")
        push(
          i,
          familyProfile === "ternary" && f.mid2 != null
            ? `Probes ${f.mid}/${f.mid2}`
            : `${
                familyProfile === "exponential" && f.phase === "gallop"
                  ? "Bound"
                  : familyProfile === "jump" && f.phase === "jump"
                    ? "Block end"
                    : "Probe"
              } ${f.mid}`,
        )
    } else if (
      kind === "string" &&
      ["trie", "aho-corasick", "ternary-search-tree"].includes(familyProfile)
    ) {
      if (f.type === "begin") push(i, prefixOperation(f))
      else if (familyProfile === "aho-corasick" && f.type === "goto")
        push(i, `Read ${f.text[f.textCursor]}`)
      else if (familyProfile === "aho-corasick" && f.type === "fallback")
        push(i, `Fallback ${f.activePath.at(-1) || "root"}`)
      else if (familyProfile === "aho-corasick" && f.type === "output")
        push(i, `Emit ${f.outputs.join(" + ")}`)
    } else if (kind === "string" && familyProfile === "z-array") {
      if (f.type === "focus") push(i, `i = ${f.i}`)
    } else if (kind === "string" && familyProfile === "boyer-moore") {
      if (f.type === "align") push(i, `Align ${f.shift}`)
      if (f.type === "match") push(i, `Match ${f.shift}`)
    } else if (kind === "string") {
      if (
        (f.type === "slide" || f.type === "hash" || f.type === "match") &&
        String(f.shift) !== lastWindow
      ) {
        push(i, `Shift ${f.shift}`)
        lastWindow = String(f.shift)
      }
    } else if (kind === "pointers" && familyProfile === "merge-intervals") {
      if (f.type === "sort") push(i, "Sort by start")
      else if (f.type === "seed") push(i, `Seed ${f.current[0]}–${f.current[1]}`)
      else if (f.type === "extend") push(i, `Extend ${f.current[0]}–${f.current[1]}`)
      else if (f.type === "emit") {
        const emitted = f.output.at(-1)
        if (emitted) push(i, `Emit ${emitted[0]}–${emitted[1]}`)
      } else if (f.type === "restart") {
        push(i, `Start ${f.current[0]}–${f.current[1]}`)
      }
    } else if (kind === "pointers" && familyProfile === "activity-selection") {
      const active = f.intervals.find((interval) => interval.id === f.active)
      if (f.type === "sort") push(i, "Sort by finish")
      else if (f.type === "accept" && active) push(i, `Accept ${active.start}–${active.end}`)
      else if (f.type === "reject" && active) push(i, `Reject ${active.start}–${active.end}`)
    } else if (kind === "pointers" && familyProfile === "fast-slow-pointers") {
      if (f.type === "meet") push(i, `Meet at ${f.meeting}`)
      else if (f.type === "reset") push(i, "Reset to head")
    } else if (kind === "pointers") {
      const win = f.window ? f.window.join(":") : ""
      if (win && win !== lastWindow) {
        push(i, `Window ${f.window[0]}–${f.window[1]}`)
        lastWindow = win
      }
    } else if (kind === "dp") {
      if (familyProfile === "floyd-warshall" && f.type === "stage") {
        push(i, `Stage k = ${f.k}`)
      } else if (familyProfile === "dynamic-programming" && f.type === "compute" && f.cur) {
        push(i, `${f.variant === "concrete" ? "Prefix" : "Solve"} ${f.colLabels[f.cur[1]]}`)
      } else if (f.type === "compute" && f.cur && f.cur[0] !== lastRow) {
        push(i, `Row ${f.rowLabels[f.cur[0]]}`)
        lastRow = f.cur[0]
      } else if (f.type === "trace" && frames[i - 1].type !== "trace") {
        push(i, "Traceback")
      }
    } else if (kind === "unionfind" && f.type === "link" && f.activeEdge) {
      push(i, `Link ${f.activeEdge[0]}→${f.activeEdge[1]}`)
    } else if (kind === "bits" && f.type === "commit") {
      push(i, `Clear ${f.pop}`)
    } else if (kind === "backtrack") {
      if (f.type === "place" && f.depth !== lastDepth) {
        push(i, `Depth ${f.depth}`)
        lastDepth = f.depth
      }
    } else if (kind === "rectree") {
      if (familyProfile === "branch-and-bound") {
        const activeNode = f.nodes.find((node) => node.id === f.active)
        if (f.type === "incumbent") push(i, `Incumbent ${f.incumbent}`)
        else if (f.type === "split") push(i, `Expand ${activeNode?.label || "decision"}`)
        else if (f.type === "infeasible") push(i, `Reject ${activeNode?.label || "branch"}`)
        else if (f.type === "prune") push(i, `Prune ${activeNode?.label || "branch"}`)
      } else if (f.type === "split") {
        const activeNode = f.nodes.find((node) => node.id === f.active)
        push(i, `Split ${activeNode?.label || "range"}`)
      } else if (f.type === "combine") {
        const activeNode = f.nodes.find((node) => node.id === f.active)
        push(
          i,
          `${f.profile === "merge-sort" ? "Merge" : "Combine"} ${activeNode?.label || "problem"}`,
        )
      } else if (f.type === "store") {
        const activeNode = f.nodes.find((node) => node.id === f.active)
        push(i, `Store ${activeNode?.label || "state"}`)
      } else if (f.type === "cache") {
        const activeNode = f.nodes.find((node) => node.id === f.active)
        push(i, `Reuse ${activeNode?.label || "state"}`)
      } else if (f.type === "phase") {
        push(i, f.phase === "memo" ? "Memoized" : "Plain recursion")
      }
    }
  }
  const prefixCompletion = {
    trie: "Trie complete",
    "aho-corasick": "Scan complete",
    "ternary-search-tree": "TST complete",
    "merge-intervals": "Merged output",
    "activity-selection": "Accepted schedule",
    "fast-slow-pointers": "Entry located",
  }[familyProfile]
  push(
    frames.length - 1,
    familyProfile === "branch-and-bound" ? "Best value 105" : prefixCompletion || "Result",
  )
  return marks
}

export function thinMilestones(marks) {
  if (marks.length <= 12) return marks
  const kept = [marks[0]]
  const stride = Math.ceil((marks.length - 2) / 10)
  for (let i = 1; i < marks.length - 1; i += stride) kept.push(marks[i])
  kept.push(marks[marks.length - 1])
  return kept
}

export function milestoneAt(marks, i) {
  let hit = marks[0]
  for (const mark of marks) {
    if (mark.i > i) break
    hit = mark
  }
  return hit
}

function graphEdgeWeight(graph, a, b) {
  if (!graph) return 0
  const e = graph.edges.find(
    (x) => (x.from === a && x.to === b) || (!graph.directed && x.from === b && x.to === a),
  )
  return e && e.weight != null ? e.weight : 1
}

export function summaryFor(algorithm, kind, frame, graph) {
  if (kind === "sort") {
    if (algorithm === "counting-sort")
      return `Output [${frame.output.join(", ")}] · ${frame.tallied} tallies · ${frame.placed} stable placements.`
    if (algorithm === "radix-sort" || algorithm === "bucket-sort") {
      const output = frame.source.map((token) => token.value)
      const work =
        algorithm === "radix-sort"
          ? `${frame.passCount} stable digit passes`
          : `${frame.comparisons} local comparisons`
      return `Output [${output.join(", ")}] · ${work} · ${frame.gathered} gathered.`
    }
    if (algorithm === "merge-sort")
      return `Output [${frame.array.join(", ")}] · ${frame.swaps} writes.`
    if (algorithm === "tim-sort")
      return `Output [${frame.array.join(", ")}] · ${frame.merges} run-stack merge${frame.merges === 1 ? "" : "s"}.`
    const unit =
      frame.movementUnit ||
      (["bubble-sort", "selection-sort", "quick-sort", "heap-sort"].includes(algorithm)
        ? "swaps"
        : "moves")
    const comparisons = frame.showComparisons === false ? "" : `${frame.comparisons} comparisons · `
    return `Output [${frame.array.join(", ")}] · ${comparisons}${frame.swaps} ${unit}.`
  }
  if (kind === "graph") {
    if (algorithm === "a-star") {
      const cost = frame.selectedPath?.length ? frame.g?.[frame.target] : null
      return cost == null
        ? `${frame.target} is unreachable.`
        : `Path ${frame.selectedPath.join(" → ")} · cost ${cost} · A* ${frame.astarExpanded} vs Dijkstra ${frame.dijkstraExpanded} expansions.`
    }
    if (algorithm === "dijkstra" && frame.target != null) {
      const edges = frame.selected || []
      const path = edges.length
        ? [edges[0][0], ...edges.map((e) => e[1])].join(" → ")
        : String(frame.target)
      const cost = frame.dist[frame.target]
      return cost == null
        ? `${frame.target} is unreachable.`
        : `Path ${path} · cost ${cost} · ${frame.visited.length} nodes settled.`
    }
    if (algorithm === "dijkstra") {
      const distances = Object.keys(frame.dist)
        .sort()
        .map((id) => `${id}:${frame.dist[id]}`)
        .join(", ")
      return `Shortest-path tree: ${frame.selected.length} edges · distances ${distances}.`
    }
    if (algorithm === "prim") {
      const weight = (frame.selected || []).reduce(
        (sum, e) => sum + graphEdgeWeight(graph, e[0], e[1]),
        0,
      )
      return `${frame.selected.length} edges selected · total weight ${weight} · ${frame.visited.length} nodes joined.`
    }
    if (algorithm === "topological-sort") {
      const unresolved = graph ? graph.nodes.length - frame.visited.length : 0
      return unresolved > 0
        ? `No topological order · cycle leaves ${unresolved} node${unresolved === 1 ? "" : "s"} unresolved.`
        : `Order ${frame.visited.join(" → ")} · ${frame.visited.length} nodes emitted.`
    }
    if (frame.target != null) {
      const d = frame.dist[frame.target]
      return d == null
        ? `${frame.target} is unreachable.`
        : `${frame.target} reached at depth ${d} after ${frame.visited.length} visits.`
    }
    return `${frame.visited.length} nodes visited · frontier empty.`
  }
  if (kind === "search") {
    if (algorithm === "binary-search-on-answer")
      return `Minimum feasible capacity ${frame.answer} · ${frame.probes} probe${frame.probes === 1 ? "" : "s"}.`
    return frame.found == null
      ? `${frame.target} not found · ${frame.comparisons} comparisons.`
      : `${frame.target} found at index ${frame.found} · ${frame.comparisons} comparisons.`
  }
  if (kind === "string" && frame.profile === "z-array") return `Z = [${frame.z.join(", ")}].`
  if (kind === "string" && frame.profile === "aho-corasick") {
    const matches = frame.matches.map((match) => `${match.pattern}@${match.end}`).join(", ")
    return matches ? `Matches ${matches}.` : "No patterns matched."
  }
  if (kind === "string" && frame.profile === "ternary-search-tree")
    return `${frame.terminalNodes.length} terminal keys · ${frame.visibleNodes.length - 1} character nodes.`
  if (kind === "string" && Array.isArray(frame.terminalNodes)) {
    const keys = frame.terminalNodes.filter((node) => node !== "root")
    return keys.length
      ? `Stored keys ${keys.join(", ")} · ${frame.visibleNodes.length} trie nodes.`
      : `No keys stored · ${frame.visibleNodes.length} trie node.`
  }
  if (kind === "string") {
    const found = Array.isArray(frame.found) ? frame.found : []
    return found.length
      ? `${found.length} match${found.length === 1 ? "" : "es"} at ${found.join(", ")}.`
      : `No matches found.`
  }
  if (kind === "pointers") {
    const values = (frame.marked || []).map((i) => frame.array[i])
    return values.length
      ? `Answer indices [${frame.marked.join(", ")}] · values [${values.join(", ")}].`
      : algorithm === "two-pointers" || algorithm === "sliding-window"
        ? `No qualifying range was found.`
        : `No committed result was recorded.`
  }
  if (kind === "dp") {
    if (
      [
        "coin-change-greedy",
        "coin-change-naive",
        "coin-change-memoization",
        "coin-change-tabulation",
      ].includes(algorithm)
    )
      return `${frame.best || "Exact change pending"} · target ${frame.target}¢.`
    if (
      [
        "grid-path-greedy",
        "grid-path-naive",
        "grid-path-memoization",
        "grid-path-tabulation",
      ].includes(algorithm)
    )
      return frame.bestCost == null
        ? `Warehouse route pending · current cost ${frame.routeCost}.`
        : `Minimum warehouse route cost ${frame.bestCost}.`
    if (algorithm === "coin-change-bottom-up")
      return `Fewest coins for 30¢: ${frame.grid[0]?.at(-1)} · exact change 10¢ + 10¢ + 10¢.`
    if (algorithm === "grid-path-bottom-up")
      return `Minimum warehouse route cost ${frame.grid[0]?.[0]} · ${frame.path.length} path tiles.`
    if (algorithm === "floyd-warshall") {
      if (frame.negativeCycle?.length)
        return `Negative cycle through ${frame.negativeCycle.join(", ")}; shortest paths are undefined.`
      const distances = frame.grid
        .map(
          (row, index) =>
            `${frame.rowLabels[index]}: [${row.map((value) => value ?? "∞").join(", ")}]`,
        )
        .join(" · ")
      return `All-pairs distances ${distances}.`
    }
    if (algorithm === "dynamic-programming") {
      const stored = frame.grid.flat().filter((value) => value != null).length
      const target = frame.grid[0]?.[frame.grid[0].length - 1]
      if (frame.variant === "concrete")
        return `Best non-adjacent total ${target} · ${stored} prefixes solved once.`
      return `Target ${target} · ${stored} states solved once in dependency order.`
    }
    const row = frame.grid[frame.grid.length - 1] || []
    const value = row[row.length - 1]
    const sequence = (frame.path || []).map((p) => frame.rowLabels[p[0]]).join("")
    return algorithm === "lcs"
      ? `Optimal value ${value}${sequence ? ` · sequence "${sequence}"` : ""}.`
      : `Final table value ${value}${frame.path.length ? ` · ${frame.path.length} traced cells` : ""}.`
  }
  if (kind === "unionfind")
    return `${new Set(frame.roots).size} disjoint set${new Set(frame.roots).size === 1 ? "" : "s"} · parents [${frame.parent.join(", ")}].`
  if (kind === "bits")
    return algorithm === "kernighan-popcount"
      ? `Population count ${frame.total} · ${frame.pop} lowest set bits cleared.`
      : `${frame.pop} of ${frame.total} tally steps committed.`
  if (kind === "backtrack")
    return frame.solved
      ? `Solved at depth ${frame.depth} · ${frame.placed} placements · ${frame.pruned} branches pruned.`
      : `No arrangement found · ${frame.pruned} branches pruned.`
  if (kind === "rectree") {
    if (algorithm === "branch-and-bound")
      return `Best value ${frame.incumbent} · take A + C · weight 7/7 · ${frame.pruned} branches pruned.`
    if (algorithm === "coin-change-top-down")
      return `Fewest coins for 30¢: ${frame.results?.c30 || "—"} · ${frame.pruned} recursive calls skipped.`
    if (algorithm === "grid-path-top-down")
      return `Minimum warehouse route cost ${frame.results?.r1c1 || "—"} · ${frame.pruned} recursive calls skipped.`
    if (algorithm === "memoization") {
      const memoResult = String(frame.results?.a || "ready").replace(/^result\s+/i, "")
      return `Result ${memoResult} · ${frame.calls} calls · ${frame.pruned} recursive calls skipped.`
    }
    const result = frame.results?.root
    if (Array.isArray(result)) return `Sorted result [${result.join(", ")}].`
    return result ? `${result}.` : stripTags(frame.message)
  }
  return stripTags(frame.message)
}
