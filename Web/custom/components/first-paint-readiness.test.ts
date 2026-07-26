import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
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
