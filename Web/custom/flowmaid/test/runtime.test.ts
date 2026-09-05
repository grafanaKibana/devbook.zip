import assert from "node:assert/strict"
import test from "node:test"

import { chromium } from "playwright"
import esbuild from "esbuild"

import { repo } from "./helpers"

test("Mermaid adapter preserves native topology and removes only owned augmentation", async () => {
  const built = await esbuild.build({
    entryPoints: [`${repo}/Web/custom/flowmaid/src/mermaid/adapter.ts`],
    bundle: true,
    format: "iife",
    globalName: "Adapter",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      `<svg viewBox="0 0 100 50"><g class="nodes"><g class="node" id="flowchart-A-0" transform="translate(1 2)"><rect x="0" y="0" width="10" height="10"/><text>A</text></g><g class="node" id="flowchart-B-1"><rect x="90" y="0" width="10" height="10"/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link native" d="M10,5 L90,5" marker-end="url(#arrow)" style="stroke:red"/></g></svg>`,
    )
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    const result = await page.evaluate(async () => {
      const svg = document.querySelector("svg") as SVGSVGElement
      const identity = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse: () => identity,
        multiply: () => identity,
      }
      ;(SVGElement.prototype as any).getScreenCTM = () => identity
      const nativeBegin = SVGAnimationElement.prototype.beginElement
      const beginTimes: number[] = []
      SVGAnimationElement.prototype.beginElement = function () {
        beginTimes.push(performance.now())
        return nativeBegin.call(this)
      }
      const adapter = new (window as any).Adapter.MermaidAdapter(svg)
      const before = adapter.snapshotNative()
      const motion = adapter.createMotion("L_A_B_0", {
        count: 2,
        rate: 100,
        radius: 3,
        durationMs: 1000,
      })
      motion.set({ count: 1, rate: 100, radius: 3, durationMs: 1000 })
      const immediateBegins = beginTimes.length
      const particles = [...motion.root.querySelectorAll('[data-flowmaid-owned="particle"]')]
      const initialVisibility = particles.map((particle) => particle.getAttribute("visibility"))
      await new Promise((resolve) => setTimeout(resolve, 40))
      const durations = [...motion.root.querySelectorAll("animateMotion")].map((element) =>
        element.getAttribute("dur"),
      )
      const beginGaps = beginTimes.slice(1).map((time, index) => time - beginTimes[index]!)
      const owned = svg.querySelectorAll("[data-flowmaid-owned]").length
      motion.destroy()
      adapter.destroy()
      SVGAnimationElement.prototype.beginElement = nativeBegin
      return {
        graph: adapter.graph,
        before,
        after: adapter.snapshotNative(),
        owned,
        immediateBegins,
        durations,
        beginGaps,
        initialVisibility,
        startedVisibility: particles.map((particle) => particle.getAttribute("visibility")),
        remaining: svg.querySelectorAll("[data-flowmaid-owned]").length,
      }
    })
    assert.deepEqual(result.graph, {
      nodes: ["A", "B"],
      edges: [{ id: "L_A_B_0", from: "A", to: "B" }],
    })
    assert.deepEqual(result.after, result.before)
    assert.equal(result.owned, 4)
    assert.equal(result.immediateBegins, 1)
    assert.deepEqual(result.durations, ["110ms", "110ms", "110ms"])
    assert.deepEqual(result.initialVisibility, [null, "hidden", "hidden"])
    assert.deepEqual(result.startedVisibility, [null, null, null])
    assert.ok(
      result.beginGaps.every((gap) => gap >= 6),
      result.beginGaps,
    )
    assert.equal(result.remaining, 0)
  } finally {
    await browser.close()
  }
})

