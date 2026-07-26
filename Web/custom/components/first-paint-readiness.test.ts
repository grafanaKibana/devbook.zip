import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
import { HomepageFit } from "./homepage-fit"
import { NavScopeDropdown } from "./nav-scope-dropdown"
import { PageReveal } from "./page-reveal"

const resource = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value.join("\n") : (value ?? "")

test("hard-load reveal fails open without the Font Loading API", async () => {
  const rootAttributes = new Map<string, string>()
  const articleAttributes = new Map<string, string>()
  const root = {
    setAttribute: (name: string, value: string) => rootAttributes.set(name, value),
    removeAttribute: (name: string) => rootAttributes.delete(name),
  }
  const article = {
    offsetWidth: 0,
    removeAttribute: (name: string) => articleAttributes.delete(name),
    setAttribute: (name: string, value: string) => articleAttributes.set(name, value),
  }
  const context: Record<string, unknown> = {
    document: {
      documentElement: root,
      addEventListener() {},
      querySelector: () => article,
    },
    Promise,
    requestIdleCallback: (callback: () => void) => callback(),
  }
  context.window = context

  const component = PageReveal(undefined)
  vm.runInNewContext(resource(component.beforeDOMLoaded), context)
  vm.runInNewContext(resource(component.afterDOMLoaded), context)
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.equal(rootAttributes.has("data-page-reveal-first-paint"), false)
  assert.equal(articleAttributes.get("data-reveal"), "initial")
})

test("Explorer waits for fonts before revealing icons and text together", async () => {
  const rootAttributes = new Map<string, string>()
  let resolveFonts: () => void = () => {}
  const fontsReady = new Promise<void>((resolve) => {
    resolveFonts = resolve
  })
  const context: Record<string, unknown> = {
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => rootAttributes.set(name, value),
        removeAttribute: (name: string) => rootAttributes.delete(name),
      },
      fonts: { ready: fontsReady },
    },
    Promise,
    clearTimeout() {},
    setTimeout: () => 1,
  }
  context.window = context

  const component = NavScopeDropdown(undefined)
  vm.runInNewContext(resource(component.beforeDOMLoaded), context)
  ;(
    context.window as { __devbookExplorerFirstPaint: { release(): void } }
  ).__devbookExplorerFirstPaint.release()
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.equal(rootAttributes.get("data-explorer-first-paint"), "pending")

  resolveFonts()
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.equal(rootAttributes.has("data-explorer-first-paint"), false)
})

test("homepage fit ignores temporary card transform overflow", () => {
  const dataset: Record<string, string> = { slug: "index" }
  const cardBody = {
    clientHeight: 120,
    clientWidth: 200,
    scrollHeight: 120,
    scrollWidth: 200,
    getBoundingClientRect: () => ({ top: 0, bottom: 120, left: 0, right: 200 }),
  }
  const cards = [
    {
      offsetTop: 100,
      offsetHeight: 200,
      querySelector: () => cardBody,
      querySelectorAll: () => [],
    },
    {
      offsetTop: 500,
      offsetHeight: 241,
      querySelector: () => cardBody,
      querySelectorAll: () => [],
    },
  ]
  const grid = {
    clientHeight: 641,
    clientWidth: 800,
    offsetTop: 100,
    scrollHeight: 647,
    scrollWidth: 800,
    querySelectorAll: (selector: string) =>
      selector === ":scope > .dc-topic-card" || selector === ".dc-topic-card" ? cards : [],
  }
  const footer = { getBoundingClientRect: () => ({ bottom: 900 }) }
  const center = { clientHeight: 800, clientWidth: 800, scrollHeight: 800, scrollWidth: 800 }
  const quartzBody = {
    clientHeight: 900,
    clientWidth: 1200,
    offsetHeight: 900,
    scrollHeight: 900,
    scrollWidth: 1200,
    getBoundingClientRect: () => ({ bottom: 900 }),
    querySelector: (selector: string) => (selector.endsWith("footer") ? footer : center),
  }
  const body = {
    dataset,
    querySelector: (selector: string) =>
      selector === ".dc-topic-grid"
        ? grid
        : selector === ".page > #quartz-body"
          ? quartzBody
          : null,
    removeAttribute: (name: string) => {
      if (name === "data-home-fit") delete dataset.homeFit
      if (name === "data-home-fit-overflow") delete dataset.homeFitOverflow
    },
  }
  const context: Record<string, unknown> = {
    document: {
      body,
      documentElement: { scrollHeight: 900 },
      addEventListener() {},
    },
    getComputedStyle: () => ({
      paddingTop: "0",
      paddingBottom: "0",
      paddingLeft: "0",
      paddingRight: "0",
    }),
    matchMedia: () => ({ matches: true }),
    requestAnimationFrame: (callback: () => void) => {
      callback()
      return 1
    },
    cancelAnimationFrame() {},
    addEventListener() {},
    ResizeObserver: class {
      disconnect() {}
      observe() {}
    },
    innerHeight: 900,
  }
  context.window = context

  const component = HomepageFit(undefined)
  vm.runInNewContext(resource(component.afterDOMLoaded), context)

  assert.equal(dataset.homeFit, "full")
  assert.equal(dataset.homeFitOverflow, undefined)
})
