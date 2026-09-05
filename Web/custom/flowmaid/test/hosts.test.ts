import assert from "node:assert/strict"
import test from "node:test"

import esbuild from "esbuild"
import { chromium } from "playwright"

import { FlowmaidBlock } from "../src/hosts/quartz/transformer"
import { read, repo } from "./helpers"

test("Quartz transformer pairs valid metadata locally and leaves Mermaid source intact", () => {
  const source = "graph LR\nA-->B\n%% flowmaid\n%% sources: [{ rate: 1, nodes: [A] }]\n%% /flowmaid"
  const tree: any = {
    type: "root",
    children: [
      {
        type: "code",
        lang: "mermaid",
        value: source,
        position: { start: { line: 2, column: 1 }, end: { line: 8, column: 1 } },
      },
    ],
  }
  const plugin = FlowmaidBlock({} as never)
  const transform = plugin.markdownPlugins!()[0]!() as (tree: any) => void
  transform(tree)
  assert.equal(tree.children[0].value, source)
  assert.equal(tree.children[0].data.hProperties["data-flowmaid-id"], "2:1:8:1")
  assert.equal(tree.children[1].data.hProperties.className[0], "flowmaid-mount")
  assert.equal(
    JSON.parse(tree.children[1].data.hProperties["data-flowmaid-program"]).version,
    undefined,
  )
})

test("Quartz invalid metadata produces one escaped local diagnostic and no mount", () => {
  const tree: any = {
    type: "root",
    children: [
      { type: "code", lang: "mermaid", value: "%% flowmaid\nnot a comment\n%% /flowmaid" },
    ],
  }
  const transform = FlowmaidBlock({} as never).markdownPlugins!()[0]!() as (tree: any) => void
  transform(tree)
  assert.equal(tree.children.length, 2)
  assert.deepEqual(tree.children[1].data.hProperties.className, ["flowmaid-diagnostic"])
  assert.match(tree.children[1].data.hChildren[0].value, /^Flowmaid:/u)
})

