import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
import { ExcalidrawEnhance } from "./excalidraw-enhance"

test("open original copies the browser-resolved transclusion href on nested routes", () => {
  const sourceHref = "https://devbook.zip/assets/excalidraw/testing-pyramid"
  const injected: { href?: string; className?: string; setAttribute(): void }[] = []
  const controls = {
    querySelector: () => null,
    appendChild: (node: (typeof injected)[number]) => injected.push(node),
  }
  const source = { href: sourceHref }
  const transclude = {
    querySelector: (selector: string) => (selector === "a.transclude-src" ? source : null),
  }
  const container = {
    querySelector: () => null,
    setAttribute() {},
    addEventListener() {},
  }
  const page = {
    dataset: {} as Record<string, string>,
    classList: { contains: () => false, add() {}, remove() {} },
    querySelector(selector: string) {
      if (selector === ".excalidraw-controls") return controls
      if (selector === ".excalidraw-container") return container
      return null
    },
    closest: (selector: string) => (selector === "blockquote.transclude" ? transclude : null),
    addEventListener() {},
  }
  const document = {
    querySelectorAll: () => [page],
    createElement: () => ({ setAttribute() {} }),
    addEventListener() {},
  }
  const context: Record<string, unknown> = {
    document,
    location: { href: "https://devbook.zip/software-design/testing/testing-pyramid" },
  }
  context.window = context

  const component = ExcalidrawEnhance(undefined)
  vm.runInNewContext(String(component.afterDOMLoaded), context)

  assert.equal(injected.length, 1)
  assert.equal(injected[0].href, sourceHref)
})