test("Mermaid adapter rejects graph limits before endpoint matching", async () => {
  const built = await esbuild.build({
    entryPoints: [`${repo}/Web/custom/flowmaid/src/mermaid/adapter.ts`],
    bundle: true,
    format: "iife",
    globalName: "Adapter",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent('<svg><g class="nodes"></g><g class="edgePaths"></g></svg>')
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    const result = await page.evaluate(() => {
      const svg = document.querySelector("svg")!
      const nodes = svg.querySelector("g.nodes")!
      const edges = svg.querySelector("g.edgePaths")!
      for (let index = 0; index < 65; index += 1) {
        nodes.insertAdjacentHTML(
          "beforeend",
          `<g class="node" id="flowchart-N${index}-${index}"><rect/><text>N${index}</text></g>`,
        )
        edges.insertAdjacentHTML(
          "beforeend",
          `<path id="L_N0_N${index}_${index}" class="flowchart-link" d="M0 0L1 1"/>`,
        )
      }
      const nativeTest = RegExp.prototype.test
      let endpointTests = 0
      RegExp.prototype.test = function (value: string) {
        endpointTests += 1
        return nativeTest.call(this, value)
      }
      let message = ""
      try {
        new (window as any).Adapter.MermaidAdapter(svg)
      } catch (error) {
        message = error instanceof Error ? error.message : String(error)
      } finally {
        RegExp.prototype.test = nativeTest
      }
      return { message, endpointTests }
    })
    assert.ok(
      /at most 64 edges/u.test(result.message) && result.endpointTests === 0,
      `graph limit was not enforced before endpoint matching: ${JSON.stringify(result)}`,
    )
  } finally {
    await browser.close()
  }
})

test("mount owns controls, timers, listeners, replacement, sibling isolation, and idempotent teardown", async () => {
  const built = await esbuild.build({
    stdin: {
      contents: 'export { mountFlowmaid } from "./src/runtime/mount"',
      resolveDir: `${repo}/Web/custom/flowmaid`,
    },
    bundle: true,
    format: "iife",
    globalName: "Runtime",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      `<div id="pair"><svg><g class="nodes"><g class="node" id="flowchart-A-0"><rect/><text>A</text></g><g class="node" id="flowchart-B-1"><rect/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link" d="M0 0L10 0"/></g></svg></div><div id="mount"></div><div id="sibling"></div>`,
    )
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    const result = await page.evaluate(() => {
      const identity = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse() {
          return this
        },
        multiply() {
          return this
        },
      }
      ;(SVGElement.prototype as any).getScreenCTM = () => identity
      ;(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 50 })
      const timers = new Set<number>()
      const clock = {
        now: () => 0,
        setInterval: () => {
          const id = timers.size + 1
          timers.add(id)
          return id
        },
        clearInterval: (id: number) => timers.delete(id),
      }
      const program = {
        controls: [{ id: "rate", label: "Rate", min: 0, max: 10, value: 3, step: 1, unit: "r/s" }],
        initialControls: { rate: 3 },
        sources: [{ rate: "rate", nodes: ["A"] }],
        distributions: [],
        queues: [],
        dots: { radius: 3, durationMs: 1000 },
      }
      const mount = document.querySelector("#mount") as HTMLElement
      const sibling = document.querySelector("#sibling") as HTMLElement
      const svg = document.querySelector("svg") as SVGSVGElement
      const first = (window as any).Runtime.mountFlowmaid(mount, svg, program, { clock })
      const control = mount.querySelector('input[type="range"]') as HTMLInputElement
      const before = {
        timers: timers.size,
        controls: mount.querySelectorAll(".flowmaid-controls").length,
        owned: svg.querySelectorAll("[data-flowmaid-owned]").length,
        label: control.getAttribute("aria-label"),
        valueText: control.getAttribute("aria-valuetext"),
        buttons: [...mount.querySelectorAll("button")].map((button) => button.textContent),
      }
      const replacement = svg.cloneNode(true) as SVGSVGElement
      replacement.querySelectorAll("[data-flowmaid-owned]").forEach((element) => element.remove())
      svg.replaceWith(replacement)
      control.focus()
      first.replaceSvg(replacement)
      const focusRestored = document.activeElement === control
      first.destroy()
      first.destroy()
      return {
        before,
        focusRestored,
        timers: timers.size,
        controls: mount.querySelectorAll(".flowmaid-controls").length,
        owned: replacement.querySelectorAll("[data-flowmaid-owned]").length,
        sibling: sibling.childElementCount,
      }
    })
    assert.deepEqual(result.before, {
      timers: 1,
      controls: 1,
      owned: 2,
      label: "Rate",
      valueText: "3 r/s",
      buttons: ["Reset", "Pause animation"],
    })
    assert.equal(result.focusRestored, true)
    assert.deepEqual(
      {
        timers: result.timers,
        controls: result.controls,
        owned: result.owned,
        sibling: result.sibling,
      },
      { timers: 0, controls: 0, owned: 0, sibling: 0 },
    )
  } finally {
    await browser.close()
  }
})

