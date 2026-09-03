import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { build } from "esbuild"
import { chromium, type Browser, type Page } from "playwright"

const here = path.dirname(new URL(import.meta.url).pathname)
const validSource = JSON.stringify({
  version: 1,
  for: "flow",
  defaults: { nodes: { A: {} }, edges: { "0": { particlesPerCycle: 0 } } },
})
const unsafeMissingNode = '<img src=x onerror="globalThis.injected=true">'
const adapterFailures = [
  {
    source: JSON.stringify({
      version: 1,
      for: "flow",
      defaults: { nodes: { [unsafeMissingNode]: {} }, edges: {} },
    }),
    message: `Mermaid Flow: mermaid-flow: node ${unsafeMissingNode} resolved to 0 targets`,
  },
  {
    source: JSON.stringify({
      version: 1,
      for: "flow",
      defaults: { nodes: {}, edges: { "99": { particlesPerCycle: 1 } } },
    }),
    message: "Mermaid Flow: mermaid-flow: edge 99 is out of range",
  },
]
const markdown = (source: string) =>
  [
    "```mermaid",
    "%% mermaid-flow: flow",
    "flowchart LR",
    "A --> B",
    "```",
    "```mermaid-flow",
    source,
    "```",
  ].join("\n")
const calloutMarkdown = (source: string) =>
  [
    "- Nested callout",
    "",
    "    > [!example]",
    "    > ```mermaid",
    "    > %% mermaid-flow: flow",
    "    > flowchart LR",
    "    > A --> B",
    "    > ````",
    "    >",
    "    > ```mermaid-flow",
    `    > ${source}`,
    "    > `````",
  ].join("\n")
const documentedMarkdown = (source: string) =>
  [markdown(source), "", "````markdown", "```mermaid-flow", source, "```", "````"].join("\n")

let browser: Browser
let quartzSource: string
let engineSource: string
let obsidianSource: string
let svgSource: string

test.before(async () => {
  const bundle = await build({
    entryPoints: [path.join(here, "browser.inline.ts")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
  })
  quartzSource = bundle.outputFiles[0].text
  ;[engineSource, obsidianSource, svgSource] = await Promise.all([
    readFile(path.join(here, "generated/engine.js"), "utf8"),
    readFile(path.join(here, "../../../Vault/.obsidian/plugins/mermaid-flow/main.js"), "utf8"),
    readFile(path.join(here, "phase0/fixtures/obsidian/minimal-light.svg"), "utf8"),
  ])
  browser = await chromium.launch({ headless: true })
})

test.after(async () => browser?.close())

const pageWithLoader = async (): Promise<Page> => {
  const page = await browser.newPage()
  await page.route("**/static/mermaid-flow/*", () => {})
  await page.setContent('<base href="https://devbook.test/"><main id=content></main>')
  await page.evaluate("globalThis.__name = value => value")
  await page.evaluate(() => {
    const NativeObserver = MutationObserver
    const observations: Element[] = []
    class TrackedObserver extends NativeObserver {
      observe(target: Node, options?: MutationObserverInit): void {
        if (target instanceof Element) observations.push(target)
        super.observe(target, options)
      }
    }
    Object.assign(globalThis, {
      MutationObserver: TrackedObserver,
      mermaidFlowObservations: observations,
    })
  })
  await page.addScriptTag({ content: quartzSource })
  return page
}

const addPair = async (page: Page, source = validSource) =>
  page.evaluate(
    ({ source, svg }) => {
      const root = document.createElement("pre")
      root.dataset.mermaidFlowPair = "flow"
      root.innerHTML = svg
      const mount = document.createElement("div")
      mount.className = "mermaid-flow-mount"
      mount.dataset.mermaidFlowPair = "flow"
      mount.dataset.config = source
      document.querySelector("#content")!.replaceChildren(root, mount)
    },
    { source, svg: svgSource },
  )

const dispatchAssets = async (page: Page) => {
  await page.addScriptTag({ content: engineSource })
  await page.evaluate(() => {
    document.querySelector('link[data-mermaid-flow-style="1"]')!.dispatchEvent(new Event("load"))
    document.querySelector('script[data-mermaid-flow-engine="1"]')!.dispatchEvent(new Event("load"))
  })
}

const settle = (page: Page) =>
  page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))

