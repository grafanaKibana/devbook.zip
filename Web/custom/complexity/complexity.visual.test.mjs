import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { build } from "esbuild"
import { chromium } from "playwright"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "../../..")
const baseUrlIndex = process.argv.indexOf("--base-url")
const outputIndex = process.argv.indexOf("--output-dir")
const baseUrl = baseUrlIndex >= 0 ? process.argv[baseUrlIndex + 1] : undefined
const outputRoot = resolve(
  process.cwd(),
  outputIndex >= 0
    ? process.argv[outputIndex + 1]
    : "../.omx/evidence/steptrace-visual-refinement/complexity",
)
assert.ok(baseUrl, "usage: npm run complexity:visual -- --base-url http://127.0.0.1:8085")

async function readConfig(path) {
  const source = await readFile(join(repoRoot, path), "utf8")
  const match = source.match(/```complexity\s*\n([\s\S]*?)\n```/)
  assert.ok(match, `${path} complexity config`)
  return JSON.parse(match[1])
}

const fixtures = await Promise.all(
  [
    ["two-heaps", "Vault/Home/Computer Science/Algorithms/Patterns/Two Heaps.md", [1200, 375], true],
    ["a-star", "Vault/Home/Computer Science/Algorithms/Graph Algorithms/A-Star Search.md", [1200, 375], true],
    ["bellman-ford", "Vault/Home/Computer Science/Algorithms/Graph Algorithms/Bellman-Ford.md", [1200, 375], true],
    [
      "bidirectional-search",
      "Vault/Home/Computer Science/Algorithms/Graph Algorithms/Bidirectional Search.md", [1200, 375], true,
    ],
    [
      "articulation-points-and-bridges",
      "Vault/Home/Computer Science/Algorithms/Graph Algorithms/Articulation Points and Bridges.md", [1200, 375], true,
    ],
    ["quick-sort", "Vault/Home/Computer Science/Algorithms/Sorting Algorithms/Quick Sort.md", [430, 599, 600, 1200], true],
    ["trie", "Vault/Home/Computer Science/Data Structures/Trees/Trie.md", [430, 600, 1200], false],
    ["interpolation-search", "Vault/Home/Computer Science/Algorithms/Search Algorithms/Interpolation Search.md", [430, 600, 1200], false],
  ].map(async ([id, path, widths, flattened]) => ({ id, widths, flattened, config: await readConfig(path) })),
)

const bundle = await build({
  stdin: {
    contents: `
      import { renderComplexityDom } from "./dom"
      import { buildComplexityViewModel } from "./model"
      export const mount = (root, input, namespace) =>
        renderComplexityDom(root, buildComplexityViewModel(input, namespace))
    `,
    resolveDir: here,
    sourcefile: "complexity-visual-entry.ts",
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  globalName: "DevBookComplexityVisual",
  target: "es2022",
})
const obsidianCss = await readFile(
  join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
  "utf8",
)
const fixtureCss = `
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body { padding: 24px; background: var(--background-primary); color: var(--text-normal); }
  :root {
    --background-primary: #fff; --background-secondary: #edf0ea;
    --text-normal: #26311f; --text-muted: #6e7868; --text-faint: #9aa294;
    --background-modifier-border: #cdd3c8; --interactive-accent: #4c8000;
    --interactive-accent-hover: #9bd42f; --text-on-accent: #fff;
    --font-text: "Source Sans 3", sans-serif; --font-monospace: "IBM Plex Mono", monospace;
  }
  .theme-dark {
    --background-primary: #171b15; --background-secondary: #242a21;
    --text-normal: #e8ece5; --text-muted: #aab2a5; --text-faint: #737d6d;
    --background-modifier-border: #465040; --interactive-accent: #84cc16;
    --interactive-accent-hover: #b6e75d; --text-on-accent: #17200f;
  }
  .complexity-fixture {
    max-width: 100%; margin: 0 auto;
    background: var(--background-primary); color: var(--text-normal);
  }
`
const route = new URL("/computer-science/algorithms/sorting-algorithms/quick-sort", baseUrl).href
const settle = (page) =>
  page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  )

async function mountFixture(page, host, theme, fixture, width) {
  if (host === "quartz") {
    await page.goto(route)
    await page.evaluate(
      (nextTheme) => document.documentElement.setAttribute("saved-theme", nextTheme),
      theme,
    )
    await page.evaluate(() => {
      document.querySelectorAll(".complexity-fixture").forEach((node) => node.remove())
      const root = document.createElement("div")
      root.className = "complexity-fixture"
      root.style.marginBlockStart = "5rem"
      document.body.prepend(root)
    })
  } else {
    await page.setContent(
      `<!doctype html><html><head><style>${fixtureCss}\n${obsidianCss}</style></head><body><article class="complexity-fixture markdown-rendered theme-${theme}"></article></body></html>`,
    )
  }
  await page.locator(".complexity-fixture").evaluate((node, inlineSize) => {
    node.style.inlineSize = `${inlineSize}px`
  }, width)
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.evaluate(
    ({ config, namespace }) => {
      globalThis.__complexityHandle = globalThis.DevBookComplexityVisual.mount(
        document.querySelector(".complexity-fixture"),
        config,
        namespace,
      )
    },
    { config: fixture.config, namespace: `${host}-${theme}-${fixture.id}-${width}` },
  )
  await page.locator(".complexity-fixture .complexity").waitFor()
  await settle(page)
}

