// ==========================================================================
//  5. RENDER  —  builds DOM only. Sets semantic classes + data attributes +
//  data-driven geometry (bar heights, node coordinates). It sets NO colours
//  or layout — every visual rule lives in src/styles/. To change appearance,
//  edit the owning SCSS module, not this file.
// ==========================================================================

// ---- sort view: value-in-bar + tracked i/j pin markers (no hat) ----
// shared bar scaffold for sort + binary-search: bottom-aligned bars, each a
// coloured fill with the value BELOW and centered state icons for finalised /
// probe states (revealed via CSS). Returns [{ bar, fill, num, check, probe }].
function makeBars(stage, n) {
  const bars = []
  for (let k = 0; k < n; k++) {
    const bar = el("div", "steptrace__bar")
    const fill = el("div", "steptrace__fill")
    const check = el("div", "steptrace__check")
    check.innerHTML = ICON.check
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
      // clear any in-flight swap animation before (possibly) starting a new one
      b.bar.classList.remove("steptrace__bar--fly")
      b.bar.style.transform = ""
    }
    // FLIP: a moved bar starts in the slot it came FROM (inverted transform,
    // no transition) and springs home, so the motion is literal.
    //   swap      — the pair trade places (bubble/selection/quick/heap)
    //   overwrite — one bar travels from frame.from (insertion shift, merge
    //               lifting a value out of a run head into the merged slot)
    const starts = []
    for (const [to, from] of visual.movements) {
      const bt = bars[to] && bars[to].bar
      const bf = bars[from] && bars[from].bar
      if (!bt || !bf || !bt.isConnected) continue
      const dx = bf.getBoundingClientRect().left - bt.getBoundingClientRect().left
      if (dx) starts.push([bt, dx])
    }
    for (const [bt, dx] of starts) bt.style.transform = `translateX(${dx}px)`
    if (starts.length) void starts[0][0].offsetWidth // commit the inverted starts
    for (const [bt] of starts) {
      bt.classList.add("steptrace__bar--fly")
      bt.style.transform = ""
    }
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

  return { nodes: [stage, status], paint, watch, destroy: tracker.destroy }
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

export function stepMarkerSpring(current, target, elapsedMs, settleMs = 360) {
  if (current == null || elapsedMs <= 0) return current == null ? target : current
  const alpha = 1 - Math.exp((-5 * elapsedMs) / settleMs)
  const next = current + (target - current) * alpha
  return Math.abs(target - next) < 0.4 ? target : next
}

export function shouldResetHeldMarker(previous, next) {
  if (!previous) return true
  return previous.tokenId !== next.tokenId || next.frameIndex !== previous.frameIndex + 1
}

// Each marker follows its target bar through the primary rAF loop. A 50 ms
// timer runs only when the document is hidden or rAF is stale. Legacy markers
// keep their responsive per-frame x spring and direct y tracking; the held-key
// marker uses time-based x/y easing so placement remains readable.
function createBarTracker(stage, bars, markers) {
  let targets = markers.map(() => null)
  const sx = markers.map(() => null)
  const sy = markers.map(() => null)
  const SPRING = 0.32
  let lastStepAt = null
  function frameStep(now) {
    const elapsed = lastStepAt == null ? 0 : Math.max(0, now - lastStepAt)
    lastStepAt = now
    const sr = stage.getBoundingClientRect()
    for (let m = 0; m < markers.length; m++) {
      const idx = targets[m]
      const bar = idx != null && idx >= 0 && bars[idx] ? bars[idx].fill : null
      const mk = markers[m]
      if (!bar || !bar.isConnected) {
        mk.el.style.opacity = "0"
        sx[m] = null
        sy[m] = null
        continue
      }
      const br = bar.getBoundingClientRect()
      const targetX = br.left + br.width / 2 - sr.left
      const bodyWidth = mk.body.getBoundingClientRect().width
      const tx = clampMarkerCenter(targetX, bodyWidth, sr.width)
      mk.el.style.setProperty("--steptrace-marker-tip-offset", `${targetX - tx}px`)
      const ty = mk.role === "held" && mk.el.dataset.placing !== "1" ? 34 : br.top - sr.top
      const reduced = stage.closest(".steptrace--reduced")
      if (sx[m] == null || reduced) sx[m] = tx
      else if (mk.role === "held") sx[m] = stepMarkerSpring(sx[m], tx, elapsed)
      else {
        sx[m] += (tx - sx[m]) * SPRING
        if (Math.abs(tx - sx[m]) < 0.4) sx[m] = tx
      }
      if (sy[m] == null || reduced || mk.role !== "held") sy[m] = ty
      else sy[m] = stepMarkerSpring(sy[m], ty, elapsed)
      mk.el.style.transform = `translate(${sx[m].toFixed(2)}px, ${sy[m].toFixed(2)}px)`
      mk.el.style.opacity = "1"
    }
  }
  let lastRafAt = 0
  function loop(now) {
    lastRafAt = now
    frameStep(now)
    raf = requestAnimationFrame(loop)
  }
  let raf = requestAnimationFrame(loop)
  const iv = setInterval(() => {
    const now = performance.now()
    if (document.hidden || now - lastRafAt > 100) frameStep(now)
  }, 50)
  return {
    set(...indices) {
      targets = markers.map((_, index) => indices[index] ?? null)
    },
    reset(index) {
      if (index < 0 || index >= markers.length) return
      sx[index] = null
      sy[index] = null
    },
    renderNow() {
      frameStep(performance.now())
    },
    destroy() {
      cancelAnimationFrame(raf)
      clearInterval(iv)
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

  return { nodes: [stage, status], paint, watch }
}

// ---- string-matching view: text with the pattern aligned underneath ----
const CELL_W = 34 // px; must match .steptrace__cell width for shift alignment
export function makeMatchView(frames) {
  const text = frames[0].text
  const pattern = frames[0].pattern
  const hasHash = frames.some((f) => f.hash) // rabin-karp only ⇒ constant rows

  const hashBadge = el("div", "steptrace__hash")
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
    // rabin-karp only: the badge is always present (constant height ⇒ no jitter);
    // frames without a live hash keep the row via a non-breaking placeholder.
    if (hasHash) {
      hashBadge.textContent = frame.hash
        ? `window hash ${frame.hash.window} ${frame.hash.window === frame.hash.pattern ? "=" : "≠"} pattern hash ${frame.hash.pattern}`
        : " "
    }
    status.innerHTML =
      escapeHtml(frame.message) + ` <span class="steptrace__counts">· step ${i + 1}/${total}</span>`
  }

  function watch(frame) {
    const rows = [
      { k: "shift", v: String(frame.shift), sw: "var(--_blue)" },
      { k: "matches", v: String(frame.found.length), sw: "var(--_green)" },
    ]
    if (hasHash) {
      rows.push({
        k: "hash",
        v: frame.hash ? `${frame.hash.window} / ${frame.hash.pattern}` : "—",
        sw: "var(--_amber)",
      })
    }
    return rows
  }

  // hash badge (if any) is placed AFTER the stage ⇒ it renders below the viz.
  const nodes = hasHash ? [stage, hashBadge, status] : [stage, status]
  return { nodes, paint, watch, destroy: () => ro && ro.disconnect() }
}

// ---- array-pointer view: a segmented strip + [ ] end brackets + window ----
// The active window tints the cells' OWN background, so the strip's
// overflow:hidden rounded frame clips it flush — rounded only at the real
// ends, square at interior edges (no floating mid-strip radius). The blue [
// / violet ] brackets overlay the window ends; match recolours all of it green.
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
  const wrap = el("div", "steptrace__pwrap")
  const strip = el("div", "steptrace__pcells")
  const cells = []
  for (let k = 0; k < n; k++) {
    const cell = el("div", "steptrace__pcell")
    cell.textContent = frames[0].array[k]
    strip.append(cell)
    cells.push(cell)
  }
  const brackets = el("div", "steptrace__pbrackets")
  const brL = el("div", "steptrace__pbr steptrace__pbr--l")
  const brR = el("div", "steptrace__pbr steptrace__pbr--r")
  brackets.append(brL, brR)
  wrap.append(strip, brackets)
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

// ---- dp view: a 2-D table that fills in cell by cell ----
export function makeDPView(frames) {
  const f0 = frames[0]
  const R = f0.rowLabels.length
  const C = f0.colLabels.length
  const table = el("table", "steptrace__dp")
  const thead = document.createElement("thead")
  const htr = document.createElement("tr")
  htr.append(document.createElement("th"))
  for (let c = 0; c < C; c++) {
    const th = document.createElement("th")
    th.textContent = f0.colLabels[c]
    htr.append(th)
  }
  thead.append(htr)
  table.append(thead)
  const tbody = document.createElement("tbody")
  const cellEls = []
  for (let r = 0; r < R; r++) {
    const tr = document.createElement("tr")
    const th = document.createElement("th")
    th.textContent = f0.rowLabels[r]
    tr.append(th)
    const rowCells = []
    for (let c = 0; c < C; c++) {
      const td = document.createElement("td")
      tr.append(td)
      rowCells.push(td)
    }
    cellEls.push(rowCells)
    tbody.append(tr)
  }
  table.append(tbody)
  const wrap = el("div", "steptrace__dp-wrap")
  wrap.append(table)
  const status = statusEl()

  function paint(frame, i, total) {
    const curKey = frame.cur ? frame.cur.join(",") : null
    const depSet = new Set((frame.deps || []).map((d) => d.join(",")))
    const pathSet = new Set((frame.path || []).map((p) => p.join(",")))
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const td = cellEls[r][c]
        const v = frame.grid[r][c]
        td.textContent = v == null ? "" : v
        const key = r + "," + c
        let state = ""
        if (depSet.has(key)) state = "dep"
        if (pathSet.has(key)) state = "path"
        if (curKey === key) state = "cur"
        td.dataset.state = state
      }
    }
    status.innerHTML =
      escapeHtml(frame.message) + ` <span class="steptrace__counts">· step ${i + 1}/${total}</span>`
  }

  function watch(frame) {
    const cur = frame.cur
    const v = cur ? frame.grid[cur[0]][cur[1]] : null
    return [
      { k: "cell", v: cur ? `[${cur[0]}, ${cur[1]}]` : "—", sw: "var(--_blue)" },
      { k: "value", v: v == null ? "—" : String(v), sw: "var(--_green)" },
    ]
  }

  return { nodes: [wrap, status], paint, watch }
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

// ---- backtrack view: an n×n board (row = recursion depth) + a path strip ----
// The board IS the tree state: queen columns are the root-to-node path. `attacked`
// is DERIVED here from `queens` (frames stay small), so shaded options visibly
// shrink before a choice and recede when a queen is torn off. Cells + path slots
// are built ONCE; paint() only rewrites data-* / textContent (no jitter).
export function makeBacktrackView(frames) {
  const n = frames[0].n
  const wrap = el("div", "steptrace__bt")
  const board = el("div", "steptrace__btboard")
  board.style.setProperty("--_n", String(n))
  const cells = []
  for (let r = 0; r < n; r++) {
    const rowCells = []
    for (let c = 0; c < n; c++) {
      const cell = el("div", "steptrace__btcell")
      cell.dataset.parity = String((r + c) % 2)
      const glyph = el("div", "steptrace__btqueen")
      glyph.textContent = "♛" // ♛
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
  wrap.append(board, strip)
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

  function paint(frame) {
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

  return { nodes: [wrap, status], paint, watch }
}

// ---- rectree view: an SVG recursion tree (naive) that collapses into a memo
//  DAG. Cloned from makeGraphView: the viewBox is derived ONCE from the full
//  node set and EVERY node/edge is placed on frame 0. paint() only toggles
//  data-* and rewrites value text — never inserts/removes DOM — so the stage
//  height is identical on every frame. ----
const RT_R = 16 // rectree node radius
export function makeRecTreeView(frames) {
  const f0 = frames[0]
  const nodes = f0.nodes
  const pad = 26
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const w = Math.max(...xs) - minX + pad * 2
  const h = Math.max(...ys) - minY + pad * 2
  const pos = Object.fromEntries(
    nodes.map((n) => [n.id, { x: n.x - minX + pad, y: n.y - minY + pad }]),
  )

  const svg = document.createElementNS(SVGNS, "svg")
  svg.setAttribute("class", "steptrace__rtsvg")
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`)
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", "Recursion tree")

  // edges first (under nodes); each fades in with its child node
  const edgeEls = []
  for (const e of f0.edges) {
    const a = pos[e.from]
    const b = pos[e.to]
    const line = document.createElementNS(SVGNS, "line")
    line.setAttribute("class", "steptrace__rtedge")
    line.setAttribute("x1", a.x)
    line.setAttribute("y1", a.y)
    line.setAttribute("x2", b.x)
    line.setAttribute("y2", b.y)
    svg.append(line)
    edgeEls.push({ el: line, to: e.to })
  }

  const nodeEls = {}
  for (const n of nodes) {
    const p = pos[n.id]
    const g = document.createElementNS(SVGNS, "g")
    g.setAttribute("class", "steptrace__rtnode")
    const ring = document.createElementNS(SVGNS, "circle")
    ring.setAttribute("class", "steptrace__rtring")
    ring.setAttribute("cx", p.x)
    ring.setAttribute("cy", p.y)
    ring.setAttribute("r", String(RT_R + 3))
    const back = document.createElementNS(SVGNS, "circle")
    back.setAttribute("class", "steptrace__rtback")
    back.setAttribute("cx", p.x)
    back.setAttribute("cy", p.y)
    back.setAttribute("r", String(RT_R))
    const circ = document.createElementNS(SVGNS, "circle")
    circ.setAttribute("class", "steptrace__rtcirc")
    circ.setAttribute("cx", p.x)
    circ.setAttribute("cy", p.y)
    circ.setAttribute("r", String(RT_R))
    const label = document.createElementNS(SVGNS, "text")
    label.setAttribute("class", "steptrace__rtlabel")
    label.setAttribute("x", p.x)
    label.setAttribute("y", p.y)
    label.setAttribute("text-anchor", "middle")
    label.setAttribute("dominant-baseline", "central")
    label.textContent = n.label
    const val = document.createElementNS(SVGNS, "text")
    val.setAttribute("class", "steptrace__rtval")
    val.setAttribute("x", p.x)
    val.setAttribute("y", p.y + RT_R + 9)
    val.setAttribute("text-anchor", "middle")
    g.append(ring, back, circ, label, val)
    svg.append(g)
    nodeEls[n.id] = { g, val }
  }

  const legend = el("div", "steptrace__legend")
  for (const [word, key] of [
    ["compute", "current"],
    ["store (miss)", "frontier"],
    ["reuse (hit)", "visited"],
  ]) {
    const row = el("div", "steptrace__legend-row")
    row.append(
      el("span", "steptrace__swatch steptrace__swatch--" + key),
      document.createTextNode(word),
    )
    legend.append(row)
  }

  const wrap = el("div", "steptrace__rectree")
  wrap.append(svg)
  const status = statusEl()

  function paint(frame, i, total) {
    const vis = new Set(frame.vis)
    const collapsed = new Set(frame.collapsed)
    const state = frame.state
    const vals = frame.vals
    for (const n of nodes) {
      const ne = nodeEls[n.id]
      ne.g.dataset.vis = vis.has(n.id) ? "1" : "0"
      ne.g.dataset.collapsed = collapsed.has(n.id) ? "true" : "false"
      ne.g.dataset.state = state[n.id] || ""
      ne.g.dataset.active = frame.active === n.id ? "true" : "false"
      const v = vals[n.id]
      ne.val.textContent = v == null ? "" : "= " + v
    }
    for (const e of edgeEls) {
      e.el.dataset.vis = vis.has(e.to) ? "1" : "0"
      e.el.dataset.collapsed = collapsed.has(e.to) ? "true" : "false"
    }
    status.innerHTML =
      escapeHtml(frame.message) + ` <span class="steptrace__counts">· step ${i + 1}/${total}</span>`
  }

  // exactly 3 rows every frame ⇒ constant footer height
  function watch(frame) {
    const last = frame.memo.length ? frame.memo[frame.memo.length - 1] : null
    const ev =
      frame.type === "miss" || frame.type === "hit" || frame.type === "base" ? frame.type : "—"
    return [
      { k: "calls", v: String(frame.calls), sw: "var(--_blue)" },
      { k: "memo", v: last ? `f(${last.k}) = ${last.v}` : "—", sw: "var(--_green)" },
      { k: "event", v: ev, sw: "var(--_violet)" },
    ]
  }

  return { nodes: [wrap, legend, status], paint, watch }
}

// ---- graph view: svg ----
const SVGNS = "http://www.w3.org/2000/svg"
const R = 16 // node radius

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
    const { x1, y1, x2, y2 } = trimToRadius(a, b, R + (graph.directed ? 3 : 0))
    const line = document.createElementNS(SVGNS, "line")
    line.setAttribute("class", "steptrace__edge")
    line.setAttribute("x1", x1)
    line.setAttribute("y1", y1)
    line.setAttribute("x2", String(x2))
    line.setAttribute("y2", String(y2))
    if (graph.directed) line.setAttribute("marker-end", "url(#st-arrow)")
    svg.append(line)
    edgeEls.push({ el: line, from: e.from, to: e.to })
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
    back.setAttribute("r", String(R))
    const circle = document.createElementNS(SVGNS, "circle")
    circle.setAttribute("class", "steptrace__ncirc")
    circle.setAttribute("cx", p.x)
    circle.setAttribute("cy", p.y)
    circle.setAttribute("r", String(R))
    // search goal marker: a static dashed halo, present from frame 0
    if (frames[0] && frames[0].target === n.id) {
      const halo = document.createElementNS(SVGNS, "circle")
      halo.setAttribute("class", "steptrace__ntarget")
      halo.setAttribute("cx", p.x)
      halo.setAttribute("cy", p.y)
      halo.setAttribute("r", String(R + 4.5))
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
    dist.setAttribute("y", String(p.y - R - 5))
    dist.setAttribute("text-anchor", "middle")
    const mark = document.createElementNS(SVGNS, "svg")
    mark.setAttribute("class", "steptrace__nmark")
    mark.setAttribute("x", String(p.x - 6))
    mark.setAttribute("y", String(p.y + R + 5))
    mark.setAttribute("width", "12")
    mark.setAttribute("height", "12")
    mark.setAttribute("viewBox", "0 0 24 24")
    mark.setAttribute("aria-hidden", "true")
    mark.innerHTML =
      '<rect data-state-icon="current" x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>' +
      '<path data-state-icon="frontier" d="m12 3 9 9-9 9-9-9Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path data-state-icon="visited" d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    g.append(back, circle, id, dist, mark)
    svg.append(g)
    nodeEls[n.id] = { g, dist, mark }
  }

  // legend is returned as its own node so the stage column can pin it to its
  // bottom edge; the live queue + visited set move to the rail WATCH (see
  // watch() below), matching the other renderers' rails.
  const legend = el("div", "steptrace__legend")
  for (const [word, stateKey] of [
    ["current", "current"],
    ["frontier", "frontier"],
    ["visited", "visited"],
  ]) {
    const row = el("div", "steptrace__legend-row")
    const sw = el("span", "steptrace__swatch steptrace__swatch--" + stateKey)
    if (stateKey === "visited") {
      sw.innerHTML = ICON.check
      sw.setAttribute("aria-hidden", "true")
    }
    row.append(sw, document.createTextNode(word))
    legend.append(row)
  }

  const graphWrap = el("div", "steptrace__graph")
  graphWrap.append(svg)

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

  return { nodes: [graphWrap, legend, status], paint, watch }
}

// ---- small DOM helpers (structure only; no styling) ----
function trimToRadius(a, b, r) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  return { x1: a.x + ux * R, y1: a.y + uy * R, x2: b.x - ux * r, y2: b.y - uy * r }
}

function statusEl() {
  const status = el("div", "steptrace__status")
  status.setAttribute("role", "status")
  status.setAttribute("aria-live", "polite")
  return status
}

export function el(tag, cls = "") {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  return n
}
export function spacer() {
  return el("span", "steptrace__spacer")
}
export function button(label, glyph, extra = "") {
  const b = document.createElement("button")
  b.type = "button"
  b.className = "steptrace__btn" + (extra ? " " + extra : "")
  b.textContent = glyph
  b.setAttribute("aria-label", label)
  b.title = label
  return b
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
// transport glyphs — inline SVG so they inherit currentColor. Filled shapes set
// their own fill/stroke so they render right on both the ghost and accent buttons.
export const ICON = {
  reset:
    '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3.4 4.6V8h3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg viewBox="0 0 24 24"><polygon points="18 5 9 12 18 19" fill="currentColor" stroke="none"/><rect x="5" y="5" width="2" height="14" rx="0.6" fill="currentColor" stroke="none"/></svg>',
  fwd: '<svg viewBox="0 0 24 24"><polygon points="6 5 15 12 6 19" fill="currentColor" stroke="none"/><rect x="17" y="5" width="2" height="14" rx="0.6" fill="currentColor" stroke="none"/></svg>',
  play: '<svg viewBox="0 0 24 24"><polygon points="7 4.5 19 12 7 19.5" fill="currentColor" stroke="none"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24"><rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none"/></svg>',
  kebab:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  compare:
    '<svg class="steptrace__cue-compare" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 16-4-4 4-4"/><path d="M3 12h18"/><path d="m17 8 4 4-4 4"/></svg>',
  swap: '<svg class="steptrace__cue-swap" viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.2 15.2 4.8 4.8"/></svg>',
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
  const initial =
    kind === "sort"
      ? firstGap != null
        ? `Gap ${firstGap}`
        : familyProfile === "cyclic"
          ? "Place values"
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
          : familyProfile === "jump"
            ? "Jump blocks"
            : familyProfile === "ternary"
              ? "Narrow peak"
              : "Search range"
        : kind === "string"
          ? "Shift 0"
          : kind === "backtrack"
            ? "Depth 0"
            : kind === "rectree"
              ? "Call tree"
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
      if (familyProfile === "introsort" && f.type === "fallback") {
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
    } else if (kind === "graph" && f.type === "visit" && f.current != null) {
      const word =
        algorithm === "dijkstra" ? "Settle" : algorithm === "topological-sort" ? "Output" : "Visit"
      push(i, `${word} ${f.current}`)
    } else if (kind === "search") {
      if (familyProfile === "exponential" && f.type === "phase" && f.phase === "binary")
        push(i, "Binary search")
      else if (f.type === "phase" && f.phase === "scan")
        push(i, familyProfile === "ternary" ? "Final scan" : "Linear scan")
      else if (f.type === "phase" && f.phase === "ternary") push(i, "Ternary")
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
    } else if (kind === "string") {
      if (
        (f.type === "slide" || f.type === "hash" || f.type === "match") &&
        String(f.shift) !== lastWindow
      ) {
        push(i, `Shift ${f.shift}`)
        lastWindow = String(f.shift)
      }
    } else if (kind === "pointers") {
      const win = f.window ? f.window.join(":") : ""
      if (win && win !== lastWindow) {
        push(i, `Window ${f.window[0]}–${f.window[1]}`)
        lastWindow = win
      }
    } else if (kind === "dp") {
      if (f.type === "compute" && f.cur && f.cur[0] !== lastRow) {
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
    } else if (kind === "rectree" && f.type === "phase") {
      push(i, f.phase === "memo" ? "Memoized" : "Plain recursion")
    }
  }
  push(frames.length - 1, "Result")
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
    if (algorithm === "merge-sort")
      return `Output [${frame.array.join(", ")}] · ${frame.swaps} writes.`
    const unit =
      frame.movementUnit ||
      (["bubble-sort", "selection-sort", "quick-sort", "heap-sort"].includes(algorithm)
        ? "swaps"
        : "moves")
    const comparisons = frame.showComparisons === false ? "" : `${frame.comparisons} comparisons · `
    return `Output [${frame.array.join(", ")}] · ${comparisons}${frame.swaps} ${unit}.`
  }
  if (kind === "graph") {
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
  if (kind === "search")
    return frame.found == null
      ? `${frame.target} not found · ${frame.comparisons} comparisons.`
      : `${frame.target} found at index ${frame.found} · ${frame.comparisons} comparisons.`
  if (kind === "string")
    return frame.found.length
      ? `${frame.found.length} match${frame.found.length === 1 ? "" : "es"} at ${frame.found.join(", ")}.`
      : `No matches found.`
  if (kind === "pointers") {
    const values = (frame.marked || []).map((i) => frame.array[i])
    return values.length
      ? `Answer indices [${frame.marked.join(", ")}] · values [${values.join(", ")}].`
      : algorithm === "two-pointers" || algorithm === "sliding-window"
        ? `No qualifying range was found.`
        : `No committed result was recorded.`
  }
  if (kind === "dp") {
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
  if (kind === "rectree") return stripTags(frame.message)
  return stripTags(frame.message)
}
