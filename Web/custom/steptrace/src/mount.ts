import { Player } from "./player"
import {
  ICON,
  buildMilestones,
  button,
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
  spacer,
  stripTags,
  summaryFor,
  thinMilestones,
} from "./render"
import type { RegistryApi } from "./registry"
import type { MountHandle, StepTraceBlockConfig, StepTraceHost, StepTraceTabsConfig } from "./types"
import { isTabsConfig, normalizeTabsConfig } from "./tabs"
import { watchHintFor } from "./watch-hints"

const LOG_ROWS = 10
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
) {
  const { kindOf, listAlgorithms, buildFrames } = registry
  function mountTabs(
    root: HTMLElement,
    config: StepTraceTabsConfig,
    host: StepTraceHost = {},
  ): MountHandle {
    let normalized
    try {
      normalized = normalizeTabsConfig(config)
    } catch (error) {
      root.textContent = error instanceof Error ? error.message : String(error)
      return { destroy: () => root.replaceChildren() }
    }
    const { tabs } = normalized

    root.classList.add("steptrace", "steptrace--tabs")
    root.setAttribute("role", "group")
    root.setAttribute("aria-label", "Tabbed algorithm visualizer")

    const tabsShell = el("div", "steptrace__tabs-shell")
    const tablist = el("div", "steptrace__tabs")
    tablist.setAttribute("role", "tablist")
    tablist.setAttribute("aria-label", "Visualization variants")
    const tabDesc = el("div", "steptrace__tabs-desc")
    tabDesc.setAttribute("aria-live", "polite")
    const panels = el("div", "steptrace__tabpanels")

    const buttons: HTMLButtonElement[] = []
    const panelShells: HTMLElement[] = []
    const panelMounts: HTMLElement[] = []
    const handles: Array<MountHandle | null> = tabs.map(() => null)
    let activeIndex = normalized.selected

    const showTab = (index: number, focus = false) => {
      const next = Math.min(Math.max(index, 0), tabs.length - 1)
      if (next === activeIndex && handles[next]) {
        if (focus) buttons[next]?.focus()
        return
      }
      handles[activeIndex]?.pause?.()
      activeIndex = next
      const tab = tabs[next]
      tabDesc.textContent = tab.description || ""
      buttons.forEach((button, i) => {
        const selected = i === next
        button.setAttribute("aria-selected", String(selected))
        button.tabIndex = selected ? 0 : -1
        button.classList.toggle("steptrace__tab--selected", selected)
        panelShells[i].hidden = !selected
      })
      if (!handles[next]) handles[next] = mount(panelMounts[next], tab.config, host)
      if (focus) buttons[next]?.focus()
    }

    tabs.forEach((tab, index) => {
      const tabId = `steptrace-tab-${++mountSerial}`
      const panelId = `steptrace-panel-${++mountSerial}`
      const button = document.createElement("button")
      button.type = "button"
      button.className = "steptrace__tab"
      button.id = tabId
      button.setAttribute("role", "tab")
      button.setAttribute("aria-controls", panelId)
      button.textContent = tab.name
      button.tabIndex = index === activeIndex ? 0 : -1
      button.addEventListener("click", () => showTab(index))
      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault()
          showTab((index - 1 + tabs.length) % tabs.length, true)
        } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault()
          showTab((index + 1) % tabs.length, true)
        } else if (event.key === "Home") {
          event.preventDefault()
          showTab(0, true)
        } else if (event.key === "End") {
          event.preventDefault()
          showTab(tabs.length - 1, true)
        }
      })
      buttons.push(button)
      tablist.append(button)

      const panelShell = el("div", "steptrace__tabpanel")
      panelShell.id = panelId
      panelShell.hidden = index !== activeIndex
      panelShell.setAttribute("role", "tabpanel")
      panelShell.setAttribute("aria-labelledby", tabId)
      const panelMount = el("div", "steptrace__tabpanel-body")
      panelShell.append(panelMount)
      panelShells.push(panelShell)
      panelMounts.push(panelMount)
      panels.append(panelShell)
    })

    tabsShell.append(tablist, tabDesc)
    root.replaceChildren(tabsShell, panels)
    activeIndex = -1
    showTab(normalized.selected)

    return {
      destroy() {
        for (const handle of handles) handle?.destroy()
        root.replaceChildren()
        root.classList.remove("steptrace", "steptrace--tabs", "steptrace--reduced")
      },
    }
  }

  function mount(
    root: HTMLElement,
    config: StepTraceBlockConfig,
    host: StepTraceHost = {},
  ): MountHandle {
    if (isTabsConfig(config)) return mountTabs(root, config, host)
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
      config,
    }

    let player = null
    let currentView = null
    let currentGraph = null
    let currentMilestones = []
    let speedControlHandle = null

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
    insight.append(insightLabel, insightText)
    log.append(insight)
    traceWrap.append(traceLabel, log)

    const watchWrap = el("div", "steptrace__watch-wrap")
    const watchLabel = el("div", "steptrace__rail-label")
    watchLabel.textContent = "Watch"
    const watchEl = el("div", "steptrace__watch")
    watchWrap.append(watchLabel, watchEl)
    watchWrap.hidden = true
    rail.append(traceWrap, watchWrap)
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
    const phaseStep = el("span")
    phase.append(phaseName, phaseStep)

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
    const speedSection = el("div", "steptrace__menu-section")
    const speedRow = el("div", "steptrace__speed-row")
    const speedControl = el("div", "steptrace__speed-control")
    speedRow.append(speedControl)
    const fmtSpeed = (v) => Number(v).toFixed(2) + "×" // fixed width: "1.50×", never resizes the menu
    const applySpeed = (value) => {
      const v = Number(value)
      state.speed = v
      // transitions must fit inside the step interval (baseDelay / speed), else
      // 2× bleeds each animation into the next frame and 0.5× freezes mid-step.
      // 107 keeps the same share of the interval the 320/780 pairing had.
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
    let startMenu = null
    if (kind === "sort") {
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
      const section = el("div", "steptrace__menu-section")
      const h = el("div", "steptrace__menu-h")
      h.textContent = "Start node"
      startMenu = el("select", "steptrace__select")
      startMenu.setAttribute("aria-label", "Start node")
      startMenu.addEventListener("change", () => {
        state.start = startMenu.value
        closeMenu()
        build()
      })
      section.append(h, startMenu)
      menu.append(section)
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
    transport.append(btnReset, btnBack, btnPlay, btnFwd, spacer(), menuWrap)
    foot.append(scrub, phase, transport)

    root.replaceChildren(head, body, foot)

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
      if (matchMedia("(max-width: 560px)").matches) {
        log.style.height = "auto"
        log.style.minHeight = "0"
        return
      }
      // sub-pixel heights throughout: offsetHeight rounds, and rounding two history
      // rows down is enough to clip the top line by a pixel.
      const PROBE =
        "position:absolute;visibility:hidden;pointer-events:none;left:0;right:0;height:auto"
      const tall = (node) => node.getBoundingClientRect().height
      const probes = player.frames.map((frame) => {
        const probe = el("li", "steptrace__log-line steptrace__log-line--cur")
        probe.style.cssText = PROBE
        const number = el("span", "steptrace__log-num")
        number.textContent = "00"
        const text = el("span", "steptrace__log-text")
        text.textContent = stripTags(frame.message)
        probe.append(number, text)
        return probe
      })
      const resultProbe = insight.cloneNode(true)
      resultProbe.hidden = false
      resultProbe.style.cssText = PROBE
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
      const budget = log.clientHeight
      if (!budget) return
      const gap = parseFloat(getComputedStyle(log).rowGap) || 0
      let used = terminal ? insight.getBoundingClientRect().height : 0
      let full = false
      for (let k = LOG_ROWS - 1; k >= 0; k--) {
        const line = logLines[k].line
        if (line.hidden) continue
        if (full) {
          line.hidden = true
          continue
        }
        const h = line.getBoundingClientRect().height
        const need = used ? used + gap + h : h
        // sub-pixel slack: heights and the budget round differently. The live step
        // is the bottom row and always stays, even if it alone overruns the budget.
        if (!used || need <= budget + 0.5) {
          used = need
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
    const onRailResize = () => {
      sizeRail()
      if (player) renderRail()
    }
    const logRO = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onRailResize) : null
    if (logRO) logRO.observe(rail)

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
        ll.line.style.opacity = cur ? "" : String(fadeFor(i - fi))
      }
      fitLog(terminal)
      // brief scroll between steps: the block eases in from a small offset in the
      // travel direction (forward ⇒ rises up, back ⇒ drops down). transform-only,
      // so it never triggers layout and can't add footer jitter.
      const dir = lastRailI == null ? 0 : Math.sign(i - lastRailI)
      lastRailI = i
      if (dir !== 0) {
        log.style.transition = "none"
        log.style.transform = `translateY(${dir > 0 ? "0.55rem" : "-0.55rem"})`
        void log.offsetHeight // register the start offset before animating home
        log.style.transition = "transform 0.26s var(--_spring)"
        log.style.transform = "translateY(0)"
      }
      const chapter = milestoneAt(currentMilestones, i)
      phaseName.textContent = chapter ? chapter.label : "Step"
      phaseStep.textContent = `${i + 1} / ${total}`
      scrub.setAttribute("aria-valuetext", `${phaseName.textContent}, step ${i + 1} of ${total}`)
      for (let k = 0; k < milestoneLayer.children.length; k++) {
        const step = Number(milestoneLayer.children[k].dataset.step)
        milestoneLayer.children[k].dataset.passed = step <= i ? "1" : "0"
      }
    }

    function renderMilestones() {
      milestoneLayer.replaceChildren()
      const last = Math.max(1, player.frames.length - 1)
      for (const mark of thinMilestones(currentMilestones)) {
        const tick = el("span", "steptrace__milestone")
        tick.style.left = (mark.i / last) * 100 + "%"
        tick.dataset.step = String(mark.i)
        tick.title = `${mark.label} · step ${mark.i + 1}`
        tick.setAttribute("aria-hidden", "true")
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
          sw.style.background = r.sw
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
      })
      if (built.family) root.dataset.visualFamily = built.family.id
      else delete root.dataset.visualFamily
      currentGraph = built.graph || null
      currentMilestones = buildMilestones(state.algorithm, built.kind, built.frames)
      let view
      if (built.family) view = built.family.createView(built.frames)
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
      if (built.kind === "graph") syncStartOptions(built.graph)
      const fillStage = view.stageLayout === "fill"
      root.classList.toggle("steptrace--stable-stage", view.stableStage === true)
      stageCol.classList.toggle(
        "steptrace__stage-col--bottom",
        built.kind !== "graph" && !fillStage,
      )
      stageCol.classList.toggle("steptrace__stage-col--graph", built.kind === "graph")
      stageCol.classList.toggle("steptrace__stage-col--fill", fillStage)
      // The view's LAST node is its own one-line status; the rail TRACE log
      // replaces it, so we keep it out of the DOM (paint still writes to it
      // harmlessly). Everything before it is the actual visualization.
      const nodes = view.nodes.slice(0, -1)
      stageCol.replaceChildren(...nodes)
      player = new Player(built.frames, view.paint, state.speed)
      player.onState = onState
      // RESULT reads the terminal frame, which this build already fixed, so its
      // text is set once here — sizeRail() needs it to measure the slot.
      insightText.textContent = summaryFor(
        state.algorithm,
        built.kind,
        built.frames[built.frames.length - 1],
        currentGraph,
      )
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
      watchWrap.hidden = maxRows === 0
      watchEl.style.setProperty("--steptrace-watch-rows", String(maxRows))
    }

    function syncStartOptions(graph) {
      if (!startMenu || startMenu.dataset.filled) {
        if (state.start == null) state.start = graph.start
        return
      }
      startMenu.replaceChildren()
      for (const n of graph.nodes) {
        const opt = el("option")
        opt.value = n.id
        opt.textContent = n.id
        if (n.id === graph.start) opt.selected = true
        startMenu.append(opt)
      }
      startMenu.value = graph.start
      startMenu.dataset.filled = "1"
      state.start = graph.start
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
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
      destroy() {
        if (player) player.destroy()
        if (currentView && currentView.destroy) currentView.destroy()
        if (speedControlHandle && speedControlHandle.destroy) speedControlHandle.destroy()
        if (logRO) logRO.disconnect()
        mq.removeEventListener("change", applyMotion)
        root.removeEventListener("keydown", onKey)
        document.removeEventListener("click", onDocClick)
        root.replaceChildren()
        root.classList.remove("steptrace", "steptrace--reduced", "steptrace--stable-stage")
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