async function metricsFor(page, resourceKey) {
  return page.locator(".complexity-fixture .complexity").evaluate((figure, key) => {
    const tabs = [...figure.querySelectorAll(".complexity__tab")]
    tabs[key === "time" ? 0 : 1].click()
    const resource = figure.querySelector(`[data-complexity-resource="${key}"]`)
    const variables = figure.querySelector(".complexity__variables")
    const resources = figure.querySelector(".complexity__resources")
    const legend = resource.querySelector(".complexity__legend")
    const rect = (node) => {
      const value = node.getBoundingClientRect()
      return {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      }
    }
    const overflow = [
      figure,
      resources,
      resource,
      resource.querySelector(".complexity__plot-wrap"),
      legend,
      variables,
    ]
      .filter(Boolean)
      .map((node) => ({
        className: node.className,
        x: node.scrollWidth > node.clientWidth + 1,
        y: node.scrollHeight > node.clientHeight + 1,
      }))
      .filter(({ x, y }) => x || y)
    const visibleText = [...figure.querySelectorAll("*")].filter((node) => {
      const bounds = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return (
        node.children.length === 0 &&
        node.textContent.trim() &&
        bounds.width > 0 &&
        bounds.height > 0 &&
        style.display !== "none"
      )
    })
    return {
      tabs: tabs.map((tab) => ({
        text: tab.textContent.trim(),
        selected: tab.getAttribute("aria-selected"),
        height: tab.getBoundingClientRect().height,
      })),
      visible: [...figure.querySelectorAll(".complexity__resource:not([hidden])")].map(
        (node) => node.dataset.complexityResource,
      ),
      tabPanels: [...figure.querySelectorAll(".complexity__resource")].map((node) => ({
        role: node.getAttribute("role"),
        labelledBy: node.getAttribute("aria-labelledby"),
      })),
      variablesAfterResources: resources.nextElementSibling === variables,
      variablesBelowLegend: rect(variables).top >= rect(legend).bottom - 1,
      variableCount: figure.querySelectorAll(".complexity__variables").length,
      legendGroups: legend.querySelectorAll(".complexity__legend-group").length,
      groupedLabels: legend.querySelectorAll(".complexity__legend-group-label").length,
      legendLabels: [...legend.querySelectorAll(".complexity__legend-entry")].map((node) =>
        node.textContent.trim(),
      ),
      plotted: legend.querySelectorAll(".complexity__legend-button").length,
      bands: resource.querySelectorAll(".complexity__legend-entry.is-banded").length,
      semantic: resource.querySelectorAll(".complexity__legend-static").length,
      legendRoleFonts: [...new Set([...legend.querySelectorAll(".complexity__legend-label")].map((node) => getComputedStyle(node).fontFamily))],
      legendFormulaFonts: [...new Set([...legend.querySelectorAll(".complexity__legend-formula")].map((node) => getComputedStyle(node).fontFamily))],
      bodyFont: getComputedStyle(figure).fontFamily,
      legendEscapes: [...legend.querySelectorAll(".complexity__legend-entry, .complexity__legend-group-label")]
        .filter((node) => {
          const bounds = node.getBoundingClientRect()
          const owner = resource.getBoundingClientRect()
          return bounds.left < owner.left - 1 || bounds.right > owner.right + 1
        })
        .map((node) => node.textContent.trim()),
      highlightedCurves: [...resource.querySelectorAll('.complexity__curve:not([data-context="true"])')].map((node) => node.dataset.curveId),
      fonts: [...new Set(visibleText.map((node) => getComputedStyle(node).fontFamily))].sort(),
      weights: [...new Set(visibleText.map((node) => getComputedStyle(node).fontWeight))].sort(),
      overflow,
      bounds: {
        figure: rect(figure),
        resource: rect(resource),
        legend: rect(legend),
        variables: rect(variables),
      },
    }
  }, resourceKey)
}