test("Obsidian delegates render-child onload exclusively to ctx.addChild", () => {
  const source = read("Web/custom/flowmaid/src/hosts/obsidian/main.cts")
  assert.match(source, /ctx\.addChild\(child\)/u)
  assert.doesNotMatch(source, /ctx\.addChild\(child\)\s*\n\s*child\.onload\(\)/u)
  assert.match(source, /el\.matches\((?:selector|["']\.block-language-mermaid, \.mermaid["'])\)/u)
})

test("host closures are pair-local and avoid forbidden global lifecycle APIs", () => {
  const sources = [
    "Web/custom/flowmaid/src/hosts/obsidian/main.cts",
    "Web/custom/flowmaid/src/hosts/quartz/runtime.ts",
  ]
    .map(read)
    .join("\n")
  assert.doesNotMatch(sources, /pauseAnimations\s*\(/u)
  assert.doesNotMatch(sources, /observe\s*\(\s*document\.body/u)
  assert.match(
    read("Web/custom/flowmaid/src/hosts/quartz/loader.inline.ts"),
    /import\(\\`\/static\/flowmaid\/flowmaid\.js\\`\)/u,
  )
})

test("Obsidian postprocessor waits for Mermaid to render inside its local section", async () => {
  const built = await esbuild.build({
    stdin: {
      contents:
        'import Plugin from "./src/hosts/obsidian/main.cts"; window.FlowmaidPlugin = Plugin',
      resolveDir: `${repo}/Web/custom/flowmaid`,
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
    plugins: [
      {
        name: "obsidian-test-host",
        setup(build) {
          build.onResolve({ filter: /^obsidian$/ }, () => ({
            path: "obsidian",
            namespace: "test",
          }))
          build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents: `
              export class MarkdownRenderChild { constructor(container) { this.containerEl = container } }
              export class Plugin {
                registerMarkdownPostProcessor(processor) { window.flowmaidProcessor = processor }
              }
              export class SliderComponent {
                constructor(container) { this.sliderEl = document.createElement("input"); container.append(this.sliderEl) }
                setLimits() { return this } setInstant() { return this } setDisplayFormat() { return this }
                setValue(value) { window.sliderSetCalls = (window.sliderSetCalls || 0) + 1; this.sliderEl.value = String(value); return this }
                onChange(callback) { window.sliderChange = callback; return this }
              }
            `,
          }))
        },
      },
    ],
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent('<div class="el-pre"></div>')
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0].text })
    const result = await page.evaluate(async () => {
      const markdown = [
        "```mermaid",
        "flowchart LR",
        "A --> B",
        "%% flowmaid",
        "%% controls:",
        "%%   input: { label: Input, min: 0, max: 10, value: 1, step: 1 }",
        "%% sources: [{ rate: input, nodes: [A] }]",
        "%% /flowmaid",
        "```",
      ].join("\n")
      const plugin = new (window as any).FlowmaidPlugin()
      plugin.app = {
        vault: {
          getAbstractFileByPath: () => ({}),
          cachedRead: async () => markdown,
        },
      }
      plugin.onload()
      const el = document.querySelector(".el-pre") as HTMLElement
      const pair = document.createElement("div")
      pair.className = "mermaid"
      el.append(pair)
      await (window as any).flowmaidProcessor(el, {
        sourcePath: "Kafka.md",
        getSectionInfo: () => ({ lineStart: 0, lineEnd: 8 }),
        addChild: (child: { onload(): void }) => child.onload(),
      })
      pair.innerHTML = `<svg><g class="nodes"><g class="node" id="flowchart-A-0"><rect/><text>A</text></g><g class="node" id="flowchart-B-1"><rect/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link" d="M0 0L10 0"/></g></svg>`
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
      await new Promise((resolve) => setTimeout(resolve, 20))
      const before = (window as any).sliderSetCalls
      ;(window as any).sliderChange(2)
      return {
        processed: pair.dataset.flowmaidProcessed,
        mounts: document.querySelectorAll(".flowmaid-mount").length,
        controls: document.querySelectorAll(".flowmaid-controls").length,
        diagnostics: document.querySelectorAll(".flowmaid-diagnostic").length,
        sliderSetDelta: (window as any).sliderSetCalls - before,
      }
    })
    assert.deepEqual(result, {
      processed: "1",
      mounts: 1,
      controls: 1,
      diagnostics: 0,
      sliderSetDelta: 1,
    })
  } finally {
    await browser.close()
  }
})

test("Obsidian leaves no pending observers for ordinary Markdown or plain Mermaid", async () => {
  const built = await esbuild.build({
    stdin: {
      contents:
        'import Plugin from "./src/hosts/obsidian/main.cts"; window.FlowmaidPlugin = Plugin',
      resolveDir: `${repo}/Web/custom/flowmaid`,
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
    plugins: [
      {
        name: "obsidian-test-host",
        setup(build) {
          build.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "test" }))
          build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents: `
              export class MarkdownRenderChild { constructor(container) { this.containerEl = container } }
              export class Plugin { registerMarkdownPostProcessor(processor) { window.flowmaidProcessor = processor } }
              export class SliderComponent {}
            `,
          }))
        },
      },
    ],
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(
      '<div id="ordinary"><p>text</p></div><div id="plain"><div class="mermaid"><svg></svg></div></div>',
    )
    await page.evaluate(() => {
      const NativeObserver = window.MutationObserver
      let active = 0
      window.MutationObserver = class extends NativeObserver {
        private observing = false
        observe(target: Node, options?: MutationObserverInit) {
          if (!this.observing) active += 1
          this.observing = true
          super.observe(target, options)
        }
        disconnect() {
          if (this.observing) active -= 1
          this.observing = false
          super.disconnect()
        }
      }
      ;(window as any).activeObservers = () => active
    })
    await page.addScriptTag({ content: "globalThis.__name = (value) => value" })
    await page.addScriptTag({ content: built.outputFiles[0]!.text })
    const result = await page.evaluate(async () => {
      const baseline = (window as any).activeObservers()
      let markdown = "ordinary text"
      const plugin = new (window as any).FlowmaidPlugin()
      plugin.app = {
        vault: {
          getAbstractFileByPath: () => ({}),
          cachedRead: async () => markdown,
        },
      }
      plugin.onload()
      await (window as any).flowmaidProcessor(document.querySelector("#ordinary"), {
        sourcePath: "Ordinary.md",
        getSectionInfo: () => null,
        addChild: () => {},
      })
      markdown = "```mermaid\ngraph LR\nA-->B\n```"
      await (window as any).flowmaidProcessor(document.querySelector("#plain"), {
        sourcePath: "Plain.md",
        getSectionInfo: () => ({ lineStart: 0, lineEnd: 3 }),
        addChild: () => {},
      })
      const beforeUnload = (window as any).activeObservers() - baseline
      plugin.onunload()
      return { beforeUnload, afterUnload: (window as any).activeObservers() - baseline }
    })
    assert.deepEqual(result, { beforeUnload: 0, afterUnload: 0 })
  } finally {
    await browser.close()
  }
})