test("Quartz loader survives navigation with one persistent asset pair and pair-local teardown", async () => {
  const page = await pageWithLoader()
  try {
    assert.equal(
      await page
        .locator('link[data-mermaid-flow-style="1"], script[data-mermaid-flow-engine="1"]')
        .count(),
      0,
    )

    await addPair(page)
    await page.evaluate(() => document.dispatchEvent(new Event("render")))
    const firstAssets = await page.evaluate(() => {
      const link = document.querySelector('link[data-mermaid-flow-style="1"]')!
      const script = document.querySelector('script[data-mermaid-flow-engine="1"]')!
      link.id = "original-flow-style"
      script.id = "original-flow-engine"
      return {
        links: document.querySelectorAll('link[data-mermaid-flow-style="1"][data-persist]').length,
        scripts: document.querySelectorAll('script[data-mermaid-flow-engine="1"][data-persist]')
          .length,
      }
    })
    assert.deepEqual(firstAssets, { links: 1, scripts: 1 })

    await page.evaluate(() => document.dispatchEvent(new Event("prenav")))
    await addPair(page, JSON.stringify({ version: 1, for: "other" }))
    await page.evaluate(() => document.dispatchEvent(new Event("nav")))
    await addPair(page)
    await page.evaluate(() => document.dispatchEvent(new Event("render")))
    assert.deepEqual(
      await page.evaluate(() => ({
        links: document.querySelectorAll('link[data-mermaid-flow-style="1"]').length,
        scripts: document.querySelectorAll('script[data-mermaid-flow-engine="1"]').length,
        sameLink: document.querySelector('link[data-mermaid-flow-style="1"]')?.id,
        sameScript: document.querySelector('script[data-mermaid-flow-engine="1"]')?.id,
      })),
      {
        links: 1,
        scripts: 1,
        sameLink: "original-flow-style",
        sameScript: "original-flow-engine",
      },
    )

    await dispatchAssets(page)
    await settle(page)
    assert.deepEqual(
      await page.evaluate(() => ({
        runtimes: document.querySelectorAll(".mermaid-flow-runtime").length,
        observers: (
          globalThis as typeof globalThis & { mermaidFlowObservations: Element[] }
        ).mermaidFlowObservations.map((element) => ({
          body: element === document.body,
          pair: element.dataset.mermaidFlowPair,
        })),
      })),
      { runtimes: 1, observers: [{ body: false, pair: "flow" }] },
    )

    await page.evaluate(() => {
      const pair = document.querySelector<HTMLElement>('pre[data-mermaid-flow-pair="flow"]')!
      const svg = pair.querySelector("svg")!
      svg.replaceWith(svg.cloneNode(true))
    })
    await settle(page)
    assert.equal(await page.locator(".mermaid-flow-runtime").count(), 1)
    assert.ok(await page.locator('[data-mermaid-flow-owned="motion"]').count())

    await page.evaluate(() => document.dispatchEvent(new Event("prenav")))
    assert.equal(await page.locator(".mermaid-flow-runtime").count(), 0)

    await page.evaluate(() => {
      const cleanups: Array<() => void> = []
      document.querySelector("#content")!.replaceChildren()
      ;(window as typeof window & { addCleanup?: (cleanup: () => void) => void }).addCleanup = (
        cleanup,
      ) => cleanups.push(cleanup)
      document.dispatchEvent(new Event("nav"))
      ;(
        globalThis as typeof globalThis & { capturedCleanups?: Array<() => void> }
      ).capturedCleanups = cleanups
    })
    assert.equal(
      await page.evaluate(
        () =>
          (globalThis as typeof globalThis & { capturedCleanups: Array<() => void> })
            .capturedCleanups.length,
      ),
      1,
    )
  } finally {
    await page.close()
  }
})