function assertFixtureMetrics(fixture, resource, metrics, context) {
  assert.deepEqual(
    metrics.tabs.map(({ text }) => text),
    ["Time", "Space"],
    `${context} tab order`,
  )
  assert.deepEqual(metrics.visible, [resource], `${context} visible resource`)
  assert.ok(
    metrics.tabs.every(({ height }) => height >= 44),
    `${context} tab targets`,
  )
  assert.ok(
    metrics.tabPanels.every(({ role, labelledBy }) => role === "tabpanel" && labelledBy),
    `${context} tabpanel relationships`,
  )
  assert.equal(metrics.variablesAfterResources, true, `${context} variable DOM order`)
  assert.equal(metrics.variablesBelowLegend, true, `${context} variables below visible legend`)
  assert.equal(metrics.variableCount, 1, `${context} one variable definition block`)
  if (fixture.flattened) {
    assert.equal(metrics.legendGroups, 1, `${context} one legend row`)
    assert.equal(metrics.groupedLabels, 0, `${context} flattened legend`)
  }
  assert.deepEqual(
    metrics.overflow.filter(({ x }) => x),
    [],
    `${context} horizontal overflow`,
  )
  assert.ok(metrics.fonts.length <= 2, `${context} font roles ${metrics.fonts.join(", ")}`)
  assert.deepEqual(metrics.legendRoleFonts, [metrics.bodyFont], `${context} legend label body role`)
  assert.ok(metrics.legendFormulaFonts.length === 1, `${context} one legend formula role`)
  assert.notEqual(metrics.legendFormulaFonts[0], metrics.bodyFont, `${context} legend formula mono role`)
  assert.deepEqual(metrics.legendEscapes, [], `${context} legend text containment`)
  assert.ok(
    metrics.weights.every((weight) => weight === "400" || weight === "600"),
    `${context} weights ${metrics.weights.join(", ")}`,
  )

  if (fixture.id === "a-star") {
    assert.deepEqual(
      metrics.legendLabels.map((label) => label.split(":")[0]),
      ["Best", "Estimate", "Worst"],
    )
    assert.equal(metrics.plotted, 2)
    assert.equal(metrics.semantic, 1)
    assert.equal(metrics.bands, 0)
  } else if (fixture.id === "bellman-ford" && resource === "time") {
    assert.deepEqual(
      metrics.legendLabels.map((label) => label.split(":")[0]),
      ["Best", "Average", "Worst"],
    )
    assert.equal(metrics.plotted, 2)
    assert.equal(metrics.semantic, 1)
    assert.equal(metrics.bands, 1)
  } else if (fixture.id === "bidirectional-search") {
    assert.deepEqual(
      metrics.legendLabels.map((label) => label.split(":")[0]),
      ["Best", "Estimate", "Worst"],
    )
    assert.equal(metrics.plotted, 2)
    assert.equal(metrics.semantic, 1)
  } else if (fixture.id === "interpolation-search" && resource === "time") {
    assert.ok(metrics.highlightedCurves.includes("log-log-n"), `${context} merged log-log path`)
  } else if (fixture.id === "interpolation-search" && resource === "space") {
    assert.deepEqual(metrics.legendLabels.map((label) => label.split(":")[0]), ["Worst/Average/Best"])
    assert.equal(metrics.highlightedCurves.length, 1, `${context} one merged space path`)
  }
}

const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const host of ["quartz", "obsidian"]) {
    for (const theme of ["light", "dark"]) {
      for (const fixture of fixtures) {
        for (const width of fixture.widths) {
          const page = await browser.newPage({
            viewport: { width: Math.max(width + 48, 423), height: 1000 },
            colorScheme: theme,
          })
          await mountFixture(page, host, theme, fixture, width)
          for (const resource of ["time", "space"]) {
            const metrics = await metricsFor(page, resource)
            const context = `${host}/${theme}/${fixture.id}/${width}/${resource}`
            assertFixtureMetrics(fixture, resource, metrics, context)
            await settle(page)
            const directory = join(outputRoot, host, theme)
            await mkdir(directory, { recursive: true })
            await page
              .locator(".complexity-fixture")
              .screenshot({ path: join(directory, `${fixture.id}-${width}-${resource}.png`) })
            results.push({ host, theme, algorithm: fixture.id, width, resource, ...metrics })
          }

          const tabs = page.locator(".complexity-fixture .complexity__tab")
          await tabs.first().focus()
          await page.keyboard.press("ArrowRight")
          assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true")
          const visibleLegendButton = page
            .locator(
              ".complexity-fixture .complexity__resource:not([hidden]) .complexity__legend-button",
            )
            .first()
          if (await visibleLegendButton.count()) {
            await visibleLegendButton.focus()
            await page.keyboard.press("Enter")
            assert.equal(await visibleLegendButton.getAttribute("aria-pressed"), "true")
            assert.equal(
              await page.locator('.complexity__resource[hidden] .complexity__legend-button[aria-pressed="true"]').count(),
              0,
              `${host}/${theme}/${fixture.id}/${width} cross-resource isolation`,
            )
          }
          await page.evaluate(() => globalThis.__complexityHandle.destroy())
          await page.close()
        }
      }
    }
  }
} finally {
  await browser.close()
}

await mkdir(outputRoot, { recursive: true })
await writeFile(join(outputRoot, "metrics.json"), `${JSON.stringify(results, null, 2)}\n`)
console.log(`complexity visual: ${results.length} resource states passed; evidence ${outputRoot}`)