test("actual particle starts match routed records and slider changes add no traffic", async () => {
  const built = await esbuild.build({
    stdin: {
      contents: 'export { mountFlowmaid } from "./src/runtime/mount"',
      resolveDir: `${repo}/Web/custom/flowmaid`,
    },
    bundle: true,
    format: "iife",
    globalName: "Runtime",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent('<div id="root"></div>')
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    const result = await page.evaluate(() => {
      const identity = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse: () => identity,
        multiply: () => identity,
      }
      ;(SVGElement.prototype as any).getScreenCTM = () => identity
      ;(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 50 })
      const run = (steps: number, controlled = false) => {
        const root = document.querySelector("#root")!
        root.innerHTML =
          '<svg><g class="nodes"><g class="node" id="flowchart-A-0"><rect/><text>A</text></g><g class="node" id="flowchart-B-1"><rect/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link" d="M0 0L10 0"/></g></svg><div class="mount"></div>'
        const svg = root.querySelector("svg")!
        const mount = root.querySelector(".mount")!
        let now = 0
        let tick!: () => void
        const handle = (window as any).Runtime.mountFlowmaid(
          mount,
          svg,
          {
            controls: controlled
              ? [{ id: "rate", label: "Rate", min: 0, max: 100, value: 0, step: 1 }]
              : [],
            initialControls: controlled ? { rate: 0 } : {},
            sources: [{ rate: controlled ? "rate" : 100, nodes: ["A"] }],
            distributions: [],
            queues: [],
            dots: { radius: 3, durationMs: 1000 },
          },
          {
            clock: {
              now: () => now,
              setInterval: (callback: () => void) => ((tick = callback), 1),
              clearInterval: () => {},
            },
          },
        )
        const baseline = svg.querySelectorAll('[data-flowmaid-owned="particle"]').length
        let preserved: boolean | undefined
        if (controlled) {
          const input = mount.querySelector('input[type="range"]') as HTMLInputElement
          input.value = "100"
          input.dispatchEvent(new Event("input", { bubbles: true }))
          now += 250
          tick()
          const inFlight = [...svg.querySelectorAll('[data-flowmaid-owned="particle"]')]
          input.value = "50"
          input.dispatchEvent(new Event("input", { bubbles: true }))
          preserved =
            inFlight.length > 0 &&
            inFlight.every((particle) => particle.isConnected) &&
            svg.querySelectorAll('[data-flowmaid-owned="particle"]').length === inFlight.length
        } else {
          for (let index = 0; index < steps; index += 1) {
            now += 1000 / steps
            tick()
          }
        }
        const particles = [...svg.querySelectorAll('[data-flowmaid-owned="particle"]')]
        const actual = {
          baseline,
          starts: svg.querySelectorAll('[data-flowmaid-owned="particle"]').length - baseline,
          records: handle.current().edges.L_A_B_0.records,
          ...(preserved !== undefined && { preserved }),
          scheduledFromInsertion: particles.every(
            (particle) =>
              particle.querySelector("animateMotion")?.getAttribute("begin") === "indefinite",
          ),
        }
        handle.destroy()
        return actual
      }
      return { whole: run(1), quartered: run(4), slider: run(0, true) }
    })
    assert.deepEqual(result, {
      whole: { baseline: 0, starts: 100, records: 100, scheduledFromInsertion: true },
      quartered: { baseline: 0, starts: 100, records: 100, scheduledFromInsertion: true },
      slider: {
        baseline: 0,
        starts: 25,
        records: 25,
        preserved: true,
        scheduledFromInsertion: true,
      },
    })
  } finally {
    await browser.close()
  }
})