for (const failedAsset of ["style", "engine"] as const) {
  test(`Quartz reports an independent ${failedAsset} load failure locally`, async () => {
    const page = await pageWithLoader()
    try {
      await addPair(page)
      await page.evaluate(() => document.dispatchEvent(new Event("render")))
      await page.evaluate((asset) => {
        const selector =
          asset === "style"
            ? 'link[data-mermaid-flow-style="1"]'
            : 'script[data-mermaid-flow-engine="1"]'
        document.querySelector(selector)!.dispatchEvent(new Event("error"))
      }, failedAsset)
      await settle(page)
      assert.equal(await page.locator(".mermaid-flow-diagnostic").count(), 1)
      assert.match(
        (await page.locator(".mermaid-flow-diagnostic").textContent()) ?? "",
        failedAsset === "style" ? /engine\.css/u : /engine\.js/u,
      )
    } finally {
      await page.close()
    }
  })
}

test("Quartz renders one inert escaped runtime-schema-invalid diagnostic", async () => {
  const page = await pageWithLoader()
  try {
    const attack = '<img src=x onerror="globalThis.injected=true">'
    await addPair(page, JSON.stringify({ version: 1, for: "flow", [attack]: true }))
    await page.evaluate(() => document.dispatchEvent(new Event("render")))
    await dispatchAssets(page)
    await settle(page)
    assert.deepEqual(
      await page.evaluate(() => ({
        diagnostics: document.querySelectorAll(".mermaid-flow-diagnostic").length,
        images: document.querySelectorAll("img").length,
        injected: (globalThis as typeof globalThis & { injected?: boolean }).injected ?? false,
        text: document.querySelector(".mermaid-flow-diagnostic")?.textContent,
      })),
      {
        diagnostics: 1,
        images: 0,
        injected: false,
        text: `Mermaid Flow: $.${attack}: unknown field`,
      },
    )
  } finally {
    await page.close()
  }
})

for (const failure of adapterFailures) {
  test(`Quartz retains the local adapter diagnostic: ${failure.message}`, async () => {
    const page = await pageWithLoader()
    try {
      await addPair(page, failure.source)
      await page.evaluate(() => document.dispatchEvent(new Event("render")))
      await dispatchAssets(page)
      await settle(page)
      assert.deepEqual(
        await page.evaluate(() => ({
          diagnostics: document.querySelectorAll(".mermaid-flow-diagnostic").length,
          images: document.querySelectorAll("img").length,
          injected: (globalThis as typeof globalThis & { injected?: boolean }).injected ?? false,
          text: document.querySelector(".mermaid-flow-diagnostic")?.textContent,
        })),
        { diagnostics: 1, images: 0, injected: false, text: failure.message },
      )
    } finally {
      await page.close()
    }
  })
}

