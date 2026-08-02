import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

import { build } from "esbuild"
import { chromium } from "playwright"

const baseUrlIndex = process.argv.indexOf("--base-url")
const baseUrl = baseUrlIndex >= 0 ? process.argv[baseUrlIndex + 1] : undefined
assert.ok(baseUrl, "usage: npm run complexity:visual -- --base-url http://127.0.0.1:8085")

const here = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = resolve(here, "../../..")
const note = await readFile(
  resolve(repoRoot, "Vault/Home/Computer Science/Algorithms/Sorting Algorithms/Quick Sort.md"),
  "utf8",
)
const configMatch = note.match(/```complexity\s*\n([\s\S]*?)\n```/)
const config = configMatch ? JSON.parse(configMatch[1]) : null
assert.ok(config, "Quick Sort v2 config is required")
const bundle = await build({
  stdin: {
    contents: `
      import { renderComplexityDom } from "./dom"
      import { buildComplexityViewModel } from "./model"
      export const mount = (root, input) =>
        renderComplexityDom(root, buildComplexityViewModel(input, "visual"))
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

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(
    new URL("/computer-science/algorithms/sorting-algorithms/quick-sort", baseUrl).href,
  )
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.evaluate((input) => {
    const root = document.createElement("div")
    document.body.prepend(root)
    window.DevBookComplexityVisual.mount(root, input)
  }, config)
  const figure = page.locator("#complexity-visual")
  await figure.waitFor()

  for (const width of [430, 599, 600, 1200]) {
    const layout = await figure.evaluate(async (node, inlineSize) => {
      node.style.inlineSize = `${inlineSize}px`
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const resources = node.querySelector(".complexity__resources")
      const variables = node.querySelector(".complexity__variables")
      const groups = [...node.querySelectorAll(".complexity__resource")]
      const plotWraps = [...node.querySelectorAll(".complexity__plot-wrap")]
      const overflowOwners = [...node.querySelectorAll("*")].filter((element) => {
        const overflow = getComputedStyle(element).overflowX
        return (
          (overflow === "auto" || overflow === "scroll") &&
          element.scrollWidth > element.clientWidth + 1
        )
      })
      return {
        labels: groups.map(
          (group) => group.querySelector(".complexity__resource-label")?.textContent?.trim() ?? "",
        ),
        positions: groups.map((group) => {
          const rect = group.getBoundingClientRect()
          return { left: rect.left, top: rect.top, width: rect.width }
        }),
        resourceOverflow: resources ? getComputedStyle(resources).overflowX : "missing",
        resourceScrollWidth: resources?.scrollWidth ?? 0,
        resourceClientWidth: resources?.clientWidth ?? 0,
        overflowOwners: overflowOwners.map((element) => element.className),
        nestedScrollers: plotWraps.filter((element) => {
          const overflow = getComputedStyle(element).overflowX
          return overflow === "auto" || overflow === "scroll"
        }).length,
        variableText: variables?.textContent?.trim() ?? "",
        variableOverflows: variables ? variables.scrollWidth > variables.clientWidth + 1 : true,
      }
    }, width)

    assert.deepEqual(layout.labels, ["Time", "Space"], `${width}px resource order`)
    assert.equal(layout.positions.length, 2, `${width}px resource count`)
    assert.ok(layout.positions[0].left < layout.positions[1].left, `${width}px Time must be first`)
    assert.equal(
      layout.positions[0].top,
      layout.positions[1].top,
      `${width}px columns must not stack`,
    )
    assert.equal(layout.resourceOverflow, "auto", `${width}px outer overflow owner`)
    assert.equal(layout.nestedScrollers, 0, `${width}px nested scrollers`)
    assert.match(layout.variableText, /n\s*number of input elements/, `${width}px variable key`)
    assert.equal(layout.variableOverflows, false, `${width}px variable key overflow`)
    if (width < 600) {
      assert.ok(
        layout.positions.every(({ width: column }) => column >= 320),
        `${width}px minimum plot width`,
      )
      assert.ok(layout.resourceScrollWidth > layout.resourceClientWidth, `${width}px must overflow`)
      assert.deepEqual(layout.overflowOwners, ["complexity__resources"])
    } else {
      assert.equal(layout.resourceScrollWidth, layout.resourceClientWidth, `${width}px must fit`)
      assert.deepEqual(layout.overflowOwners, [])
    }
  }

  const time = figure.locator('[data-complexity-resource="time"]')
  const space = figure.locator('[data-complexity-resource="space"]')
  await time.locator(".complexity__legend-button").first().focus()
  await page.keyboard.press("Enter")
  assert.equal(
    await time.locator(".complexity__legend-button").first().getAttribute("aria-pressed"),
    "true",
  )
  assert.ok(await time.locator(".complexity__curve.is-subtle").count())
  assert.equal(
    await space.locator('.complexity__curve:not([data-context="true"]).is-subtle').count(),
    0,
  )
} finally {
  await browser.close()
}