test("default slider updates once and every progressbar has a node-derived name", async () => {
  const built = await esbuild.build({
    stdin: {
      contents:
        'export { createControls } from "./src/ui/controls"; export { MermaidAdapter } from "./src/mermaid/adapter"; export { createDecorations } from "./src/mermaid/decorations"',
      resolveDir: `${repo}/Web/custom/flowmaid`,
    },
    bundle: true,
    format: "iife",
    globalName: "Runtime",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      '<div id="mount"></div><svg><g class="nodes"><g class="node" id="flowchart-Q-0"><rect/><g class="label"><foreignObject><div><span class="nodeLabel"><p><span>Queue</span><span>0 queued</span></p></span></div></foreignObject></g></g><g class="node" id="flowchart-C-1"><rect/><g class="label"><foreignObject><div><span class="nodeLabel"><p><span>Consumer</span><span>0 consumed</span></p></span></div></foreignObject></g></g></g><g class="edgePaths"><path id="L_Q_C_0" class="flowchart-link" d="M0 0L10 0"/></g></svg>',
    )
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    const result = await page.evaluate(() => {
      const identity = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse: () => identity,
        multiply: () => identity,
      }
      ;(SVGElement.prototype as any).getScreenCTM = () => identity
      ;(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 50 })
      const updates: number[] = []
      const controls = (window as any).Runtime.createControls(
        document.querySelector("#mount"),
        {
          controls: [{ id: "rate", label: "Rate", min: 0, max: 10, value: 1, step: 1 }],
          initialControls: { rate: 1 },
          sources: [],
          distributions: [],
          queues: [],
          dots: { radius: 3, durationMs: 1000 },
        },
        {
          onControl: (_id: string, value: number) => updates.push(value),
          onReset() {},
          onPause() {},
        },
      )
      const input = document.querySelector('input[type="range"]') as HTMLInputElement
      input.value = "2"
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))

      const adapter = new (window as any).Runtime.MermaidAdapter(document.querySelector("svg"))
      const decorations = (window as any).Runtime.createDecorations(adapter)
      decorations.update(
        {
          controls: {},
          nodes: {
            Q: {
              rate: 2,
              queued: 1,
              processed: 1,
              capacity: 2,
              load: 1,
              loadLabel: "2/2",
              metric: "1 queued",
              state: "normal",
            },
            C: {
              rate: 2,
              queued: 0,
              processed: 1,
              capacity: 2,
              load: 1,
              loadLabel: "2/2",
              metric: "1 consumed",
              state: "normal",
            },
          },
          edges: {
            L_Q_C_0: { rate: 2, records: 0, dots: 0, radius: 3, durationMs: 1000, state: "normal" },
          },
        },
        false,
        false,
      )
      const names = [...document.querySelectorAll('[role="progressbar"]')].map((element) =>
        element.getAttribute("aria-label"),
      )
      const field = document.querySelector(".flowmaid-control-field")!
      const presentation = {
        fieldClass: field.getAttribute("class"),
        children: field.children.length,
        value: field.querySelector(".flowmaid-control-value")?.textContent,
        rangeClass: input.className,
        metrics: [...document.querySelectorAll("[data-flowmaid-metric]")].map(
          (element) => element.textContent,
        ),
        trackY: document.querySelector(".flowmaid-node-load-track")?.getAttribute("y"),
      }
      controls.destroy()
      decorations.destroy()
      adapter.destroy()
      return { updates, names, presentation }
    })
    assert.deepEqual(result, {
      updates: [2],
      names: ["Queue0 queued load", "Consumer0 consumed load"],
      presentation: {
        fieldClass: "flowmaid-control-field flowmaid-control-range",
        children: 2,
        value: "2",
        rangeClass: "flowmaid-range-fallback",
        metrics: ["1 queued", "1 consumed"],
        trackY: "-9",
      },
    })
  } finally {
    await browser.close()
  }
})