test("Obsidian teardown clears diagnostics and processed markers so corrected rerenders recover", async () => {
  const built = await esbuild.build({
    stdin: {
      contents:
        'import Plugin from "./src/hosts/obsidian/main.cts"; window.FlowmaidPlugin = Plugin',
      resolveDir: `${repo}/Web/custom/flowmaid`,
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
    plugins: [
      {
        name: "obsidian-test-host",
        setup(build) {
          build.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "test" }))
          build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents: `
              export class MarkdownRenderChild { constructor(container) { this.containerEl = container } }
              export class Plugin { registerMarkdownPostProcessor(processor) { window.flowmaidProcessor = processor } }
              export class SliderComponent {
                constructor(container) { this.sliderEl = document.createElement("input"); container.append(this.sliderEl) }
                setLimits() { return this } setInstant() { return this } setDisplayFormat() { return this }
                setValue(value) { this.sliderEl.value = String(value); return this }
                onChange(callback) { this.callback = callback; return this }
              }
            `,
          }))
        },
      },
    ],
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent('<div class="mermaid"></div>')
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
      const pair = document.querySelector(".mermaid") as HTMLElement
      const validSvg =
        '<svg><g class="nodes"><g class="node" id="flowchart-A-0"><rect/><text>A</text></g><g class="node" id="flowchart-B-1"><rect/><text>B</text></g></g><g class="edgePaths"><path id="L_A_B_0" class="flowchart-link" d="M0 0L10 0"/></g></svg>'
      const fence = (body: string) =>
        `\`\`\`mermaid\ngraph LR\nA --> B\n%% flowmaid\n${body}\n%% /flowmaid\n\`\`\``
      let markdown = fence("%% sources: invalid")
      const children: Array<{ onload(): void; onunload(): void }> = []
      const plugin = new (window as any).FlowmaidPlugin()
      plugin.app = {
        vault: { getAbstractFileByPath: () => ({}), cachedRead: async () => markdown },
      }
      plugin.onload()
      const process = () =>
        (window as any).flowmaidProcessor(pair, {
          sourcePath: "Kafka.md",
          getSectionInfo: () => ({ lineStart: 0, lineEnd: markdown.split("\n").length - 1 }),
          addChild: (child: { onload(): void; onunload(): void }) => {
            children.push(child)
            child.onload()
          },
        })
      const state = () => ({
        diagnostic: document.querySelectorAll(".flowmaid-diagnostic").length,
        processed: pair.hasAttribute("data-flowmaid-processed"),
        controls: document.querySelectorAll(".flowmaid-controls").length,
      })

      await process()
      const invalid = state()
      children.at(-1)!.onunload()
      const invalidTeardown = state()

      markdown = fence("%% sources: [{ rate: 1, nodes: [A] }]")
      pair.innerHTML = validSvg
      await process()
      const correctedAfterInvalid = state()
      children.at(-1)!.onunload()

      pair.innerHTML = "<svg></svg>"
      await process()
      const adapterFailure = state()
      children.at(-1)!.onunload()
      const adapterTeardown = state()

      pair.innerHTML = validSvg
      await process()
      const correctedAfterAdapter = state()
      plugin.onunload()
      return {
        invalid,
        invalidTeardown,
        correctedAfterInvalid,
        adapterFailure,
        adapterTeardown,
        correctedAfterAdapter,
      }
    })
    assert.deepEqual(result, {
      invalid: { diagnostic: 1, processed: true, controls: 0 },
      invalidTeardown: { diagnostic: 0, processed: false, controls: 0 },
      correctedAfterInvalid: { diagnostic: 0, processed: true, controls: 1 },
      adapterFailure: { diagnostic: 1, processed: true, controls: 0 },
      adapterTeardown: { diagnostic: 0, processed: false, controls: 0 },
      correctedAfterAdapter: { diagnostic: 0, processed: true, controls: 1 },
    })
  } finally {
    await browser.close()
  }
})
