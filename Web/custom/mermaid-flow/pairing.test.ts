import assert from "node:assert/strict"
import test from "node:test"
import {
  observePairSvg,
  readConfigPairId,
  resolveConfiguredQuartzPair,
  resolveQuartzPairRoot,
  type PairObserver,
} from "./pairing"

test("pairs only valid local configuration with its immediately preceding marked diagram", () => {
  assert.equal(readConfigPairId('{"for":"orders"}'), "orders")
  assert.equal(readConfigPairId('{"for":1}'), null)
  assert.equal(readConfigPairId('{"for":"Orders"}'), null)
  assert.equal(readConfigPairId(`{"for":"${"a".repeat(65)}"}`), null)
  assert.equal(readConfigPairId("{"), null)

  const diagram = { dataset: { mermaidFlowPair: "orders" }, querySelectorAll: () => [] }
  const mount = {
    dataset: { mermaidFlowPair: "orders", config: '{"for":"orders"}' },
    previousElementSibling: diagram,
  }
  const originalHTMLElement = globalThis.HTMLElement
  globalThis.HTMLElement = class {} as typeof HTMLElement
  Object.setPrototypeOf(diagram, HTMLElement.prototype)
  Object.setPrototypeOf(mount, HTMLElement.prototype)
  try {
    assert.equal(resolveQuartzPairRoot(mount as unknown as HTMLElement), diagram)
    assert.equal(resolveConfiguredQuartzPair(mount as unknown as HTMLElement), diagram)
    mount.dataset.mermaidFlowPair = "payments"
    assert.equal(resolveConfiguredQuartzPair(mount as unknown as HTMLElement), null)
  } finally {
    globalThis.HTMLElement = originalHTMLElement
  }
})

test("resolves a locally wrapped Mermaid code marker without scanning outside the sibling", () => {
  const originalHTMLElement = globalThis.HTMLElement
  globalThis.HTMLElement = class {} as typeof HTMLElement
  const code = { dataset: { mermaidFlowPair: "orders" } }
  const wrapper = { dataset: {}, querySelectorAll: () => [code] }
  const mount = { dataset: { mermaidFlowPair: "orders" }, previousElementSibling: wrapper }
  for (const element of [code, wrapper, mount])
    Object.setPrototypeOf(element, HTMLElement.prototype)
  try {
    assert.equal(resolveQuartzPairRoot(mount as unknown as HTMLElement), wrapper)
  } finally {
    globalThis.HTMLElement = originalHTMLElement
  }
})

test("one scoped observer remounts a replacement exactly once and tears down idempotently", () => {
  type FakeSvg = { name: string }
  let current: FakeSvg | null = { name: "first" }
  let callback: MutationCallback = () => {}
  let disconnected = 0
  const events: string[] = []
  const root = {
    querySelector: (selector: string) => (selector === "svg" ? current : null),
  } as unknown as HTMLElement
  const createObserver = (next: MutationCallback): PairObserver => {
    callback = next
    return { observe() {}, disconnect: () => (disconnected += 1) }
  }

  const lifecycle = observePairSvg(
    root,
    (svg) => events.push(`mount:${(svg as unknown as FakeSvg).name}`),
    (svg) => events.push(`unmount:${(svg as unknown as FakeSvg).name}`),
    createObserver,
  )
  current = { name: "replacement" }
  callback([], {} as MutationObserver)
  callback([], {} as MutationObserver)
  lifecycle.destroy()
  lifecycle.destroy()

  assert.equal(disconnected, 1)
  assert.deepEqual(events, [
    "mount:first",
    "unmount:first",
    "mount:replacement",
    "unmount:replacement",
  ])
})

test("Quartz readiness ignores host chrome SVG before the stamped Mermaid code SVG", () => {
  const chrome = { name: "expand-icon" }
  const rendered = { name: "diagram" }
  const marker = {
    querySelector: (selector: string) => (selector === ":scope > svg" ? rendered : null),
  }
  const root = {
    querySelector: (selector: string) =>
      selector === "[data-mermaid-flow-pair]" ? marker : selector === "svg" ? chrome : null,
  } as unknown as HTMLElement
  const mounted: unknown[] = []
  const lifecycle = observePairSvg(
    root,
    (svg) => mounted.push(svg),
    () => {},
    () => ({ observe() {}, disconnect() {} }),
  )
  assert.deepEqual(mounted, [rendered])
  lifecycle.destroy()
})