test("reduced motion suppresses particles and responds to preference changes", async () => {
  const built = await esbuild.build({
    stdin: {
      contents: 'export { mountFlowmaid } from "./src/runtime/mount"',
      resolveDir: `${repo}/Web/custom/flowmaid`,
    },
    bundle: true,
    format: "iife",
    globalName: "Runtime",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      `<svg><g class="nodes"><g class="node" id="flowchart-A-0"><rect/><text>A</text></g><g class="node" id="flowchart-B-1"><rect/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link" d="M0 0L10 0"/></g></svg><div id="mount"></div>`,
    )
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    await page.evaluate(() => {
      const identity = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse: () => identity,
        multiply: () => identity,
      }
      ;(SVGElement.prototype as any).getScreenCTM = () => identity
      ;(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 50 })
      const listeners = new Set<(event: { matches: boolean }) => void>()
      const media = {
        matches: true,
        addEventListener: (type: string, listener: (event: { matches: boolean }) => void) => {
          if (type === "change") listeners.add(listener)
        },
        removeEventListener: (type: string, listener: (event: { matches: boolean }) => void) => {
          if (type === "change") listeners.delete(listener)
        },
      }
      window.matchMedia = () => media as MediaQueryList
      ;(window as any).setReducedMotion = (matches: boolean) => {
        media.matches = matches
        listeners.forEach((listener) => listener({ matches }))
      }
      const handle = (window as any).Runtime.mountFlowmaid(
        document.querySelector("#mount"),
        document.querySelector("svg"),
        {
          controls: [],
          initialControls: {},
          sources: [{ rate: 3, nodes: ["A"] }],
          distributions: [],
          queues: [],
          dots: { radius: 3, durationMs: 1000 },
        },
      )
    })
    assert.equal(await page.locator('[data-flowmaid-owned="particle"]').count(), 0)
    assert.equal(
      await page.evaluate(() => {
        ;(window as any).setReducedMotion(false)
        return document.querySelectorAll('[data-flowmaid-owned="particle"]').length
      }),
      0,
    )
    await page.waitForTimeout(600)
    assert.ok((await page.locator('[data-flowmaid-owned="particle"]').count()) > 0)
  } finally {
    await browser.close()
  }
})

test("an emitted particle remains mounted for its complete travel duration", async () => {
  const built = await esbuild.build({
    stdin: {
      contents: 'export { mountFlowmaid } from "./src/runtime/mount"',
      resolveDir: `${repo}/Web/custom/flowmaid`,
    },
    bundle: true,
    format: "iife",
    globalName: "Runtime",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      `<svg><g class="nodes"><g class="node" id="flowchart-A-0"><rect/><text>A</text></g><g class="node" id="flowchart-B-1"><rect/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link" d="M0 0L10 0"/></g></svg><div id="mount"></div>`,
    )
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    const result = await page.evaluate(() => {
      const identity = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse: () => identity,
        multiply: () => identity,
      }
      ;(SVGElement.prototype as any).getScreenCTM = () => identity
      ;(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 50 })
      let now = 0
      let tick!: () => void
      const handle = (window as any).Runtime.mountFlowmaid(
        document.querySelector("#mount"),
        document.querySelector("svg"),
        {
          controls: [],
          initialControls: {},
          sources: [{ rate: 1, nodes: ["A"] }],
          distributions: [],
          queues: [],
          dots: { radius: 3, durationMs: 1000 },
        },
        {
          clock: {
            now: () => now,
            setInterval: (callback: () => void) => ((tick = callback), 1),
            clearInterval: () => {},
          },
        },
      )
      now = 1000
      tick()
      const emitted = document.querySelector('[data-flowmaid-owned="particle"]')!
      now = 1250
      tick()
      const duringTravel = {
        sameParticle: emitted.isConnected,
        particles: document.querySelectorAll('[data-flowmaid-owned="particle"]').length,
      }
      handle.reset()
      return {
        duringTravel,
        reset: {
          emittedRemoved: !emitted.isConnected,
          particles: document.querySelectorAll('[data-flowmaid-owned="particle"]').length,
        },
      }
    })
    assert.deepEqual(result, {
      duringTravel: { sameParticle: true, particles: 1 },
      reset: { emittedRemoved: true, particles: 0 },
    })
  } finally {
    await browser.close()
  }
})

