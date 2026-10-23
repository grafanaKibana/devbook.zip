import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { build } from "esbuild"
import { sassPlugin } from "esbuild-sass-plugin"
import { chromium } from "playwright"
import { loadCatalogFixtures, repoRoot } from "./steptrace.catalog.mjs"

// Real generated engine and real Quartz hydration entry; no historical evidence directory.
const here = import.meta.dirname
const engine = readFileSync(join(here, "generated/engine.js"), "utf8")
const engineCss = readFileSync(join(here, "generated/engine.css"), "utf8")
const component = await build({
  entryPoints: [join(repoRoot, "Web/custom/components/steptrace.tsx")],
  bundle: true,
  format: "cjs",
  platform: "node",
  write: false,
  loader: { ".scss": "text" },
})
const module = { exports: {} }
new Function("module", "exports", component.outputFiles[0].text)(module, module.exports)
const hydrator = module.exports.Steptrace().afterDOMLoaded
const styleResult = await build({
  entryPoints: [join(repoRoot, "Web/custom/components/styles/steptrace.scss")],
  bundle: true,
  write: false,
  plugins: [sassPlugin()],
})
const css = engineCss + styleResult.outputFiles[0].text
const config = loadCatalogFixtures().get("bubble-sort")
assert.ok(config, "authored bubble-sort fixture")
const complexity = await build({
  stdin: {
    contents:
      'export {renderComplexityDom} from "./custom/complexity/dom"; export {buildComplexityViewModel} from "./custom/complexity/model"',
    resolveDir: join(repoRoot, "Web"),
  },
  bundle: true,
  format: "iife",
  globalName: "complexity",
  write: false,
})
const browser = await chromium.launch({ headless: true })
try {
  for (const width of [400, 1100]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: width === 400 ? "reduce" : "no-preference",
    })
    page.setDefaultTimeout(5000)
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.route("https://steptrace.test/**", (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith("engine.js"))
        return route.fulfill({ contentType: "text/javascript", body: engine })
      if (path.endsWith("engine.css")) return route.fulfill({ contentType: "text/css", body: css })
      return route.fulfill({
        contentType: "text/html",
        body: `<style>*{box-sizing:border-box}body{margin:0;padding:12px;--light:#fff;--lightgray:#ddd;--gray:#777;--darkgray:#222;--secondary:#528100;--bodyFont:Arial;--codeFont:monospace}</style><main id="fixture"></main>`,
      })
    })
    await page.goto("https://steptrace.test/")
    await page.evaluate((config) => {
      window.cleanups = []
      window.addCleanup = (cleanup) => window.cleanups.push(cleanup)
      const root = document.createElement("div")
      root.className = "steptrace-mount"
      root.dataset.config = JSON.stringify(config)
      document.querySelector("main").append(root)
    }, config)
    await page.addScriptTag({ content: hydrator })
    const root = page.locator(".steptrace-mount")
    await root.locator('[role="slider"][aria-label="Step"]').waitFor()
    const slider = root.getByRole("slider", { name: "Step", exact: true })
    await slider.focus()
    await page.keyboard.press("End")
    assert.equal(
      await slider.getAttribute("aria-valuenow"),
      await slider.getAttribute("aria-valuemax"),
    )
    await page.keyboard.press("Home")
    assert.equal(await slider.getAttribute("aria-valuenow"), "0")
    await page.waitForFunction(
      (compact) =>
        document.querySelector(".steptrace-mount").classList.contains("steptrace--narrow") ===
        compact,
      width < 704,
    )
    assert.equal(
      await root.evaluate((node) => node.scrollWidth <= node.clientWidth + 2),
      true,
      `root overflow at ${width}`,
    )
    assert.equal(
      await root.evaluate((node) => node.classList.contains("steptrace--reduced")),
      width === 400,
    )
    await root.getByRole("button", { name: "Play", exact: true }).click()
    await page.waitForFunction(
      () =>
        Number(
          document
            .querySelector('[role="slider"][aria-label="Step"]')
            .getAttribute("aria-valuenow"),
        ) > 0,
    )
    await root.getByRole("button", { name: "Pause", exact: true }).click()
    const pausedAt = await slider.getAttribute("aria-valuenow")
    await page.waitForTimeout(400)
    assert.equal(await slider.getAttribute("aria-valuenow"), pausedAt)
    await slider.focus()
    await page.keyboard.press("Home")
    await root.getByRole("button", { name: "Play", exact: true }).click()
    // Repeated nav/render must not double-mount; prenav and addCleanup teardown are idempotent.
    await page.evaluate(() => {
      document.dispatchEvent(new Event("nav"))
      document.dispatchEvent(new Event("render"))
    })
    assert.equal(await root.locator('[role="slider"][aria-label="Step"]').count(), 1)
    await page.evaluate(() => {
      document.dispatchEvent(new Event("prenav"))
      window.cleanups.forEach((cleanup) => cleanup())
    })
    assert.equal(await root.textContent(), "")
    await page.waitForTimeout(400)
    assert.equal(await root.textContent(), "")
    // A subsequent SPA page can hydrate independently, including local invalid input.
    await page.evaluate(() => {
      document.querySelector("main").innerHTML =
        '<div class="steptrace-mount" data-config="invalid"></div>'
      document.dispatchEvent(new Event("render"))
    })
    await page.getByText("steptrace: invalid config", { exact: false }).waitFor()
    assert.deepEqual(errors, [])
    await page.close()
  }
  const page = await browser.newPage({ reducedMotion: "reduce" })
  page.setDefaultTimeout(5000)
  await page.setContent('<div id="root"></div>')
  await page.addStyleTag({ content: css })
  await page.addScriptTag({ content: engine })
  await page.evaluate(() =>
    window.steptrace.mount(document.querySelector("#root"), { algorithm: "arrays" }),
  )
  await page.getByLabel("Array index", { exact: true }).fill("0")
  await page.getByLabel("Value to write", { exact: true }).fill("97")
  await page.getByRole("button", { name: "Write", exact: true }).click()
  await page
    .getByRole("status")
    .filter({ hasText: /Replaced array\[0\] value/ })
    .waitFor()
  await page.getByLabel("Array index", { exact: true }).fill("99")
  await page.getByRole("button", { name: "Write", exact: true }).click()
  await page
    .getByRole("status")
    .filter({ hasText: /Enter an index from/ })
    .waitFor()
  await page.getByRole("button", { name: "Reset", exact: true }).click()
  await page
    .getByRole("status")
    .filter({ hasText: /Array reset/ })
    .waitFor()
  await page.addScriptTag({ content: complexity.outputFiles[0].text })
  const complexityContract = await page.evaluate(() => {
    const root = document.querySelector("#root")
    root.replaceChildren()
    const resource = {
      mode: "cases",
      entries: ["Best", "Average", "Worst"].map((role) => ({
        kind: "case",
        role,
        formula: "O(n)",
        curveId: "linear",
      })),
    }
    const model = complexity.buildComplexityViewModel(
      {
        version: 2,
        label: "Resources",
        variables: { input: { symbol: "n", description: "input size" } },
        resources: { time: resource, space: resource },
      },
      "browser",
    )
    const handle = complexity.renderComplexityDom(root, model)
    const result = {
      label: root.querySelector("figure").getAttribute("aria-label"),
      tabs: root.querySelectorAll('[role="tab"]').length,
      panels: root.querySelectorAll('[role="tabpanel"]').length,
    }
    handle.destroy()
    return { ...result, destroyed: root.children.length === 0 }
  })
  assert.deepEqual(complexityContract, { label: "Resources", tabs: 2, panels: 2, destroyed: true })
  await page.close()
  console.log(
    "StepTrace browser smoke passed: hydration, keyboard, responsive, reduced motion, cleanup, invalid config, operations",
  )
} finally {
  await browser.close()
}
