import { Player } from "./player"
import {
  ICON,
  buildMilestones,
  el,
  iconBtn,
  makeBacktrackView,
  makeBitsView,
  makeDPView,
  makeGraphView,
  makeMatchView,
  makePointerView,
  makeRecTreeView,
  makeSearchView,
  makeSortView,
  makeUnionFindView,
  milestoneAt,
  pad2,
  stripTags,
  successMarker,
  summaryFor,
  thinMilestones,
} from "./render"
import type { RegistryApi } from "./registry"
import type {
  HostTabsHandle,
  InteractiveStructureDefinition,
  MountHandle,
  StepTraceConfig,
  StepTraceHost,
} from "./types"
import { watchHintFor } from "./watch-hints"

const LOG_ROWS = 10
const COMPACT_INLINE_SIZE = 704
const fadeFor = (age: number) => Math.max(0.1, 0.5 * Math.pow(0.62, age - 1))
let mountSerial = 0

// ==========================================================================
//  7. MOUNT  —  assemble a card into `root` from a flat config, wire the
//  toolbar + keyboard, and return { destroy } (host teardown: stops timers,
//  drops listeners). `host` may provide native controls without entering the
//  serializable config. sort: { algorithm, array?, speed? };
//  graph: { algorithm, start?, directed?, nodes?, edges?, speed? }.
// ==========================================================================