test("completed particles expire and live particle ownership stays within mount limits", async () => {
  const built = await esbuild.build({
    stdin: {
      contents: 'export { mountFlowmaid } from "./src/runtime/mount"',
      resolveDir: `${repo}/Web/custom/flowmaid`,
    },
    bundle: true,
    format: "iife",
    globalName: "Runtime",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      `<svg><g class="nodes"><g class="node" id="flowchart-A-0"><rect/><text>A</text></g><g class="node" id="flowchart-B-1"><rect/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link" d="M0 0L10 0"/></g></svg><div id="mount"></div>`,
    )
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    const result = await page.evaluate(async () => {
      const identity = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse: () => identity,
        multiply: () => identity,
      }
      ;(SVGElement.prototype as any).getScreenCTM = () => identity
      ;(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 50 })
      const listeners = new Set<(event: { matches: boolean }) => void>()
      const media = {
        matches: false,
        addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
          listeners.add(listener),
        removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
          listeners.delete(listener),
      }
      window.matchMedia = () => media as MediaQueryList
      let now = 0
      let tick!: () => void
      const handle = (window as any).Runtime.mountFlowmaid(
        document.querySelector("#mount"),
        document.querySelector("svg"),
        {
          controls: [],
          initialControls: {},
          sources: [{ rate: 500, nodes: ["A"] }],
          distributions: [],
          queues: [],
          dots: { radius: 3, durationMs: 250 },
        },
        {
          clock: {
            now: () => now,
            setInterval: (callback: () => void) => ((tick = callback), 1),
            clearInterval: () => {},
          },
        },
      )
      const counts = []
      for (let index = 0; index < 10; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250))
        now += 250
        tick()
        counts.push(document.querySelectorAll('[data-flowmaid-owned="particle"]').length)
      }
      await new Promise((resolve) => setTimeout(resolve, 600))
      const expired = document.querySelectorAll('[data-flowmaid-owned="particle"]').length
      handle.pause()
      const paused = document.querySelectorAll('[data-flowmaid-owned="particle"]').length
      handle.resume()
      now += 250
      tick()
      handle.reset()
      const reset = document.querySelectorAll('[data-flowmaid-owned="particle"]').length
      now += 250
      tick()
      media.matches = true
      listeners.forEach((listener) => listener({ matches: true }))
      const reducedMotion = document.querySelectorAll('[data-flowmaid-owned="particle"]').length
      handle.destroy()
      return { counts, expired, paused, reset, reducedMotion }
    })
    const peak = Math.max(...result.counts)
    assert.ok(
      peak <= 1024 &&
        result.expired === 0 &&
        result.paused === 0 &&
        result.reset === 0 &&
        result.reducedMotion === 0,
      `particle lifecycle invariant failed: ${JSON.stringify({ peak, ...result })}`,
    )
  } finally {
    await browser.close()
  }
})

test("Quartz adapter failure leaves one diagnostic and no pending timeout", async () => {
  const built = await esbuild.build({
    entryPoints: [`${repo}/Web/custom/flowmaid/src/hosts/quartz/runtime.ts`],
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      `<link rel="stylesheet" data-flowmaid-style="1" href="data:text/css,"><pre id="pair" data-flowmaid-id="x"><svg></svg></pre><div class="flowmaid-mount" data-flowmaid-id="x"></div>`,
    )
    await page.evaluate(() => {
      const mount = document.querySelector<HTMLElement>(".flowmaid-mount")!
      mount.dataset.flowmaidProgram = JSON.stringify({
        controls: [],
        initialControls: {},
        sources: [{ rate: 1, nodes: ["A"] }],
        distributions: [],
        queues: [],
        dots: { radius: 3, durationMs: 1000 },
      })
      const active = new Set<number>()
      const nativeSet = window.setTimeout.bind(window)
      const nativeClear = window.clearTimeout.bind(window)
      let next = 0
      window.setTimeout = ((callback: TimerHandler, milliseconds?: number) => {
        const id = ++next
        active.add(id)
        nativeSet(() => {
          active.delete(id)
          if (typeof callback === "function") callback()
        }, milliseconds)
        return id
      }) as typeof window.setTimeout
      window.clearTimeout = ((id: number) => {
        active.delete(id)
        nativeClear(id)
      }) as typeof window.clearTimeout
      ;(window as any).__flowmaidActiveTimeouts = active
    })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    await page.waitForTimeout(20)
    const result = await page.evaluate(() => ({
      diagnostics: document.querySelectorAll(".flowmaid-diagnostic").length,
      timers: (window as any).__flowmaidActiveTimeouts.size,
      controls: document.querySelectorAll(".flowmaid-controls").length,
    }))
    assert.deepEqual(result, { diagnostics: 1, timers: 0, controls: 0 })
  } finally {
    await browser.close()
  }
})

