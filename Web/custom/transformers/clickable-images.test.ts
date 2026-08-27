import assert from "node:assert/strict"
import test from "node:test"
import type { Element, Root } from "hast"
import { ClickableImages } from "./clickable-images"

const element = (tagName: string, properties: Element["properties"]): Element => ({
  type: "element",
  tagName,
  properties,
  children: [],
})

const transform = (...children: Element[]) => {
  const tree: Root = { type: "root", children }
  const plugin = ClickableImages().htmlPlugins?.({} as never)[0]
  assert.equal(typeof plugin, "function")
  ;(plugin as () => (tree: Root) => void)()(tree)
}

test("supported image carriers normalize theme, size, and accessible labels", () => {
  const raster = element("img", { src: "/assets/sample.PNG?x=1", alt: "640|theme-aware" })
  const vector = element("object", {
    data: "/assets/sample.svg#icon",
    type: "image/svg+xml",
    ariaLabel: "theme-aware",
  })

  transform(raster, vector)

  assert.equal(raster.properties["data-theme-aware"], "true")
  assert.equal(raster.properties.width, 640)
  assert.equal(raster.properties.alt, "sample")
  assert.equal(raster.properties.ariaLabel, "Zoom image: sample")
  assert.equal(vector.properties["data-theme-aware"], "true")
  assert.equal(vector.properties.ariaLabel, "sample")
})

test("unsupported carriers keep their theme marker literal", () => {
  const malformed = element("img", { src: "/assets/sample.png", alt: " theme-aware " })
  const unsupported = element("object", {
    data: "/assets/sample.png",
    type: "image/svg+xml",
    ariaLabel: "theme-aware",
  })

  transform(malformed, unsupported)

  assert.equal(malformed.properties["data-theme-aware"], undefined)
  assert.equal(malformed.properties.alt, " theme-aware ")
  assert.deepEqual(unsupported.properties, {
    data: "/assets/sample.png",
    type: "image/svg+xml",
    ariaLabel: "theme-aware",
  })
})