export function createMount(
  registry: Pick<RegistryApi, "kindOf" | "listAlgorithms" | "buildFrames">,
  structures: readonly InteractiveStructureDefinition[] = [],
) {
  const { kindOf, listAlgorithms, buildFrames } = registry
  const structureRegistry = new Map(structures.map((structure) => [structure.id, structure]))
  function mountNow(
    root: HTMLElement,
    config: StepTraceConfig,
    host: StepTraceHost = {},
  ): MountHandle {
    const structure = structureRegistry.get(config.algorithm)
    if (structure) {
      try {
        return structure.mount(root, structure.parse(config))
      } catch (error) {
        root.textContent = error instanceof Error ? error.message : String(error)
        return { destroy: () => root.replaceChildren() }
      }
    }
    root.classList.add("steptrace")
    root.setAttribute("role", "group")
    root.setAttribute("aria-label", "Algorithm visualizer")
    const watchHintPrefix = `steptrace-watch-hint-${++mountSerial}`

    const kind = kindOf(config.algorithm)
    if (!kind) {
      root.textContent = `steptrace: unknown algorithm "${config.algorithm}".`
      return { destroy: () => root.replaceChildren() }
    }

    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const applyMotion = () => root.classList.toggle("steptrace--reduced", mq.matches)
    mq.addEventListener("change", applyMotion)
    const shouldIncludeArray =
      Array.isArray(config.array) || kind === "sort" || kind === "search" || kind === "pointers"

    const state = {
      algorithm: config.algorithm,
      speed: config.speed || 1,
      array:
        Array.isArray(config.array) && config.array.length ? config.array.slice() : randomArray(),
      start: config.start != null ? String(config.start) : null,
      target: config.target != null ? String(config.target) : null,
      config,
    }

    let player = null
    let currentView = null
    let currentGraph = null
    let currentMilestones = []
    let speedControlHandle = null
    const hasHostTabs = typeof host.mountTabs === "function"

    // --- card chrome: head (breadcrumb + counter) / body (stage | rail) / foot ---
    const head = el("div", "steptrace__head")
    const crumb = el("div", "steptrace__crumb")
    const crumbKind = el("span")
    crumbKind.textContent = kind
    const crumbSep = el("span", "steptrace__crumb-sep")
    crumbSep.textContent = "›"
    const crumbAlgo = el("span", "steptrace__crumb-algo")
    crumbAlgo.textContent = state.algorithm
    crumb.append(el("span", "steptrace__crumb-dot"), crumbKind, crumbSep, crumbAlgo)
    const counter = el("div", "steptrace__counter")
    head.append(crumb, counter)

    const stageCol = el("div", "steptrace__stage-col")
    const rail = el("div", "steptrace__rail")
    const railRegion = el("div", "steptrace__rail-region")
    railRegion.classList.toggle("steptrace__rail-region--fallback", !hasHostTabs)
    railRegion.id = `steptrace-rail-${++mountSerial}`
    railRegion.setAttribute("role", "region")
    railRegion.setAttribute("aria-label", "Trace and watch")
    const detailSwitch = el("div", "steptrace__detail-switch")
    detailSwitch.setAttribute("role", "group")
    detailSwitch.setAttribute("aria-label", "Detail view")
    const traceButton = el("button", "steptrace__detail-button")
    traceButton.type = "button"
    traceButton.textContent = "Trace"
    traceButton.setAttribute("aria-label", "Trace")
    const watchButton = el("button", "steptrace__detail-button")
    watchButton.type = "button"
    watchButton.textContent = "Watch"
    watchButton.setAttribute("aria-label", "Watch")
    detailSwitch.append(traceButton, watchButton)
    const traceWrap = el("div", "steptrace__trace")
    const traceLabel = el("div", "steptrace__rail-label steptrace__trace-label")
    traceLabel.textContent = "Trace"
    const log = el("ol", "steptrace__log")
    // The log's height is pinned to its worst case (two full-width history lines
    // plus the tallest step message), but rows hug their text, so short steps
    // leave that reservation half empty. Keep a deep pool of rows and let
    // fitLog() below fill whatever space the current steps did not use.
    const logLines = []
    for (let k = 0; k < LOG_ROWS; k++) {
      const line = el("li", "steptrace__log-line")
      const num = el("span", "steptrace__log-num")
      const txt = el("span", "steptrace__log-text")
      line.append(num, txt)
      log.append(line)
      logLines.push({ line, num, txt })
    }
    // RESULT is the log's last row: on the terminal frame it stands in for the
    // current step line, leaving the TRACE eyebrow and the earlier steps above it
    // untouched. Once there is an answer, only the live line has to give way.
    const insight = el("li", "steptrace__insight")
    insight.setAttribute("aria-live", "off")
    insight.setAttribute("aria-atomic", "true")
    insight.hidden = true
    const insightLabel = el("span", "steptrace__insight-label")
    insightLabel.textContent = "Result"
    const insightText = el("span", "steptrace__insight-text")
    insight.append(successMarker("steptrace__insight-marker"), insightLabel, insightText)
    log.append(insight)
    traceWrap.append(traceLabel, log)

    const watchWrap = el("div", "steptrace__watch-wrap")
    const watchLabel = el("div", "steptrace__rail-label")
    watchLabel.textContent = "Watch"
    const watchEl = el("div", "steptrace__watch")
    watchWrap.append(watchLabel, watchEl)
    watchWrap.hidden = true
    railRegion.append(traceWrap, watchWrap)
    if (!hasHostTabs) rail.append(detailSwitch)
    rail.append(railRegion)
    const body = el("div", "steptrace__body")
    body.append(stageCol, rail)

    // foot: scrubber + transport + kebab (speed + kind action)
    const foot = el("div", "steptrace__foot")
    const scrub = el("div", "steptrace__scrub")
    scrub.setAttribute("role", "slider")
    scrub.setAttribute("tabindex", "0")
    scrub.setAttribute("aria-label", "Step")
    const scrubFill = el("div", "steptrace__scrub-fill")
    const scrubDot = el("div", "steptrace__scrub-dot")
    const milestoneLayer = el("div", "steptrace__milestones")
    scrub.append(el("div", "steptrace__scrub-track"), scrubFill, milestoneLayer, scrubDot)
    const phase = el("div", "steptrace__phase")
    const phaseName = el("span", "steptrace__phase-name")
    const phaseCopy = el("span", "steptrace__phase-copy")
    phase.append(phaseName, phaseCopy)
    const timeline = el("div", "steptrace__timeline")
    timeline.append(scrub)

    const btnReset = iconBtn("Restart", ICON.reset)
    const btnBack = iconBtn("Step back", ICON.back)
    const btnPlay = iconBtn("Play", ICON.play, "steptrace__btn--play")
    const btnFwd = iconBtn("Step forward", ICON.fwd)

    const menuWrap = el("div", "steptrace__menu-wrap")
    const btnMenu = iconBtn("Options", ICON.kebab)
    btnMenu.setAttribute("aria-haspopup", "true")
    btnMenu.setAttribute("aria-expanded", "false")
    const menu = el("div", "steptrace__menu")
    const speedHead = el("div", "steptrace__menu-h")
    speedHead.textContent = "Speed"
    const speedIndicator = el("span", "steptrace__speed-indicator")
    speedIndicator.setAttribute("aria-hidden", "true")
    const speedSection = el("div", "steptrace__menu-section")
    const speedRow = el("div", "steptrace__speed-row")
    const speedControl = el("div", "steptrace__speed-control")
    speedRow.append(speedControl)
    const fmtSpeed = (v) => Number(v).toFixed(2) + "×" // fixed width: "1.50×", never resizes the menu
    const applySpeed = (value) => {
      const v = Number(value)
      state.speed = v
      speedIndicator.textContent = `${v}×`
      // transitions must fit inside the step interval (baseDelay / speed), else
      // 2× bleeds each animation into the next frame and 0.5× freezes mid-step
      root.style.setProperty("--_tween", `${Math.round(107 / v)}ms`)
      if (player) player.setSpeed(v)
    }
    if (host && typeof host.createSpeedSlider === "function") {
      speedControlHandle = host.createSpeedSlider(speedControl, {
        min: 0.5,
        max: 2,
        step: 0.25,
        value: state.speed,
        label: "Playback speed",
        format: fmtSpeed,
        onChange: applySpeed,
      })
    } else {
      const speedInput = el("input", "steptrace__range")
      speedInput.type = "range"
      speedInput.min = "0.5"
      speedInput.max = "2"
      speedInput.step = "0.25"
      speedInput.value = String(state.speed)
      speedInput.setAttribute("aria-label", "Playback speed")
      speedInput.setAttribute("aria-valuetext", fmtSpeed(state.speed))
      const speedVal = el("span", "steptrace__speed-val")
      speedVal.textContent = fmtSpeed(state.speed)
      speedInput.addEventListener("input", () => {
        applySpeed(speedInput.value)
        speedVal.textContent = fmtSpeed(speedInput.value)
        speedInput.setAttribute("aria-valuetext", fmtSpeed(speedInput.value))
      })
      speedControl.append(speedInput)
      speedRow.append(speedVal)
    }
    speedSection.append(speedHead, speedRow)
    menu.append(speedSection)
    applySpeed(state.speed)
    let endpointSection = null
    let startHead = null
    let startMenu = null
    let targetHead = null
    let targetMenu = null
    if (kind === "sort" && state.algorithm !== "bucket-sort" && state.algorithm !== "cyclic-sort") {
      const section = el("div", "steptrace__menu-section")
      const h = el("div", "steptrace__menu-h")
      h.textContent = "Array"
      const item = el("button", "steptrace__menu-item")
      item.type = "button"
      item.textContent = "Shuffle"
      item.addEventListener("click", () => {
        state.array = randomArray()
        build() // menu stays open so the reader can reshuffle repeatedly
      })
      section.append(h, item)
      menu.append(section)
    } else if (kind === "graph") {
      endpointSection = el("div", "steptrace__menu-section")
      startHead = el("div", "steptrace__menu-h")
      startHead.textContent = "Start node"
      startMenu = el("select", "steptrace__select")
      startMenu.setAttribute("aria-label", "Start node")
      startMenu.addEventListener("change", () => {
        state.start = startMenu.value
        if (targetMenu && state.target === state.start) {
          const fallback = [...targetMenu.options].find((option) => option.value !== state.start)
          if (fallback) {
            state.target = fallback.value
            targetMenu.value = fallback.value
          }
        }
        closeMenu()
        build()
      })
      targetHead = el("div", "steptrace__menu-h")
      targetHead.textContent = "Target node"
      targetMenu = el("select", "steptrace__select")
      targetMenu.setAttribute("aria-label", "Target node")
      targetMenu.addEventListener("change", () => {
        state.target = targetMenu.value
        if (state.target === state.start) {
          const fallback = [...startMenu.options].find((option) => option.value !== state.target)
          if (fallback) {
            state.start = fallback.value
            startMenu.value = fallback.value
          }
        }
        closeMenu()
        build()
      })
      endpointSection.append(startHead, startMenu, targetHead, targetMenu)
      menu.append(endpointSection)
    } else if (kind === "search") {
      const section = el("div", "steptrace__menu-section")
      const h = el("div", "steptrace__menu-h")
      h.textContent = "Target"
      const sel = el("select", "steptrace__select")
      sel.setAttribute("aria-label", "Search target")
      const seen = new Set()
      for (const v of state.array) {
        if (seen.has(v)) continue
        seen.add(v)
        const opt = el("option")
        opt.value = String(v)
        opt.textContent = String(v)
        if (Number(v) === Number(state.config.target)) opt.selected = true
        sel.append(opt)
      }
      sel.value = String(state.config.target)
      sel.addEventListener("change", () => {
        state.config.target = Number(sel.value)
        closeMenu()
        build()
      })
      section.append(h, sel)
      menu.append(section)
    }
    menuWrap.append(btnMenu, menu)

    const transport = el("div", "steptrace__transport")
    transport.append(btnReset, btnBack, btnPlay, btnFwd)
    const utility = el("div", "steptrace__utility")
    utility.append(speedIndicator, menuWrap)
    foot.append(phase, transport, timeline, utility)

    root.replaceChildren(head, body, foot)

    let layoutMode = "unknown"
    let compactPanel: "trace" | "watch" | null = null
    let hostTabsHandle: HostTabsHandle | null = null
    let hasWatch = false
    let destroyed = false
    let visible = true
    let wasPlaying = false
    let railAnimationFrame: number | null = null
    let railAnimationTimer: ReturnType<typeof setTimeout> | null = null

    function clearRailAnimation() {
      if (railAnimationFrame != null) cancelAnimationFrame(railAnimationFrame)
      if (railAnimationTimer != null) clearTimeout(railAnimationTimer)
      railAnimationFrame = null
      railAnimationTimer = null
      railRegion.classList.remove("steptrace__rail-region--animating")
      railRegion.style.removeProperty("height")
    }

    function railAnimationDuration() {
      const value = getComputedStyle(railRegion)
        .getPropertyValue("--steptrace-tab-animation-duration")
        .trim()
      const duration = parseFloat(value)
      if (!Number.isFinite(duration)) return 0
      return value.endsWith("ms") ? duration : value.endsWith("s") ? duration * 1000 : 0
    }

    function animateRail(render: () => void) {
      const oldHeight = railRegion.getBoundingClientRect().height
      clearRailAnimation()
      render()
      const targetHeight = railRegion.getBoundingClientRect().height
      if (oldHeight === targetHeight) return
      railRegion.style.setProperty("height", `${oldHeight}px`)
      railRegion.classList.add("steptrace__rail-region--animating")
      railAnimationFrame = requestAnimationFrame(() => {
        railAnimationFrame = null
        railRegion.style.setProperty("height", `${targetHeight}px`)
        railAnimationTimer = setTimeout(clearRailAnimation, railAnimationDuration() + 50)
      })
    }

    function destroyHostTabs() {
      if (!hostTabsHandle) return
      compactPanel = hostTabsHandle.selection as "trace" | "watch" | null
      hostTabsHandle.destroy()
      hostTabsHandle = null
    }

    function ensureHostTabs() {
      if (!hasHostTabs || hostTabsHandle || layoutMode !== "compact") return
      hostTabsHandle = host.mountTabs!(railRegion, {
        label: "Trace and watch",
        selection: compactPanel,
        tabs: [
          { id: "trace", label: "Trace", panel: traceWrap },
          { id: "watch", label: "Watch", panel: watchWrap },
        ],
        onSelectionChange(selection) {
          compactPanel = selection === "trace" || selection === "watch" ? selection : null
          refitCompactTrace()
        },
      })
      hostTabsHandle.setAvailable("watch", hasWatch)
    }

    function renderRailMode(previousMode = layoutMode, animate = false) {
      const compact = layoutMode === "compact"
      const active = document.activeElement

      if (hasHostTabs) {
        const restoreFocus =
          previousMode === "compact" &&
          !compact &&
          active &&
          railRegion.contains(active) &&
          !traceWrap.contains(active) &&
          !watchWrap.contains(active)
        if (compact) ensureHostTabs()
        else destroyHostTabs()
        hostTabsHandle?.setAvailable("watch", hasWatch)
        traceWrap.hidden = compact ? compactPanel !== "trace" : false
        watchWrap.hidden = compact ? !hasWatch || compactPanel !== "watch" : !hasWatch
        if (restoreFocus) scrub.focus()
        refitCompactTrace()
        return
      }

      if (
        previousMode === "compact" &&
        layoutMode === "wide" &&
        active &&
        detailSwitch.contains(active)
      ) {
        scrub.focus()
      }
      if (previousMode === "wide" && compact && active && railRegion.contains(active)) {
        ;(compactPanel === "watch" && hasWatch ? watchButton : traceButton).focus()
      }

      const render = () => {
        detailSwitch.hidden = !compact
        traceButton.setAttribute("aria-pressed", String(compact && compactPanel === "trace"))
        watchButton.setAttribute("aria-pressed", String(compact && compactPanel === "watch"))
        traceWrap.hidden = compact && compactPanel !== "trace"
        watchWrap.hidden = compact ? !hasWatch || compactPanel !== "watch" : !hasWatch
        refitCompactTrace()
      }
      if (animate) animateRail(render)
      else {
        clearRailAnimation()
        render()
      }
    }

    function syncCompactLayout(inlineSize) {
      if (!(inlineSize > 0)) return
      const nextMode = inlineSize < COMPACT_INLINE_SIZE ? "compact" : "wide"
      if (nextMode === layoutMode) return
      const previousMode = layoutMode
      layoutMode = nextMode
      root.classList.toggle("steptrace--narrow", nextMode === "compact")
      renderRailMode(previousMode, previousMode !== "unknown")
    }

    function refitCompactTrace() {
      if (!player || layoutMode !== "compact" || compactPanel !== "trace") return
      sizeRail()
      renderRail()
    }

    traceButton.addEventListener("click", () => {
      compactPanel = compactPanel === "trace" ? null : "trace"
      renderRailMode(layoutMode, true)
    })
    watchButton.addEventListener("click", () => {
      if (!hasWatch) return
      compactPanel = compactPanel === "watch" ? null : "watch"
      renderRailMode(layoutMode, true)
    })

    syncCompactLayout(root.getBoundingClientRect().width)

    // --- kebab open/close ---
    let menuOpen = false
    function closeMenu() {
      menuOpen = false
      menu.classList.remove("steptrace__menu--open")
      btnMenu.setAttribute("aria-expanded", "false")
    }
    btnMenu.addEventListener("click", (e) => {
      e.stopPropagation()
      menuOpen = !menuOpen
      menu.classList.toggle("steptrace__menu--open", menuOpen)
      btnMenu.setAttribute("aria-expanded", menuOpen ? "true" : "false")
    })
    menu.addEventListener("click", (e) => e.stopPropagation())
    const onDocClick = () => closeMenu()
    document.addEventListener("click", onDocClick)

    // Reserve enough log space for two history lines plus whichever is taller: the
    // tallest frame message, or the RESULT box that replaces it on the terminal
    // frame. The log can then grow into every pixel the content-sized WATCH block
    // leaves available. Probes are absolutely positioned so they do not affect
    // flow, and all are appended before the first height read so the browser can
    // resolve them in one layout pass.
    function sizeRail() {
      if (!player) return
      if (layoutMode === "compact") {
        const logCS = getComputedStyle(log)
        const lineHeight = parseFloat(logCS.lineHeight) || 0
        const gap = parseFloat(logCS.rowGap) || 0
        const height = Math.ceil(lineHeight * 3 + gap * 2) + "px"
        log.style.height = height
        log.style.minHeight = height
        return
      }
      // sub-pixel heights throughout: offsetHeight rounds, and rounding two history
      // rows down is enough to clip the top line by a pixel.
      const tall = (node) => node.getBoundingClientRect().height
      const probes = player.frames.map((frame) => {
        const probe = el(
          "li",
          "steptrace__log-line steptrace__log-line--cur steptrace__measure-probe",
        )
        const number = el("span", "steptrace__log-num")
        number.textContent = "00"
        const text = el("span", "steptrace__log-text")
        text.textContent = stripTags(frame.message)
        probe.append(number, text)
        return probe
      })
      const resultProbe = insight.cloneNode(true)
      resultProbe.hidden = false
      resultProbe.classList.add("steptrace__measure-probe")
      log.append(...probes, resultProbe)
      let maxRow = tall(resultProbe)
      for (const probe of probes) maxRow = Math.max(maxRow, tall(probe))
      for (const probe of probes) probe.remove()
      resultProbe.remove()
      const logCS = getComputedStyle(log)
      const gap = parseFloat(logCS.rowGap) || 0
      // History rows now hug their message, so reserve their two-line ceiling
      // rather than measuring whatever the current step happens to render.
      const hist = (parseFloat(logCS.lineHeight) || 0) * 2
      const h = Math.ceil(hist * 2 + gap * 2 + maxRow) + "px"
      log.style.height = "auto"
      if (log.style.minHeight !== h) log.style.minHeight = h
    }
    // Walk the rendered rows bottom-up and keep only those that fit whole inside
    // the log's pinned height — a step half-cut by the overflow reads as a bug.
    // Older rows are already hidden by the loop above once they run out of frames.
    function fitLog(terminal) {
      const logCS = getComputedStyle(log)
      const gap = parseFloat(logCS.rowGap) || 0
      let budget = log.clientHeight
      if (layoutMode === "compact") {
        const lineHeight = parseFloat(logCS.lineHeight) || 0
        let rowChrome = 0
        if (terminal) {
          const resultCS = getComputedStyle(insight)
          rowChrome = [
            resultCS.paddingTop,
            resultCS.paddingBottom,
            resultCS.borderTopWidth,
            resultCS.borderBottomWidth,
          ].reduce((sum, value) => sum + (parseFloat(value) || 0), 0)
        }
        budget = Math.ceil(lineHeight * 3 + gap * 2 + rowChrome)
        const height = budget + "px"
        log.style.height = height
        log.style.minHeight = height
      }
      if (!budget) return
      let used = terminal ? insight.getBoundingClientRect().height : 0
      let rows = terminal ? 1 : 0
      let full = false
      for (let k = LOG_ROWS - 1; k >= 0; k--) {
        const line = logLines[k].line
        if (line.hidden) continue
        if (full || (layoutMode === "compact" && rows >= 3)) {
          line.hidden = true
          continue
        }
        const h = line.getBoundingClientRect().height
        const need = used ? used + gap + h : h
        // sub-pixel slack: heights and the budget round differently. The live step
        // is the bottom row and always stays, even if it alone overruns the budget.
        if (!used || need <= budget + 0.5) {
          used = need
          rows++
        } else {
          // stop at the first row that will not fit: skipping it to squeeze in an
          // older, shorter one would leave a hole in the step sequence
          line.hidden = true
          full = true
        }
      }
    }
    // a width change re-wraps the messages, so the log is re-pinned and the rows
    // re-fitted against the new height
    const onRailResize = (entries = []) => {
      const rootEntry = entries.find((entry) => entry.target === root)
      if (rootEntry) {
        const borderBox = Array.isArray(rootEntry.borderBoxSize)
          ? rootEntry.borderBoxSize[0]
          : rootEntry.borderBoxSize
        syncCompactLayout(borderBox?.inlineSize ?? rootEntry.contentRect.width)
      }
      sizeRail()
      if (player) renderRail()
    }
    const railRO = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onRailResize) : null
    if (railRO) {
      railRO.observe(root)
      railRO.observe(rail)
    }
    document.fonts?.ready.then(() => {
      if (!destroyed) onRailResize()
    })

    // --- rail TRACE log + counter + scrubber, refreshed every render ---
    let lastRailI = null
    function renderRail() {
      const total = player.frames.length
      const i = player.i
      const terminal = i === total - 1
      // the bottom row is the live step, or RESULT once the algorithm has settled
      insight.hidden = !terminal
      insight.setAttribute("aria-live", terminal && !player.playing ? "polite" : "off")
      for (let k = 0; k < LOG_ROWS; k++) {
        const ll = logLines[k]
        const fi = i - (LOG_ROWS - 1 - k)
        const cur = fi === i
        if (fi < 0 || fi >= total || (cur && terminal)) {
          ll.line.hidden = true
          ll.num.textContent = ""
          ll.txt.textContent = ""
          ll.line.classList.remove("steptrace__log-line--cur")
          continue
        }
        ll.line.hidden = false
        ll.num.textContent = pad2(fi + 1)
        ll.txt.textContent = stripTags(player.frames[fi].message)
        ll.line.classList.toggle("steptrace__log-line--cur", cur)
        if (cur) ll.line.style.removeProperty("--_history-opacity")
        else ll.line.style.setProperty("--_history-opacity", String(fadeFor(i - fi)))
      }
      fitLog(terminal)
      // brief scroll between steps: the block eases in from a small offset in the
      // travel direction (forward ⇒ rises up, back ⇒ drops down). transform-only,
      // so it never triggers layout and can't add footer jitter.
      const dir = lastRailI == null ? 0 : Math.sign(i - lastRailI)
      lastRailI = i
      if (dir !== 0) {
        log.classList.remove("steptrace__log--moving")
        log.dataset.motionDirection = dir > 0 ? "forward" : "backward"
        void log.offsetHeight // register the start offset before animating home
        log.classList.add("steptrace__log--moving")
      }
      const chapter = milestoneAt(currentMilestones, i)
      phaseName.textContent = chapter ? chapter.label : "Step"
      const currentFrame = player.frames[i]
      phaseCopy.textContent =
        state.algorithm === "rabin-karp" && currentFrame.type === "hash"
          ? ""
          : stripTags(currentFrame.message)
      scrub.setAttribute("aria-valuetext", `${phaseName.textContent}, step ${i + 1} of ${total}`)
      for (let k = 0; k < milestoneLayer.children.length; k++) {
        const step = Number(milestoneLayer.children[k].dataset.step)
        milestoneLayer.children[k].dataset.passed = step <= i ? "1" : "0"
      }
    }

    function renderMilestones() {
      milestoneLayer.replaceChildren()
      const last = Math.max(1, player.frames.length - 1)
      const marks = thinMilestones(currentMilestones)
      for (const [index, mark] of marks.entries()) {
        const start = (mark.i / last) * 100
        const end = marks[index + 1] ? (marks[index + 1].i / last) * 100 : 100
        const tick = el("span", "steptrace__milestone")
        tick.style.setProperty("--start", `${start}%`)
        tick.style.setProperty("--end", `${end}%`)
        tick.dataset.step = String(mark.i)
        tick.title = `${mark.label} · step ${mark.i + 1}`
        tick.setAttribute("aria-hidden", "true")
        const label = el("b", "steptrace__milestone-label")
        label.textContent = mark.label
        tick.append(label)
        milestoneLayer.append(tick)
      }
    }
    function onState() {
      const total = player.frames.length
      const i = player.i
      counter.innerHTML = `<b>${pad2(i + 1)}</b> / ${pad2(total)}`
      const pct = total <= 1 ? 0 : (i / (total - 1)) * 100
      scrubFill.style.width = pct + "%"
      scrubDot.style.left = pct + "%"
      scrub.setAttribute("aria-valuemin", "0")
      scrub.setAttribute("aria-valuemax", String(total - 1))
      scrub.setAttribute("aria-valuenow", String(i))
      btnPlay.innerHTML = player.playing ? ICON.pause : ICON.play
      btnPlay.setAttribute("aria-label", player.playing ? "Pause" : "Play")
      btnPlay.title = player.playing ? "Pause" : "Play"
      btnBack.disabled = i === 0
      btnFwd.disabled = i === total - 1
      renderRail()
      renderWatch()
    }
    function renderWatch() {
      const rows =
        currentView && currentView.watch ? currentView.watch(player.frames[player.i]) : null
      watchEl.replaceChildren()
      if (!rows || !rows.length) return
      for (const [index, r] of rows.entries()) {
        const row = el("div", "steptrace__watch-row")
        const hintId = `${watchHintPrefix}-${index}`
        const hint = el("span", "steptrace__watch-hint")
        hint.id = hintId
        hint.setAttribute("role", "tooltip")
        hint.textContent = watchHintFor(r)
        row.tabIndex = 0
        row.setAttribute("role", "group")
        row.setAttribute("aria-label", `${r.k}: ${String(r.v)}`)
        row.setAttribute("aria-describedby", hintId)
        if (r.sw) {
          const sw = el("span", "steptrace__watch-sw")
          sw.style.setProperty("--_watch-color", r.sw)
          row.append(sw)
        }
        const kk = el("span", "steptrace__watch-k")
        kk.textContent = r.k
        const vv = el("span", "steptrace__watch-v")
        vv.textContent = r.v
        row.append(kk, vv, hint)
        watchEl.append(row)
      }
    }

    // --- scrubber seek (click + drag + keyboard) ---
    function seekFromEvent(e) {
      const r = scrub.getBoundingClientRect()
      const cx =
        e.clientX != null ? e.clientX : e.touches && e.touches[0] ? e.touches[0].clientX : r.left
      const frac = r.width ? Math.max(0, Math.min(1, (cx - r.left) / r.width)) : 0
      player.seek(Math.round(frac * (player.frames.length - 1)))
    }
    let dragging = false
    scrub.addEventListener("pointerdown", (e) => {
      dragging = true
      try {
        scrub.setPointerCapture(e.pointerId)
      } catch (_) {}
      seekFromEvent(e)
    })
    scrub.addEventListener("pointermove", (e) => {
      if (dragging) seekFromEvent(e)
    })
    const endDrag = () => {
      dragging = false
    }
    scrub.addEventListener("pointerup", endDrag)
    scrub.addEventListener("pointercancel", endDrag)
    scrub.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") player.stepF()
      else if (e.key === "ArrowLeft") player.stepB()
      else if (e.key === "Home") player.seek(0)
      else if (e.key === "End") player.seek(player.frames.length - 1)
      else return
      e.preventDefault()
      e.stopPropagation()
    })

    function build() {
      if (player) player.destroy()
      if (currentView && currentView.destroy) currentView.destroy()
      const built = buildFrames({
        ...state.config,
        algorithm: state.algorithm,
        ...(shouldIncludeArray ? { array: state.array } : {}),
        start: state.start,
        ...(kind === "graph" && state.target != null ? { target: state.target } : {}),
      })
      if (built.family) root.dataset.visualFamily = built.family.id
      else delete root.dataset.visualFamily
      if (built.legacyRenderer) root.dataset.legacyRenderer = built.legacyRenderer
      else delete root.dataset.legacyRenderer
      root.classList.toggle("steptrace--backtrack", built.kind === "backtrack")
      currentGraph = built.graph || null
      currentMilestones = buildMilestones(state.algorithm, built.kind, built.frames)
      let view
      if (built.family) view = built.family.createView(built.frames, built)
      else if (built.kind === "graph")
        view = makeGraphView(built.frames, built.graph, built.frontierLabel)
      else if (built.kind === "search") view = makeSearchView(built.frames)
      else if (built.kind === "string") view = makeMatchView(built.frames)
      else if (built.kind === "pointers") view = makePointerView(built.frames)
      else if (built.kind === "dp") view = makeDPView(built.frames)
      else if (built.kind === "unionfind") view = makeUnionFindView(built.frames)
      else if (built.kind === "bits") view = makeBitsView(built.frames)
      else if (built.kind === "backtrack") view = makeBacktrackView(built.frames)
      else if (built.kind === "rectree") view = makeRecTreeView(built.frames)
      else view = makeSortView(built.frames)
      currentView = view
      if (built.kind === "graph") syncEndpointOptions(built.endpointSettings, built.graph)
      const fillStage = view.stageLayout === "fill"
      const stageAlignment =
        fillStage || built.kind === "graph" ? null : view.stageAlignment || "center"
      root.classList.toggle("steptrace--stable-stage", view.stableStage === true)
      root.classList.toggle(
        "steptrace--compact-stage",
        built.family
          ? [
              "indexed-pointer-window",
              "monotone-boundary",
              "prefix-sum",
              "stack-sequence",
              "string-match",
            ].includes(built.family.id)
          : ["bits", "pointers", "string"].includes(built.kind),
      )
      stageCol.classList.toggle("steptrace__stage-col--bottom", stageAlignment === "bottom")
      stageCol.classList.toggle("steptrace__stage-col--center", stageAlignment === "center")
      stageCol.classList.toggle("steptrace__stage-col--graph", built.kind === "graph")
      stageCol.classList.toggle("steptrace__stage-col--fill", fillStage)
      // The view's LAST node is its own one-line status; the rail TRACE log
      // replaces it, so we keep it out of the DOM (paint still writes to it
      // harmlessly). Everything before it is the actual visualization.
      const nodes = view.nodes.slice(0, -1)
      const stageLegend = nodes.at(-1)
      stageCol.classList.toggle(
        "steptrace__stage-col--legend",
        Boolean(
          stageLegend?.classList.contains("steptrace__legend") ||
          stageLegend?.classList.contains("steptrace__legend-wrap"),
        ),
      )
      stageCol.replaceChildren(...nodes)
      player = new Player(built.frames, view.paint, state.speed)
      player.onState = onState
      // RESULT reads the terminal frame, which this build already fixed, so its
      // text is set once here — sizeRail() needs it to measure the slot.
      const terminalFrame = built.frames[built.frames.length - 1]
      insightText.textContent = view.summary
        ? view.summary(terminalFrame)
        : summaryFor(state.algorithm, built.kind, terminalFrame, currentGraph)
      reserveWatch(built.frames, view)
      renderMilestones()
      sizeRail()
      player.render()
      onState()
    }

    // WATCH row counts can differ between frames; reserve the tallest so the rail
    // does not resize when a view reports fewer rows on some step.
    function reserveWatch(frames, view) {
      let maxRows = 0
      if (view.watch) {
        for (const f of frames) {
          const rows = view.watch(f)
          if (rows && rows.length > maxRows) maxRows = rows.length
        }
      }
      hasWatch = maxRows > 0
      if (!hasWatch && compactPanel === "watch") compactPanel = null
      if (!hasHostTabs) {
        detailSwitch.replaceChildren(traceButton, ...(hasWatch ? [watchButton] : []))
      }
      watchEl.style.setProperty("--steptrace-watch-rows", String(maxRows))
      renderRailMode()
    }

    function syncEndpointOptions(settings, graph) {
      if (!endpointSection || !startMenu || !targetMenu || !startHead || !targetHead) return
      const options =
        settings?.options || graph?.nodes?.map((node) => ({ value: node.id, label: node.id }))
      if (!options?.length) {
        endpointSection.hidden = true
        return
      }
      endpointSection.hidden = false
      startHead.textContent = settings?.startLabel || "Start node"
      startMenu.setAttribute("aria-label", startHead.textContent)
      targetHead.hidden = !settings
      targetMenu.hidden = !settings
      const signature = options.map((option) => `${option.value}:${option.label}`).join("|")
      if (startMenu.dataset.signature !== signature) {
        startMenu.replaceChildren()
        targetMenu.replaceChildren()
        for (const option of options) {
          const startOption = el("option")
          startOption.value = option.value
          startOption.textContent = option.label
          startMenu.append(startOption)
          const targetOption = startOption.cloneNode(true)
          targetMenu.append(targetOption)
        }
        startMenu.dataset.signature = signature
      }
      const nextStart = settings?.start || graph?.start || options[0].value
      const nextTarget = settings?.target || state.target
      state.start = nextStart
      startMenu.value = nextStart
      if (settings && nextTarget) {
        state.target = nextTarget
        targetHead.textContent = settings.targetLabel
        targetMenu.setAttribute("aria-label", settings.targetLabel)
        targetMenu.value = nextTarget
      }
    }

    build()

    // --- transport wiring ---
    btnReset.addEventListener("click", () => player.reset())
    btnBack.addEventListener("click", () => player.stepB())
    btnPlay.addEventListener("click", () => player.toggle())
    btnFwd.addEventListener("click", () => player.stepF())

    // keyboard: arrows step, space toggles — only when focus is inside the widget
    // and not on a form control; stopPropagation so host editors don't double-fire.
    const onKey = (e) => {
      if (["button", "input", "select", "textarea"].includes(e.target?.tagName?.toLowerCase()))
        return
      if (e.target === scrub) return
      if (e.key === "ArrowRight") player.stepF()
      else if (e.key === "ArrowLeft") player.stepB()
      else if (e.key === " " || e.key === "Spacebar") player.toggle()
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    root.addEventListener("keydown", onKey)

    applyMotion()

    return {
      pause() {
        if (player) player.pause()
      },
      setVisible(nextVisible) {
        if (destroyed || visible === nextVisible) return
        visible = nextVisible
        if (!nextVisible) {
          wasPlaying = Boolean(player?.playing)
          player?.pause()
        } else if (wasPlaying) {
          wasPlaying = false
          player?.play()
        }
      },
      destroy() {
        destroyed = true
        clearRailAnimation()
        destroyHostTabs()
        if (player) player.destroy()
        if (currentView && currentView.destroy) currentView.destroy()
        if (speedControlHandle && speedControlHandle.destroy) speedControlHandle.destroy()
        if (railRO) railRO.disconnect()
        mq.removeEventListener("change", applyMotion)
        root.removeEventListener("keydown", onKey)
        document.removeEventListener("click", onDocClick)
        root.replaceChildren()
        root.classList.remove(
          "steptrace",
          "steptrace--reduced",
          "steptrace--stable-stage",
          "steptrace--compact-stage",
          "steptrace--narrow",
          "steptrace--backtrack",
        )
      },
    }
  }

  function mount(
    root: HTMLElement,
    config: StepTraceConfig,
    host: StepTraceHost = {},
  ): MountHandle {
    const panels: HTMLElement[] = []
    for (
      let panel = root.closest<HTMLElement>(".tabsdown__panel");
      panel;
      panel = panel.parentElement?.closest<HTMLElement>(".tabsdown__panel") ?? null
    ) {
      panels.push(panel)
    }
    if (!panels.length || typeof MutationObserver === "undefined") {
      return mountNow(root, config, host)
    }

    let child: MountHandle | null = null
    let destroyed = false
    let visible = panels.every((panel) => !panel.hidden)
    const syncVisibility = () => {
      if (destroyed) return
      const nextVisible = panels.every((panel) => !panel.hidden)
      if (nextVisible && !child) child = mountNow(root, config, host)
      if (nextVisible !== visible) child?.setVisible?.(nextVisible)
      visible = nextVisible
    }
    const observer = new MutationObserver(syncVisibility)
    panels.forEach((panel) =>
      observer.observe(panel, { attributes: true, attributeFilter: ["hidden"] }),
    )
    if (visible) child = mountNow(root, config, host)

    return {
      pause() {
        child?.pause?.()
      },
      setVisible(nextVisible) {
        child?.setVisible?.(nextVisible)
      },
      destroy() {
        destroyed = true
        observer.disconnect()
        child?.destroy()
        if (!child) root.replaceChildren()
      },
    }
  }

  return mount
}

// randomArray lives in the host layer (mount), never the pure engine, so
// buildFrames stays deterministic. Distinct-ish heights 5..62.
function randomArray(n = 12) {
  const pool = []
  for (let v = 5; v <= 62; v++) pool.push(v)
  for (let k = pool.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1))
    ;[pool[k], pool[r]] = [pool[r], pool[k]]
  }
  return pool.slice(0, n)
}