test("Quartz recovers from an invalid SVG when a valid rerender arrives", async () => {
  const built = await esbuild.build({
    entryPoints: [`${repo}/Web/custom/flowmaid/src/hosts/quartz/runtime.ts`],
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      `<link rel="stylesheet" data-flowmaid-style="1" href="data:text/css,"><pre id="pair" data-flowmaid-id="x"><code class="mermaid"><svg></svg></code></pre><div class="flowmaid-mount" data-flowmaid-id="x"></div>`,
    )
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.evaluate(() => {
      const mount = document.querySelector<HTMLElement>(".flowmaid-mount")!
      mount.dataset.flowmaidProgram = JSON.stringify({
        controls: [],
        initialControls: {},
        sources: [{ rate: 1, nodes: ["A"] }],
        distributions: [],
        queues: [],
        dots: { radius: 3, durationMs: 1000 },
      })
      const identity = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse: () => identity,
        multiply: () => identity,
      }
      ;(SVGElement.prototype as any).getScreenCTM = () => identity
      ;(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 50 })
    })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    await page.waitForTimeout(20)
    await page.evaluate(() => {
      document.querySelector("code.mermaid")!.innerHTML =
        '<svg><g class="nodes"><g class="node" id="flowchart-A-0"><rect/><text>A</text></g><g class="node" id="flowchart-B-1"><rect/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link" d="M0 0L10 0"/></g></svg>'
      document.dispatchEvent(new CustomEvent("render"))
    })
    await page.waitForTimeout(20)
    assert.deepEqual(
      await page.evaluate(() => ({
        controls: document.querySelectorAll(".flowmaid-controls").length,
        diagnostics: document.querySelectorAll(".flowmaid-diagnostic").length,
        particles: document.querySelectorAll('[data-flowmaid-owned="particle"]').length,
      })),
      { controls: 1, diagnostics: 0, particles: 0 },
    )
  } finally {
    await browser.close()
  }
})

test("Quartz binds the Mermaid graph SVG rather than host button icons", async () => {
  const built = await esbuild.build({
    entryPoints: [`${repo}/Web/custom/flowmaid/src/hosts/quartz/runtime.ts`],
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      `<link rel="stylesheet" data-flowmaid-style="1" href="data:text/css,"><pre data-flowmaid-id="x"><button><svg></svg></button><code class="mermaid"><svg><g class="nodes"><g class="node" id="flowchart-A-0"><rect/><text>A</text></g><g class="node" id="flowchart-B-1"><rect/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link" d="M0 0L10 0"/></g></svg></code></pre><div class="flowmaid-mount" data-flowmaid-id="x"></div>`,
    )
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.evaluate(() => {
      ;(SVGElement.prototype as any).getScreenCTM = () => ({
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        multiply: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      })
      ;(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 100, height: 50 })
      const mount = document.querySelector<HTMLElement>(".flowmaid-mount")!
      mount.dataset.flowmaidProgram = JSON.stringify({
        controls: [],
        initialControls: {},
        sources: [{ rate: 1, nodes: ["A"] }],
        distributions: [],
        queues: [],
        dots: { radius: 3, durationMs: 1000 },
      })
    })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    await page.waitForTimeout(20)
    assert.deepEqual(
      await page.evaluate(() => ({
        controls: document.querySelectorAll(".flowmaid-controls").length,
        diagnostics: document.querySelectorAll(".flowmaid-diagnostic").length,
        graphOwned: document.querySelectorAll("code.mermaid > svg [data-flowmaid-owned]").length,
        iconOwned: document.querySelectorAll("button > svg [data-flowmaid-owned]").length,
      })),
      { controls: 1, diagnostics: 0, graphOwned: 2, iconOwned: 0 },
    )
  } finally {
    await browser.close()
  }
})
