import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
import { HomepageFit } from "./homepage-fit"

const resource = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value.join("\n") : (value ?? "")

type Log = { kind: string; name?: string; value?: string; connected: boolean }

function harness() {
  const logs: Log[] = []
  const documentListeners = new Map<string, () => void>()
  const windowListeners = new Map<string, () => void>()
  const viewportListeners = new Map<string, () => void>()
  const fontListeners = new Map<string, () => void>()
  const frames = new Map<number, () => void>()
  let nextFrame = 1
  let eligible = true
  let passingState = "counter-hidden"
  let revealCalls = 0
  let observer: FakeResizeObserver

  const connected = () => observer?.connected ?? false
  const attributes = () => {
    const values = new Map<string, string>()
    return {
      values,
      hasAttribute: (name: string) => values.has(name),
      setAttribute(name: string, value: string) {
        values.set(name, value)
        logs.push({ kind: "write", name, value, connected: connected() })
      },
      removeAttribute(name: string) {
        if (!values.delete(name)) return
        logs.push({ kind: "remove", name, connected: connected() })
      },
    }
  }
  const dataset = (node: ReturnType<typeof attributes>) =>
    new Proxy<Record<string, string>>(
      {},
      {
        get: (_, key: string) =>
          node.values.get(`data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`),
        set: (_, key: string, value: string) => {
          node.setAttribute(`data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value)
          return true
        },
      },
    )

  const retained = {
    getClientRects: () => [1],
    getBoundingClientRect: () => {
      logs.push({ kind: "read", name: "retained-rect", connected: connected() })
      return { top: 20, bottom: 80, left: 20, right: 80 }
    },
  }
  const cardBody = {
    scrollHeight: 100,
    clientHeight: 100,
    scrollWidth: 100,
    clientWidth: 100,
    getBoundingClientRect: () => {
      logs.push({ kind: "read", name: "card-body-rect", connected: connected() })
      return { top: 0, bottom: 100, left: 0, right: 100 }
    },
  }
  const card = {
    offsetTop: 0,
    offsetHeight: 100,
    querySelector: (selector: string) => (selector === ".db-card-body" ? cardBody : null),
    querySelectorAll: () => [retained],
  }
  const grid = {
    scrollWidth: 100,
    clientWidth: 100,
    offsetTop: 0,
    clientHeight: 100,
    querySelectorAll: () => [card],
  }
  const center = { scrollHeight: 100, clientHeight: 100, scrollWidth: 100, clientWidth: 100 }
  const footer = {
    getBoundingClientRect: () => {
      logs.push({ kind: "read", name: "footer-rect", connected: connected() })
      return { bottom: 700 }
    },
  }
  const dashboardAttributes = attributes()
  const dashboard = {
    ...dashboardAttributes,
    dataset: dataset(dashboardAttributes),
    scrollHeight: 100,
    clientHeight: 100,
    scrollWidth: 100,
    clientWidth: 100,
    querySelector: (selector: string) => (selector === ".dc-topic-grid" ? grid : null),
  }
  const quartzBody = {
    clientWidth: 1200,
    clientHeight: 800,
    scrollHeight: 800,
    scrollWidth: 1200,
    get offsetHeight() {
      logs.push({ kind: "read", name: "forced-layout", connected: connected() })
      return 800
    },
    getBoundingClientRect: () => {
      logs.push({ kind: "read", name: "quartz-rect", connected: connected() })
      return { bottom: 700 }
    },
    querySelector: (selector: string) => {
      if (selector === ":scope > footer") return footer
      if (selector === ":scope > .center") return center
      return null
    },
  }
  const bodyAttributes = attributes()
  bodyAttributes.setAttribute("data-slug", "index")
  logs.length = 0
  const body = {
    ...bodyAttributes,
    dataset: dataset(bodyAttributes),
    dashboard: dashboard as typeof dashboard | null,
    quartzBody: quartzBody as typeof quartzBody | null,
    querySelector(selector: string) {
      if (selector === ".dc-topic-dashboard") return this.dashboard
      if (selector === ".page > #quartz-body") return this.quartzBody
      return null
    },
  }

  class FakeResizeObserver {
    connected = false
    target: typeof quartzBody | null = null
    observeCalls: Array<{ target: typeof quartzBody; options: unknown[] }> = []
    disconnectCalls = 0

    constructor(
      private callback: (
        entries: Array<{ contentRect: { width: number; height: number } }>,
      ) => void,
    ) {
      observer = this
    }

    disconnect() {
      this.connected = false
      this.target = null
      this.disconnectCalls += 1
    }

    observe(target: typeof quartzBody, ...options: unknown[]) {
      this.connected = true
      this.target = target
      this.observeCalls.push({ target, options })
    }

    deliver(width: number, height: number) {
      this.callback([{ contentRect: { width, height } }])
    }
  }

  const documentElement = {
    get scrollHeight() {
      logs.push({ kind: "read", name: "document-scroll-height", connected: connected() })
      return dashboardAttributes.values.get("data-home-fit") === passingState ? 800 : 900
    },
  }
  const context: Record<string, unknown> = {
    document: {
      body,
      documentElement,
      fonts: {
        ready: { then: (callback: () => void) => fontListeners.set("ready", callback) },
        addEventListener: (name: string, callback: () => void) => fontListeners.set(name, callback),
      },
      addEventListener: (name: string, callback: () => void) =>
        documentListeners.set(name, callback),
    },
    ResizeObserver: FakeResizeObserver,
    getComputedStyle: (element: unknown) =>
      element === quartzBody
        ? { paddingLeft: "20px", paddingRight: "30px", paddingTop: "10px", paddingBottom: "14px" }
        : { paddingLeft: "0px", paddingRight: "0px", paddingTop: "0px", paddingBottom: "0px" },
    matchMedia: () => ({
      get matches() {
        return eligible
      },
    }),
    requestAnimationFrame: (callback: () => void) => {
      const id = nextFrame++
      frames.set(id, callback)
      return id
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    addEventListener: (name: string, callback: () => void) => windowListeners.set(name, callback),
    innerHeight: 800,
    visualViewport: {
      height: 800,
      addEventListener: (name: string, callback: () => void) =>
        viewportListeners.set(name, callback),
    },
    __devbookPageReveal: { initial: () => (revealCalls += 1) },
  }
  context.window = context

  const component = HomepageFit(undefined)
  vm.runInNewContext(resource(component.afterDOMLoaded), context)

  const flush = () => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((callback) => callback())
  }
  const candidateWrites = () =>
    logs
      .filter((entry) => entry.kind === "write" && entry.name === "data-home-fit")
      .map((entry) => entry.value)

  return {
    body,
    dashboard,
    quartzBody,
    observer: () => observer,
    logs,
    frames,
    flush,
    candidateWrites,
    documentListeners,
    windowListeners,
    viewportListeners,
    fontListeners,
    setEligible: (value: boolean) => (eligible = value),
    setPassingState: (value: string) => (passingState = value),
    revealCalls: () => revealCalls,
    refresh: () =>
      (
        context.window as { __devbookHomepageFit: { refresh: () => void } }
      ).__devbookHomepageFit.refresh(),
  }
}

test("selects dashboard state while disconnected and seeds a padded content-box baseline", () => {
  const h = harness()
  h.flush()

  assert.deepEqual(h.candidateWrites(), ["full", "summary-hidden", "counter-hidden"])
  assert.equal(h.body.hasAttribute("data-home-fit-active"), true)
  assert.equal(h.body.hasAttribute("data-home-fit"), false)
  assert.equal(h.dashboard.dataset.homeFit, "counter-hidden")
  assert.equal(h.dashboard.hasAttribute("data-home-fit-active"), false)
  assert.equal(h.body.hasAttribute("data-home-fit-overflow"), false)
  assert.equal(h.revealCalls(), 1)
  assert.equal(h.observer().connected, true)
  assert.equal(h.observer().target, h.quartzBody)
  assert.equal(h.observer().observeCalls.length, 1)
  assert.deepEqual(h.observer().observeCalls[0].options, [])
  assert.equal(
    h.logs.filter((entry) => entry.name === "data-home-fit-active" && entry.kind === "write")
      .length,
    1,
  )
  assert.equal(
    h.logs
      .filter(
        (entry) =>
          entry.kind === "read" ||
          entry.name === "data-home-fit-active" ||
          entry.name === "data-home-fit",
      )
      .every((entry) => !entry.connected),
    true,
  )

  h.logs.length = 0
  h.observer().deliver(1150, 776)
  assert.equal(h.frames.size, 0)
  assert.deepEqual(h.candidateWrites(), [])
  assert.equal(h.revealCalls(), 1)
})

test("coalesces changed observations and restores full first through the public refresh path", () => {
  const h = harness()
  h.setPassingState("bar-hidden")
  h.flush()
  assert.equal(h.dashboard.dataset.homeFit, "bar-hidden")

  h.logs.length = 0
  h.observer().deliver(1140, 776)
  h.observer().deliver(1130, 770)
  assert.equal(h.frames.size, 1)
  h.flush()
  assert.equal(h.revealCalls(), 2)
  assert.equal(h.observer().connected, true)
  assert.equal(
    h.logs
      .filter((entry) => entry.kind === "read" || entry.name === "data-home-fit")
      .every((entry) => !entry.connected),
    true,
  )

  h.setPassingState("full")
  h.logs.length = 0
  h.refresh()
  h.flush()
  assert.deepEqual(h.candidateWrites(), ["full"])
  assert.equal(h.dashboard.dataset.homeFit, "full")
  assert.equal(
    h.logs.some((entry) => entry.kind === "remove" && entry.name === "data-home-fit-active"),
    false,
  )
  assert.equal(
    h.logs.some((entry) => entry.kind === "write" && entry.name === "data-home-fit-active"),
    false,
  )
  assert.equal(h.revealCalls(), 3)

  assert.deepEqual([...h.documentListeners.keys()].sort(), ["nav", "render"])
  assert.deepEqual([...h.windowListeners.keys()], ["resize"])
  assert.deepEqual([...h.viewportListeners.keys()], ["resize"])
  assert.deepEqual([...h.fontListeners.keys()].sort(), ["loadingdone", "ready"])
})

test("ignores dashboard scroll overflow from temporary card transforms", () => {
  const h = harness()
  h.setPassingState("full")
  h.dashboard.scrollHeight = h.dashboard.clientHeight + 6
  h.flush()

  assert.deepEqual(h.candidateWrites(), ["full"])
  assert.equal(h.body.hasAttribute("data-home-fit-active"), true)
  assert.equal(h.dashboard.dataset.homeFit, "full")
  assert.equal(h.body.hasAttribute("data-home-fit-overflow"), false)
})

test("cleans all fit state when no candidate fits", () => {
  const h = harness()
  h.setPassingState("never")
  h.flush()

  assert.deepEqual(h.candidateWrites(), ["full", "summary-hidden", "counter-hidden", "bar-hidden"])
  assert.equal(h.body.hasAttribute("data-home-fit-active"), false)
  assert.equal(h.dashboard.hasAttribute("data-home-fit"), false)
  assert.equal(h.body.dataset.homeFitOverflow, "true")
  assert.equal(h.observer().connected, false)
  assert.equal(
    h.logs
      .filter(
        (entry) =>
          entry.kind === "read" ||
          entry.name === "data-home-fit-active" ||
          entry.name === "data-home-fit",
      )
      .every((entry) => !entry.connected),
    true,
  )
  assert.equal(h.revealCalls(), 1)
})

test("cleans ineligible and SPA state, then retries from full", () => {
  const h = harness()
  h.flush()
  h.body.setAttribute("data-home-fit-overflow", "true")
  h.setEligible(false)
  h.logs.length = 0
  h.documentListeners.get("nav")?.()
  h.flush()

  assert.equal(h.body.hasAttribute("data-home-fit-active"), false)
  assert.equal(h.body.hasAttribute("data-home-fit-overflow"), false)
  assert.equal(h.dashboard.hasAttribute("data-home-fit"), false)
  assert.equal(h.observer().connected, false)
  assert.deepEqual(h.candidateWrites(), [])
  assert.equal(h.revealCalls(), 2)

  h.setEligible(true)
  h.setPassingState("full")
  h.logs.length = 0
  h.documentListeners.get("render")?.()
  h.flush()
  assert.deepEqual(h.candidateWrites(), ["full"])
  assert.equal(h.dashboard.dataset.homeFit, "full")

  h.body.dataset.slug = "elsewhere"
  h.logs.length = 0
  h.refresh()
  h.flush()
  assert.equal(h.body.hasAttribute("data-home-fit-active"), false)
  assert.equal(h.dashboard.hasAttribute("data-home-fit"), false)
  assert.equal(h.observer().connected, false)
  assert.equal(h.revealCalls(), 4)
})

test("cleans stale state when the dashboard or Quartz body is missing", () => {
  const h = harness()
  h.flush()
  h.body.setAttribute("data-home-fit-overflow", "true")
  h.body.quartzBody = null
  h.logs.length = 0
  h.refresh()
  h.flush()

  assert.equal(h.body.hasAttribute("data-home-fit-active"), false)
  assert.equal(h.body.hasAttribute("data-home-fit-overflow"), false)
  assert.equal(h.dashboard.hasAttribute("data-home-fit"), false)
  assert.equal(h.observer().connected, false)
  assert.deepEqual(h.candidateWrites(), [])

  h.body.setAttribute("data-home-fit-active", "")
  h.body.setAttribute("data-home-fit-overflow", "true")
  h.body.dashboard = null
  h.logs.length = 0
  h.refresh()
  h.flush()
  assert.equal(h.body.hasAttribute("data-home-fit-active"), false)
  assert.equal(h.body.hasAttribute("data-home-fit-overflow"), false)
  assert.equal(h.observer().connected, false)
  assert.deepEqual(h.candidateWrites(), [])
  assert.equal(h.revealCalls(), 3)
})
