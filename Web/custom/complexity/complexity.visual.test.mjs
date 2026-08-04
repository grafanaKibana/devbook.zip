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
const trieNote = await readFile(
  resolve(repoRoot, "Vault/Home/Computer Science/Data Structures/Trees/Trie.md"),
  "utf8",
)
const trieMatch = trieNote.match(/```complexity\s*\n([\s\S]*?)\n```/)
const trieConfig = trieMatch ? JSON.parse(trieMatch[1]) : null
assert.ok(trieConfig, "Trie v2 config is required")
const bundle = await build({
  stdin: {
    contents: `
      import { renderComplexityDom } from "./dom"
      import { buildComplexityViewModel } from "./model"
      export const mount = (root, input, namespace = "visual") =>
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

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(
    new URL("/computer-science/algorithms/sorting-algorithms/quick-sort", baseUrl).href,
  )
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.evaluate(
    ([input, trieInput]) => {
      const root = document.createElement("div")
      document.body.prepend(root)
      window.DevBookComplexityVisual.mount(root, input)
      const trieRoot = document.createElement("div")
      document.body.prepend(trieRoot)
      window.DevBookComplexityVisual.mount(trieRoot, trieInput, "visual-trie")
    },
    [config, trieConfig],
  )
  const figure = page.locator("#complexity-visual")
  await figure.waitFor()

  for (const width of [430, 599, 600, 1200]) {
    const layout = await figure.evaluate(async (node, inlineSize) => {
      node.style.inlineSize = `${inlineSize}px`
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const variables = node.querySelector(".complexity__variables")
      const tabs = [...node.querySelectorAll(".complexity__tab")]
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
        labels: tabs.map((tab) => tab.textContent.trim()),
        selected: tabs.map((tab) => tab.getAttribute("aria-selected")),
        tabHeights: tabs.map((tab) => tab.getBoundingClientRect().height),
        visible: groups
          .filter((group) => !group.hidden)
          .map((group) => group.dataset.complexityResource),
        panelWidth: groups.find((group) => !group.hidden)?.getBoundingClientRect().width ?? 0,
        overflowOwners: overflowOwners.map((element) => element.className),
        nestedScrollers: plotWraps.filter((element) => {
          const overflow = getComputedStyle(element).overflowX
          return overflow === "auto" || overflow === "scroll"
        }).length,
        variableText: variables?.textContent?.trim() ?? "",
        variableOverflows: variables ? variables.scrollWidth > variables.clientWidth + 1 : true,
      }
    }, width)

    assert.deepEqual(layout.labels, ["Time", "Space"], `${width}px tab order`)
    assert.deepEqual(layout.selected, ["true", "false"], `${width}px Time selected first`)
    assert.deepEqual(layout.visible, ["time"], `${width}px one panel at a time`)
    assert.ok(layout.panelWidth >= 320, `${width}px minimum plot width`)
    assert.ok(
      layout.tabHeights.every((height) => height >= 44),
      `${width}px tab target size`,
    )
    assert.equal(layout.nestedScrollers, 0, `${width}px nested scrollers`)
    assert.deepEqual(layout.overflowOwners, [], `${width}px must fit without scrolling`)
    assert.match(layout.variableText, /n\s*number of input elements/, `${width}px variable key`)
    assert.equal(layout.variableOverflows, false, `${width}px variable key overflow`)
  }

  const trieFigure = page.locator("#complexity-visual-trie")
  await trieFigure.waitFor()
  for (const width of [430, 600, 1200]) {
    const escaping = await trieFigure.evaluate(async (node, inlineSize) => {
      node.style.inlineSize = `${inlineSize}px`
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const escaped = []
      for (const tab of node.querySelectorAll(".complexity__tab")) {
        tab.click()
        const resource = node.querySelector(".complexity__resource:not([hidden])")
        const bounds = resource.getBoundingClientRect()
        const cells = resource.querySelectorAll(
          ".complexity__legend-entry, .complexity__legend-group-label",
        )
        for (const cell of cells) {
          const rect = cell.getBoundingClientRect()
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) {
            escaped.push(`${tab.textContent.trim()}: ${cell.textContent.trim()}`)
          }
        }
      }
      return escaped
    }, width)
    assert.deepEqual(escaping, [], `${width}px legend text must stay inside its panel`)
  }

  const time = figure.locator('[data-complexity-resource="time"]')
  const space = figure.locator('[data-complexity-resource="space"]')
  const tabs = figure.locator(".complexity__tab")

  await tabs.first().focus()
  await page.keyboard.press("ArrowRight")
  assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true")
  await space.waitFor({ state: "visible" })
  await time.waitFor({ state: "hidden" })
  await page.keyboard.press("ArrowLeft")
  await time.waitFor({ state: "visible" })
  await space.waitFor({ state: "hidden" })

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
