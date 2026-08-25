import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
import { ExcalidrawEnhance } from "./excalidraw-enhance"

test("uses Lucide-only drawing controls without adding an open-original link", () => {
  const buttons = new Map([
    [".excalidraw-zoom-in", { innerHTML: "+" }],
    [".excalidraw-zoom-out", { innerHTML: "−" }],
    [".excalidraw-reset", { innerHTML: "⟳" }],
  ])
  const container = {
    setAttribute() {},
    addEventListener() {},
  }
  const page = {
    dataset: {} as Record<string, string>,
    classList: { contains: () => false, add() {}, remove() {} },
    querySelector(selector: string) {
      if (selector === ".excalidraw-container") return container
      return buttons.get(selector) ?? null
    },
    addEventListener() {},
  }
  const document = {
    querySelectorAll: () => [page],
    addEventListener() {},
  }
  const context: Record<string, unknown> = { document }
  context.window = context

  const component = ExcalidrawEnhance(undefined)
  vm.runInNewContext(String(component.afterDOMLoaded), context)

  assert.match(buttons.get(".excalidraw-zoom-in")!.innerHTML, /lucide-zoom-in/)
  assert.match(buttons.get(".excalidraw-zoom-out")!.innerHTML, /lucide-zoom-out/)
  assert.match(buttons.get(".excalidraw-reset")!.innerHTML, /lucide-rotate-ccw/)
  assert.doesNotMatch(String(component.afterDOMLoaded), /excalidraw-open-original/)
})
