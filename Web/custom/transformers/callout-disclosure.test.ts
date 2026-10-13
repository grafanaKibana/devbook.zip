import assert from "node:assert/strict"
import test from "node:test"
import type { Element, Root } from "hast"
import { CalloutDisclosure } from "./callout-disclosure"

const div = (className: string[]): Element => ({
  type: "element",
  tagName: "div",
  properties: { className },
  children: [],
})

const callout = (className: string, withContent = true): Element => ({
  type: "element",
  tagName: "blockquote",
  properties: { className },
  children: [
    { type: "text", value: "\n" },
    div(["callout-title"]),
    ...(withContent ? [div(["callout-content"])] : []),
  ],
})

const transform = (...children: Element[]) => {
  const tree: Root = { type: "root", children }
  const plugin = CalloutDisclosure().htmlPlugins?.({} as never)[0]
  assert.equal(typeof plugin, "function")
  ;(plugin as () => (tree: Root) => void)()(tree)
}

const title = (node: Element) => node.children[1] as Element
const content = (node: Element) => node.children[2] as Element

test("folded callouts get a collapsed button title and an inert body", () => {
  const folded = callout("callout question is-collapsible is-collapsed")

  transform(folded)

  assert.equal(title(folded).properties.role, "button")
  assert.equal(title(folded).properties.tabIndex, 0)
  assert.equal(title(folded).properties.ariaExpanded, "false")
  assert.equal(content(folded).properties.inert, true)
})

test("open foldable callouts report expanded and keep their body interactive", () => {
  const open = callout("callout example is-collapsible")

  transform(open)

  assert.equal(title(open).properties.ariaExpanded, "true")
  assert.equal(content(open).properties.inert, undefined)
})

test("static callouts and title-only folds are left alone or handled safely", () => {
  const plain = callout("callout note")
  const titleOnly = callout("callout question is-collapsible is-collapsed", false)

  transform(plain, titleOnly)

  assert.deepEqual(title(plain).properties, { className: ["callout-title"] })
  assert.equal(title(titleOnly).properties.ariaExpanded, "false")
})
