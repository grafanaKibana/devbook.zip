import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { build } from "esbuild"
import { sassPlugin } from "esbuild-sass-plugin"
import { chromium } from "playwright"

test("state styles require a plugin-owned active mount token", () => {
  const source = readFileSync(new URL("./src/styles/index.scss", import.meta.url), "utf8")
  assert.doesNotMatch(source, /^\[data-mermaid-flow-state(?:=|\])/m)
  assert.equal(
    source.match(/\[data-mermaid-flow-mount\^="flow-"\]\[data-mermaid-flow-state/g)?.length,
    5,
  )
})

test("range controls use the compact StepTrace geometry in both hosts", () => {
  const source = readFileSync(new URL("./src/styles/index.scss", import.meta.url), "utf8")
  const obsidian = readFileSync(new URL("./src/entries/obsidian.cts", import.meta.url), "utf8")
  assert.match(
    source,
    /\.mermaid-flow-controls \{[\s\S]*flex-wrap: nowrap;[\s\S]*inline-size: 100%;/u,
  )
  assert.match(
    source,
    /\.mermaid-flow-control-range \{[\s\S]*display: flex;[\s\S]*flex: 0 1 22rem;[\s\S]*max-inline-size: 22rem;/u,
  )
  assert.match(
    source,
    /\.mermaid-flow-control-range > \.slider,[\s\S]*> input\[type="range"\][\s\S]*flex: 1 1 auto;/u,
  )
  assert.match(
    source,
    /input\.mermaid-flow-range-fallback \{[\s\S]*appearance: none;[\s\S]*block-size: 16px;[\s\S]*background-size: 100% 2px;/u,
  )
  assert.match(
    source,
    /::-webkit-slider-thumb \{[\s\S]*inline-size: 12px;[\s\S]*block-size: 12px;/u,
  )
  assert.match(source, /\.mermaid-flow-control-actions \{[\s\S]*margin-inline-start: auto;/u)
  assert.match(obsidian, /new SliderComponent\(container\)\.setLimits/u)
  assert.match(obsidian, /container\.replaceChildren\(\)/u)
  assert.match(obsidian, /mountMermaidFlow\([\s\S]*createRangeSlider/u)
})

test("queue ticks preserve particle identity and stop on teardown", async () => {
  const [bundle, styles] = await Promise.all([
    build({
      stdin: {
        contents: `export { mountMermaidFlow } from "./src/mount"`,
        resolveDir: new URL(".", import.meta.url).pathname,
      },
      bundle: true,
      format: "iife",
      globalName: "MermaidFlowRuntime",
      write: false,
    }),
    build({
      entryPoints: [new URL("./src/styles/hosts/obsidian.scss", import.meta.url).pathname],
      bundle: true,
      plugins: [sassPlugin()],
      write: false,
    }),
  ])
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(`
      <div id="queue-mount">
        <svg viewBox="0 0 240 80">
          <g class="edgePaths"><path class="flowchart-link" d="M60,40L180,40"></path></g>
          <g class="nodes">
            <g class="node" id="flowchart-queue-0">
              <rect x="20" y="10" width="80" height="60"></rect>
              <g class="label"><foreignObject><div><span class="nodeLabel"><p>Queue<br><span>0 queued</span></p></span></div></foreignObject></g>
            </g>
            <g class="node" id="flowchart-consumer-1">
              <rect x="140" y="10" width="80" height="60"></rect>
              <g class="label"><foreignObject><div><span class="nodeLabel"><p>Consumer<br><span>0 consumed</span></p></span></div></foreignObject></g>
            </g>
          </g>
        </svg>
      </div>
    `)
    await page.evaluate(`
      const nativeSetInterval = window.setInterval.bind(window)
      const nativeClearInterval = window.clearInterval.bind(window)
      const active = new Set()
      window.setInterval = (handler, timeout) => {
        const id = nativeSetInterval(handler, timeout)
        active.add(id)
        return id
      }
      window.clearInterval = (id) => {
        active.delete(id)
        nativeClearInterval(id)
      }
      globalThis.activeQueueIntervals = () => active.size
    `)
    await page.addStyleTag({ content: styles.outputFiles[0].text })
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.evaluate(() => {
      const runtime = (
        globalThis as unknown as { MermaidFlowRuntime: typeof import("./src/mount") }
      ).MermaidFlowRuntime
      const config: import("./src/types").NormalizedConfig = {
        version: 1,
        for: "queue",
        defaults: {
          nodes: {
            queue: { metric: "0 queued", state: "normal" },
            consumer: { metric: "0 consumed", state: "normal" },
          },
          edges: {
            "0": {
              radius: 2,
              particlesPerCycle: 2,
              direction: "forward",
              delayMs: 0,
              visible: true,
              travelMs: 800,
              state: "normal",
            },
          },
        },
        controls: [
          {
            id: "traffic",
            type: "range",
            label: "Traffic",
            min: 0,
            max: 150,
            step: 1,
            default: 50,
          },
          { id: "reset", type: "reset", label: "Reset" },
        ],
        scenarios: [],
        bindings: [],
        thresholds: [],
        queues: [
          {
            control: "traffic",
            arrival: { scale: 1 },
            capacityPerSecond: 40,
            queueNode: "queue",
            consumerNode: "consumer",
            queueFormat: "{value} queued",
            consumerFormat: "{value} consumed",
          },
        ],
        initialControls: { traffic: 50 },
      }
      const container = document.querySelector<HTMLElement>("#queue-mount")!
      const svg = container.querySelector<SVGSVGElement>("svg")!
      const handle = runtime.mountMermaidFlow(container, svg, config)
      document
        .querySelector('[data-mermaid-flow-owned="particle"]')
        ?.setAttribute("data-stable-particle", "1")
      Object.assign(globalThis, { queueHandle: handle })
    })
    assert.equal(await page.evaluate("activeQueueIntervals()"), 1)
    await page.waitForTimeout(350)
    const ticking = await page.evaluate(() => {
      const handle = (globalThis as unknown as { queueHandle: import("./src/mount").MountHandle })
        .queueHandle
      return {
        queue: handle.current().visual.nodes.queue.metric,
        consumer: handle.current().visual.nodes.consumer.metric,
        nodeMetrics: Array.from(
          document.querySelectorAll<HTMLElement>("[data-mermaid-flow-metric]"),
          (element) => element.textContent,
        ),
        loads: Array.from(
          document.querySelectorAll<SVGGElement>('[data-mermaid-flow-owned="load"]'),
          (element) => element.getAttribute("aria-valuetext"),
        ),
        overloadedFill: getComputedStyle(
          document.querySelector<SVGRectElement>(
            "[data-mermaid-flow-overloaded] .mermaid-flow-node-load-fill",
          )!,
        ).fill,
        loadStroke: getComputedStyle(
          document.querySelector<SVGRectElement>(".mermaid-flow-node-load-fill")!,
        ).stroke,
        stable: Boolean(document.querySelector('[data-stable-particle="1"]')),
      }
    })
    assert.match(ticking.queue!, /^[1-9]\d* queued$/)
    assert.match(ticking.consumer!, /^[1-9]\d* consumed$/)
    assert.deepEqual(ticking.nodeMetrics, [ticking.queue, ticking.consumer])
    assert.deepEqual(ticking.loads, ["50/40, 125% load", "40/40, 100% load"])
    assert.equal(ticking.overloadedFill, "rgb(180, 35, 24)")
    assert.equal(ticking.loadStroke, "none")
    assert.equal(ticking.stable, true)

    await page.getByRole("button", { name: "Pause animation" }).click()
    const pausedQueue = await page.evaluate(() => {
      const handle = (globalThis as unknown as { queueHandle: import("./src/mount").MountHandle })
        .queueHandle
      return handle.current().visual.nodes.queue.metric
    })
    await page.waitForTimeout(350)
    assert.equal(
      await page.evaluate(() => {
        const handle = (globalThis as unknown as { queueHandle: import("./src/mount").MountHandle })
          .queueHandle
        return handle.current().visual.nodes.queue.metric
      }),
      pausedQueue,
    )
    await page.getByRole("button", { name: "Resume animation" }).click()
    await page.waitForTimeout(350)
    assert.notEqual(
      await page.evaluate(() => {
        const handle = (globalThis as unknown as { queueHandle: import("./src/mount").MountHandle })
          .queueHandle
        return handle.current().visual.nodes.queue.metric
      }),
      pausedQueue,
    )

    await page.evaluate(() => {
      ;(
        globalThis as unknown as { queueHandle: import("./src/mount").MountHandle }
      ).queueHandle.destroy()
    })
    assert.equal(await page.evaluate("activeQueueIntervals()"), 0)
  } finally {
    await browser.close()
  }
})

test("shared runtime owns controls, pause, reduced motion, SVG replacement, and teardown", async () => {
  const [bundle, styles] = await Promise.all([
    build({
      stdin: {
        contents: `
          export { mountMermaidFlow } from "./src/mount"
          export { MermaidSvgAdapter } from "./src/mermaid-svg-adapter"
          export { cloneNativeMermaidSvg } from "./src/popup"
        `,
        resolveDir: new URL(".", import.meta.url).pathname,
      },
      bundle: true,
      format: "iife",
      globalName: "MermaidFlowRuntime",
      write: false,
    }),
    build({
      entryPoints: [new URL("./src/styles/hosts/obsidian.scss", import.meta.url).pathname],
      bundle: true,
      plugins: [sassPlugin()],
      write: false,
    }),
  ])
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(`
      <style>
        #mount { display: flex; flex-direction: column; align-items: center; inline-size: 800px; }
      </style>
      <div id="mount">
        <svg id="diagram" viewBox="0 0 200 80">
          <g class="edgePaths"><path class="flowchart-link" d="M40,40L160,40" style="stroke:#123;stroke-dasharray:7 2" marker-end="url(#native)"></path></g>
          <g class="nodes"><g class="node" id="render-flowchart-queue-0">
            <rect x="60" y="10" width="80" height="60" data-mermaid-flow-mount="native-owner" data-mermaid-flow-state="native-state"></rect>
            <g class="label"><foreignObject><div><span class="nodeLabel"><p>Queue<br><span>5 queued</span></p></span></div></foreignObject></g>
          </g></g>
        </svg>
      </div>
    `)
    await page.addStyleTag({ content: styles.outputFiles[0].text })
    await page.evaluate("globalThis.__name = value => value")
    await page.evaluate(() => {
      const listeners = new Set<(event: MediaQueryListEvent) => void>()
      const media = {
        matches: false,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
          listeners.add(listener),
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
          listeners.delete(listener),
        toggle(matches: boolean) {
          media.matches = matches
          listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent))
        },
        listenerCount: () => listeners.size,
      }
      let pauseAnimationsCalls = 0
      SVGSVGElement.prototype.pauseAnimations = () => {
        pauseAnimationsCalls += 1
      }
      Object.assign(globalThis, {
        matchMedia: () => media,
        testMedia: media,
        pauseAnimationsCalls: () => pauseAnimationsCalls,
      })
    })
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.evaluate(() => {
      const config: import("./src/types").NormalizedConfig = {
        version: 1 as const,
        for: "queue-flow",
        defaults: {
          nodes: { queue: { metric: "5 queued", state: "normal" as const } },
          edges: {
            "0": {
              radius: 4,
              particlesPerCycle: 2,
              direction: "reverse" as const,
              delayMs: 125,
              visible: true,
              travelMs: 1000,
              state: "normal" as const,
            },
          },
        },
        controls: [
          {
            id: "mode",
            type: "scenario" as const,
            label: "Mode",
            default: "normal",
            options: ["normal", "busy"],
          },
          {
            id: "traffic",
            type: "range" as const,
            label: "Traffic",
            min: 0,
            max: 100,
            step: 1,
            default: 5,
          },
          { id: "reset", type: "reset" as const, label: "Reset" },
        ],
        scenarios: [
          { id: "normal", patch: { nodes: {}, edges: {} } },
          { id: "busy", patch: { nodes: { queue: { state: "busy" as const } }, edges: {} } },
        ],
        bindings: [
          {
            control: "traffic",
            target: { node: "queue", property: "metric" as const },
            format: "{value} queued",
          },
        ],
        thresholds: [],
        queues: [],
        initialControls: { mode: "normal", traffic: 5 },
      }
      const runtime = (
        globalThis as unknown as {
          MermaidFlowRuntime: typeof import("./src/mount") &
            typeof import("./src/mermaid-svg-adapter") &
            typeof import("./src/popup")
        }
      ).MermaidFlowRuntime
      const container = document.querySelector<HTMLElement>("#mount")!
      const svg = document.querySelector<SVGSVGElement>("#diagram")!
      const nativeMarkup = svg.outerHTML
      Object.assign(globalThis, {
        runtimeHandle: runtime.mountMermaidFlow(container, svg, config),
        nativeMarkup,
        config,
      })
    })

    const state = async () =>
      page.evaluate(() => ({
        guides: document.querySelectorAll('[data-mermaid-flow-owned="motion"] path').length,
        particles: document.querySelectorAll('[data-mermaid-flow-owned="particle"]').length,
        runtimes: document.querySelectorAll(".mermaid-flow-runtime").length,
        buttons: Array.from(document.querySelectorAll("button"), (button) => button.textContent),
        controlOrder: Array.from(
          document.querySelector(".mermaid-flow-controls")?.children ?? [],
          (element) => element.className,
        ),
        ariaPressed:
          document.querySelector("button:last-child")?.hasAttribute("aria-pressed") ?? false,
        metric: document.querySelector("[data-mermaid-flow-metric]")?.textContent,
        live: document.querySelector(".mermaid-flow-live")?.textContent,
        paint: Array.from(
          document.querySelectorAll("#mount rect"),
          (element) =>
            [
              element.getAttribute("data-mermaid-flow-mount"),
              element.getAttribute("data-mermaid-flow-state"),
            ] as const,
        ),
        edgePaint: (() => {
          const edge = document.querySelector<SVGPathElement>("#mount .flowchart-link")!
          return {
            style: edge.getAttribute("style"),
            markerEnd: edge.getAttribute("marker-end"),
            mount: edge.getAttribute("data-mermaid-flow-mount"),
            state: edge.getAttribute("data-mermaid-flow-state"),
          }
        })(),
        guideIds: Array.from(
          document.querySelectorAll<SVGPathElement>('[data-mermaid-flow-owned="motion"] > path'),
          (path) => path.id,
        ),
        motion: Array.from(document.querySelectorAll("#mount animateMotion"), (motion) => ({
          begin: motion.getAttribute("begin"),
          duration: motion.getAttribute("dur"),
          keyPoints: motion.getAttribute("keyPoints"),
          href: motion.querySelector("mpath")?.getAttribute("href"),
          radius: motion.parentElement?.querySelector("circle")?.getAttribute("r"),
        })),
        listeners: (
          globalThis as unknown as { testMedia: { listenerCount(): number } }
        ).testMedia.listenerCount(),
        pauseAnimationsCalls: (
          globalThis as unknown as { pauseAnimationsCalls(): number }
        ).pauseAnimationsCalls(),
        containerStyle: {
          containerType: document.querySelector<HTMLElement>("#mount")!.style.containerType,
        },
        focused: {
          control: document.activeElement?.getAttribute("data-mermaid-flow-control"),
          command: document.activeElement?.getAttribute("data-mermaid-flow-command"),
        },
      }))

    const initial = await state()
    const guideId = initial.guideIds[0]
    assert.match(guideId, /^mermaid-flow-guide-[0-9a-z]{7}(?:-[0-9a-z]{7}){3}-0$/)
    assert.deepEqual(initial, {
      guides: 1,
      particles: 2,
      runtimes: 1,
      buttons: ["Reset", "Pause animation"],
      controlOrder: [
        "mermaid-flow-control-field",
        "mermaid-flow-control-field mermaid-flow-control-range",
        "mermaid-flow-control-actions",
      ],
      ariaPressed: false,
      metric: "5 queued",
      live: "",
      paint: [["native-owner", "native-state"]],
      edgePaint: {
        style: "stroke:#123;stroke-dasharray:7 2",
        markerEnd: "url(#native)",
        mount: null,
        state: null,
      },
      guideIds: [guideId],
      motion: [
        {
          begin: "125ms",
          duration: "1000ms",
          keyPoints: "1;0",
          href: `#${guideId}`,
          radius: "4",
        },
        {
          begin: "625ms",
          duration: "1000ms",
          keyPoints: "1;0",
          href: `#${guideId}`,
          radius: "4",
        },
      ],
      listeners: 1,
      pauseAnimationsCalls: 0,
      containerStyle: { containerType: "inline-size" },
      focused: { control: null, command: null },
    })
    const layout = await page.evaluate(() => {
      const container = document.querySelector("#mount")!.getBoundingClientRect()
      const controls = document.querySelector(".mermaid-flow-controls")!.getBoundingClientRect()
      const range = document.querySelector(".mermaid-flow-control-range")!.getBoundingClientRect()
      const actions = document
        .querySelector(".mermaid-flow-control-actions")!
        .getBoundingClientRect()
      const rangeValue = document.querySelector(".mermaid-flow-range-value")?.textContent
      return { container, controls, range, actions, rangeValue }
    })
    assert.equal(layout.controls.width, layout.container.width)
    assert.ok(
      Math.abs(
        (layout.range.top + layout.range.bottom) / 2 -
          (layout.actions.top + layout.actions.bottom) / 2,
      ) < 1,
    )
    assert.ok(layout.range.left < layout.actions.left)
    assert.ok(Math.abs(layout.actions.right - layout.controls.right) < 1)
    assert.equal(layout.rangeValue, "5 r/s")

    await page.evaluate(() => {
      const handle = (globalThis as unknown as { runtimeHandle: import("./src/mount").MountHandle })
        .runtimeHandle
      handle.update("mode", "busy")
    })
    const busyPaint = (await state()).paint
    assert.match(busyPaint[0][0]!, /^flow-/)
    assert.equal(busyPaint[0][1], "busy")
    assert.equal((await state()).live, "Mode: busy")
    await page.evaluate(() => {
      const handle = (globalThis as unknown as { runtimeHandle: import("./src/mount").MountHandle })
        .runtimeHandle
      handle.reset()
    })
    assert.deepEqual((await state()).paint, [["native-owner", "native-state"]])
    assert.equal((await state()).live, "Reset: controls restored")

    await page.getByRole("button", { name: "Pause animation" }).click()
    assert.deepEqual((await state()).buttons, ["Reset", "Resume animation"])
    assert.equal((await state()).particles, 0)
    assert.equal((await state()).guides, 1)

    await page.evaluate(() => {
      const handle = (globalThis as unknown as { runtimeHandle: import("./src/mount").MountHandle })
        .runtimeHandle
      handle.update("traffic", 42)
      ;(
        globalThis as unknown as { testMedia: { toggle(matches: boolean): void } }
      ).testMedia.toggle(true)
      ;(
        globalThis as unknown as { testMedia: { toggle(matches: boolean): void } }
      ).testMedia.toggle(false)
    })
    assert.equal((await state()).metric, "42 queued")
    assert.equal((await state()).live, "Traffic: 42")
    assert.deepEqual((await state()).edgePaint, initial.edgePaint)
    assert.deepEqual((await state()).buttons, ["Reset", "Resume animation"])
    assert.equal((await state()).particles, 0)

    await page.locator('#mount input[type="range"]').focus()
    await page.evaluate(() => {
      const globals = globalThis as unknown as {
        runtimeHandle: import("./src/mount").MountHandle
        nativeMarkup: string
      }
      const old = document.querySelector("#diagram")!
      old.insertAdjacentHTML("afterend", globals.nativeMarkup)
      const next = old.nextElementSibling as SVGSVGElement
      old.remove()
      globals.runtimeHandle.replaceSvg(next)
    })
    assert.equal((await state()).runtimes, 1)
    assert.equal((await state()).guides, 1)
    assert.equal((await state()).particles, 0)
    assert.deepEqual((await state()).buttons, ["Reset", "Resume animation"])
    assert.deepEqual((await state()).focused, { control: "traffic", command: null })

    await page.getByRole("button", { name: "Resume animation" }).focus()
    await page.evaluate(() => {
      const globals = globalThis as unknown as {
        runtimeHandle: import("./src/mount").MountHandle
        nativeMarkup: string
      }
      const old = document.querySelector("#diagram")!
      old.insertAdjacentHTML("afterend", globals.nativeMarkup)
      const next = old.nextElementSibling as SVGSVGElement
      old.remove()
      globals.runtimeHandle.replaceSvg(next)
    })
    assert.deepEqual((await state()).focused, { control: null, command: "pause" })

    const liveGuideIds = await page.evaluate(() => {
      const globals = globalThis as unknown as {
        MermaidFlowRuntime: typeof import("./src/mount")
        config: import("./src/types").NormalizedConfig
        nativeMarkup: string
      }
      const container = document.createElement("div")
      container.id = "mount2"
      container.innerHTML = globals.nativeMarkup
      document.body.append(container)
      const svg = container.querySelector<SVGSVGElement>("svg")!
      Object.assign(globalThis, {
        secondHandle: globals.MermaidFlowRuntime.mountMermaidFlow(container, svg, globals.config),
      })
      return Array.from(
        document.querySelectorAll<SVGPathElement>('[data-mermaid-flow-owned="motion"] > path'),
        (path) => path.id,
      )
    })
    assert.equal(liveGuideIds.length, 2)
    assert.equal(new Set(liveGuideIds).size, 2)
    assert.equal((await state()).listeners, 2)

    const popup = await page.evaluate(() => {
      const globals = globalThis as unknown as {
        MermaidFlowRuntime: typeof import("./src/popup")
      }
      const source = document.querySelector<SVGSVGElement>("#diagram")!
      const clone = globals.MermaidFlowRuntime.cloneNativeMermaidSvg(source)
      return {
        cloneOwned: clone.querySelectorAll("[data-mermaid-flow-owned]").length,
        cloneState: clone.querySelectorAll("[data-mermaid-flow-mount], [data-mermaid-flow-state]")
          .length,
        sourceOwned: source.querySelectorAll("[data-mermaid-flow-owned]").length,
      }
    })
    assert.deepEqual(popup, { cloneOwned: 0, cloneState: 0, sourceOwned: 1 })

    await page.evaluate(() => {
      const handle = (globalThis as unknown as { runtimeHandle: import("./src/mount").MountHandle })
        .runtimeHandle
      handle.destroy()
      handle.destroy()
      const second = (
        globalThis as unknown as {
          secondHandle: import("./src/mount").MountHandle
        }
      ).secondHandle
      second.destroy()
      second.destroy()
      ;(
        globalThis as unknown as { testMedia: { toggle(matches: boolean): void } }
      ).testMedia.toggle(true)
    })
    assert.equal((await state()).runtimes, 0)
    assert.equal((await state()).guides, 0)
    assert.equal((await state()).particles, 0)
    assert.equal((await state()).listeners, 0)
    assert.equal((await state()).pauseAnimationsCalls, 0)
    assert.deepEqual((await state()).containerStyle, { containerType: "" })

    const singular = await page.evaluate(() => {
      const globals = globalThis as unknown as {
        MermaidFlowRuntime: typeof import("./src/mermaid-svg-adapter")
        nativeMarkup: string
      }
      const container = document.createElement("div")
      container.innerHTML = globals.nativeMarkup
      document.body.append(container)
      const svg = container.querySelector<SVGSVGElement>("svg")!
      const edge = svg.querySelector<SVGPathElement>(".flowchart-link")!
      edge.getScreenCTM = () => null
      const adapter = new globals.MermaidFlowRuntime.MermaidSvgAdapter(svg)
      let message = ""
      try {
        adapter.createMotion(0, { direction: "forward", durationMs: 1000 })
      } catch (error) {
        message = (error as Error).message
      }
      return {
        message,
        partialRoots: svg.querySelectorAll('[data-mermaid-flow-owned="motion"]').length,
      }
    })
    assert.match(singular.message, /no usable coordinate transform/)
    assert.equal(singular.partialRoots, 0)
  } finally {
    await browser.close()
  }
})