test("generated Obsidian processor owns local readiness, replacement, diagnostics, and teardown", async () => {
  const page = await browser.newPage()
  try {
    await page.setContent("<main id=content></main>")
    await page.evaluate("globalThis.__name = value => value")
    await page.evaluate(() => {
      const NativeMutationObserver = MutationObserver
      const NativeResizeObserver = ResizeObserver
      const observers = new Set<MutationObserver>()
      const resizers = new Set<ResizeObserver>()
      const mediaListeners = new Set<EventListener>()
      const frames = new Set<number>()
      const timeouts = new Set<number>()
      const nativeRequestAnimationFrame = requestAnimationFrame.bind(window)
      const nativeCancelAnimationFrame = cancelAnimationFrame.bind(window)
      const nativeSetTimeout = setTimeout.bind(window)
      const nativeClearTimeout = clearTimeout.bind(window)
      class TrackedMutationObserver extends NativeMutationObserver {
        constructor(callback: MutationCallback) {
          super(callback)
        }
        observe(target: Node, options?: MutationObserverInit): void {
          if (target instanceof Element && target.matches(".block-language-mermaid"))
            observers.add(this)
          super.observe(target, options)
        }
        disconnect(): void {
          observers.delete(this)
          super.disconnect()
        }
      }
      class TrackedResizeObserver extends NativeResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          super(callback)
          resizers.add(this)
        }
        disconnect(): void {
          resizers.delete(this)
          super.disconnect()
        }
      }
      const media = {
        matches: false,
        addEventListener: (_type: string, listener: EventListener) => mediaListeners.add(listener),
        removeEventListener: (_type: string, listener: EventListener) =>
          mediaListeners.delete(listener),
      }
      window.requestAnimationFrame = (callback) => {
        const frame = nativeRequestAnimationFrame((time) => {
          frames.delete(frame)
          callback(time)
        })
        frames.add(frame)
        return frame
      }
      window.cancelAnimationFrame = (frame) => {
        frames.delete(frame)
        nativeCancelAnimationFrame(frame)
      }
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        const timer = nativeSetTimeout(() => {
          timeouts.delete(timer)
          if (typeof handler === "function") handler(...args)
          else globalThis.eval(handler)
        }, timeout)
        timeouts.add(timer)
        return timer
      }) as typeof window.setTimeout
      window.clearTimeout = (timer) => {
        timeouts.delete(timer)
        nativeClearTimeout(timer)
      }
      const children = new Set<{ onload(): void; onunload(): void }>()
      class MarkdownRenderChild {
        containerEl: HTMLElement
        constructor(el: HTMLElement) {
          this.containerEl = el
        }
      }
      class Plugin {
        app = {
          vault: {
            getAbstractFileByPath: () => ({}),
            cachedRead: async () => "",
          },
        }
        processor?: (source: string, el: HTMLElement, ctx: unknown) => Promise<void>
        registerMarkdownCodeBlockProcessor(
          _language: string,
          processor: (source: string, el: HTMLElement, ctx: unknown) => Promise<void>,
        ) {
          this.processor = processor
        }
        unload() {
          children.forEach((child) => child.onunload())
          children.clear()
        }
      }
      Object.assign(globalThis, {
        MutationObserver: TrackedMutationObserver,
        ResizeObserver: TrackedResizeObserver,
        matchMedia: () => media,
        obsidianHarness: { children, frames, mediaListeners, observers, resizers, timeouts },
        obsidianMock: { MarkdownRenderChild, Plugin },
      })
    })
    await page.addScriptTag({
      content: `(function(module, require) { ${obsidianSource}\n; globalThis.ObsidianPlugin = module.exports })({ exports: {} }, id => { if (id === "obsidian") return globalThis.obsidianMock; throw new Error("Unexpected require: " + id) })`,
    })
    await page.evaluate(() => {
      const PluginClass = (
        globalThis as typeof globalThis & { ObsidianPlugin: new () => { onload(): void } }
      ).ObsidianPlugin
      const plugin = new PluginClass() as InstanceType<typeof PluginClass> & {
        app: { vault: { cachedRead: () => Promise<string> } }
        processor: (source: string, el: HTMLElement, ctx: unknown) => Promise<void>
        unload(): void
      }
      plugin.onload()
      ;(globalThis as typeof globalThis & { plugin?: typeof plugin }).plugin = plugin
    })

    const runProcessor = async (
      source: string,
      includeSvg: boolean,
      sourceMarkdown = markdown(source),
      section = { lineStart: 5, lineEnd: 7 },
    ) => {
      await page.evaluate(
        async ({ source, sourceMarkdown, section, svg, includeSvg }) => {
          const root = document.createElement("div")
          root.className = "block-language-mermaid"
          if (includeSvg) root.innerHTML = svg
          const mount = document.createElement("div")
          document.querySelector("#content")!.replaceChildren(root, mount)
          const harness = (
            globalThis as typeof globalThis & {
              obsidianHarness: { children: Set<{ onload(): void; onunload(): void }> }
            }
          ).obsidianHarness
          const plugin = (
            globalThis as typeof globalThis & {
              plugin: {
                app: { vault: { cachedRead: () => Promise<string> } }
                processor: (source: string, el: HTMLElement, ctx: unknown) => Promise<void>
              }
            }
          ).plugin
          plugin.app.vault.cachedRead = async () => sourceMarkdown
          await plugin.processor(source, mount, {
            sourcePath: "Home/test.md",
            getSectionInfo: () => section,
            addChild: (child: { onload(): void; onunload(): void }) => {
              harness.children.add(child)
              child.onload()
            },
          })
        },
        { source, sourceMarkdown, section, svg: svgSource, includeSvg },
      )
      await settle(page)
    }

    await runProcessor("{", true)
    assert.equal(await page.locator(".mermaid-flow-diagnostic").count(), 1)
    assert.match((await page.locator("pre").textContent()) ?? "", /```mermaid-flow/u)

    await runProcessor(JSON.stringify({ version: 2, for: "flow" }), true)
    assert.equal(await page.locator(".mermaid-flow-diagnostic").count(), 1)
    assert.match(
      (await page.locator(".mermaid-flow-diagnostic").textContent()) ?? "",
      /\$\.version/u,
    )

    for (const failure of adapterFailures) {
      await runProcessor(failure.source, true)
      assert.deepEqual(
        await page.evaluate(() => ({
          diagnostics: document.querySelectorAll(".mermaid-flow-diagnostic").length,
          images: document.querySelectorAll("img").length,
          injected: (globalThis as typeof globalThis & { injected?: boolean }).injected ?? false,
          text: document.querySelector(".mermaid-flow-diagnostic")?.textContent,
        })),
        { diagnostics: 1, images: 0, injected: false, text: failure.message },
      )
    }

    for (const [processorSource, section] of [
      [validSource, { lineStart: 4, lineEnd: 6 }],
      [`${validSource} `, { lineStart: 5, lineEnd: 7 }],
    ] as const) {
      await runProcessor(processorSource, true, markdown(validSource), section)
      assert.equal(
        await page.locator(".mermaid-flow-diagnostic").textContent(),
        "Mermaid Flow: could not prove the exact Mermaid Flow source range",
      )
    }

    for (let cycle = 0; cycle < 3; cycle += 1) {
      const sourceMarkdown =
        cycle === 0
          ? calloutMarkdown(validSource)
          : cycle === 1
            ? documentedMarkdown(validSource)
            : markdown(validSource)
      await runProcessor(
        validSource,
        false,
        sourceMarkdown,
        cycle === 0 ? { lineStart: 9, lineEnd: 11 } : { lineStart: 5, lineEnd: 7 },
      )
      await page.evaluate((svg) => {
        document.body.classList.toggle("theme-dark")
        document.querySelector(".block-language-mermaid")!.innerHTML = svg
      }, svgSource)
      await settle(page)
      assert.equal(await page.locator(".mermaid-flow-runtime").count(), 1)

      await page.evaluate((svg) => {
        const current = document.querySelector(".block-language-mermaid svg")!
        const template = document.createElement("template")
        template.innerHTML = svg
        current.replaceWith(template.content.firstElementChild!)
      }, svgSource)
      await settle(page)
      assert.equal(await page.locator(".mermaid-flow-runtime").count(), 1)
      assert.ok(await page.locator('[data-mermaid-flow-owned="motion"]').count())

      await page.evaluate((pluginUnload) => {
        const harness = (
          globalThis as typeof globalThis & {
            obsidianHarness: { children: Set<{ onunload(): void }> }
            plugin: { unload(): void }
          }
        ).obsidianHarness
        if (pluginUnload)
          (globalThis as typeof globalThis & { plugin: { unload(): void } }).plugin.unload()
        else {
          harness.children.forEach((child) => child.onunload())
          harness.children.clear()
        }
      }, cycle === 2)
      assert.deepEqual(
        await page.evaluate(() => {
          const harness = (
            globalThis as typeof globalThis & {
              obsidianHarness: {
                children: Set<unknown>
                frames: Set<unknown>
                mediaListeners: Set<unknown>
                observers: Set<unknown>
                resizers: Set<unknown>
                timeouts: Set<unknown>
              }
            }
          ).obsidianHarness
          return {
            children: harness.children.size,
            frames: harness.frames.size,
            listeners: harness.mediaListeners.size,
            observers: harness.observers.size,
            resizers: harness.resizers.size,
            runtimes: document.querySelectorAll(".mermaid-flow-runtime").length,
            timeouts: harness.timeouts.size,
            owned: document.querySelectorAll("[data-mermaid-flow-owned]").length,
          }
        }),
        {
          children: 0,
          frames: 0,
          listeners: 0,
          observers: 0,
          resizers: 0,
          runtimes: 0,
          timeouts: 0,
          owned: 0,
        },
      )
    }
  } finally {
    await page.close()
  }
})
