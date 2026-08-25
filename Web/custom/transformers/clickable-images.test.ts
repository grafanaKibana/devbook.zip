import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import type { Element, Root } from "hast"
import { ClickableImages } from "./clickable-images"

function element(tagName: string, properties: Element["properties"]): Element {
  return {
    type: "element",
    tagName,
    properties,
    children: [],
  }
}

function transform(...children: Element[]): Root {
  const tree: Root = { type: "root", children }
  const plugin = ClickableImages().htmlPlugins?.({} as never)[0]
  assert.equal(typeof plugin, "function")
  const transformer = (plugin as () => (tree: Root) => void)()
  transformer(tree)
  return tree
}

test("normalizes exact supported raster carriers before lightbox handling", () => {
  const marked = element("img", {
    src: "/Assets/Software Architecture/Software Architecture-Microservices-18120000-3.PNG?x=1#y",
    alt: "theme-aware",
    width: "auto",
  })
  const sized = element("img", { src: "/diagram.webp", alt: "640|theme-aware", width: "auto" })
  const supported = ["jxl", "jpg", "jpeg", "gif", "bmp"].map((extension) =>
    element("img", { src: `/diagram.${extension}`, alt: "theme-aware" }),
  )
  const linked = element("a", { href: "/target" })
  const linkedImage = element("img", { src: "/diagram.jpg", alt: "theme-aware" })
  linked.children.push(linkedImage)

  transform(marked, sized, ...supported, linked)

  assert.equal(marked.properties["data-theme-aware"], "true")
  assert.equal(marked.properties.alt, "Software Architecture Microservices")
  assert.equal(marked.properties.ariaLabel, "Zoom image: Software Architecture Microservices")
  assert.equal(sized.properties.width, 640)
  assert.equal(sized.properties["data-theme-aware"], "true")
  assert.equal(sized.properties.alt, "diagram")
  assert.ok(supported.every((node) => node.properties["data-theme-aware"] === "true"))
  assert.ok(supported.every((node) => node.properties.alt === "diagram"))
  assert.equal(linkedImage.properties["data-theme-aware"], "true")
  assert.equal(linkedImage.properties.alt, "diagram")
  assert.equal(linkedImage.properties.className, undefined)
  assert.equal(linkedImage.properties.role, undefined)
})

test("leaves malformed and unsupported carriers literal while keeping raster baseline behavior", () => {
  const nodes = [
    element("img", { src: "/diagram.png", alt: "theme-aware-extra" }),
    element("img", { src: "/diagram.png", alt: " theme-aware " }),
    element("img", { src: "/diagram.png", alt: "wide|theme-aware" }),
    element("img", { src: "/diagram.png", alt: "640|theme-aware|extra" }),
    element("img", { src: "/diagram.avif", alt: "theme-aware" }),
  ]

  transform(...nodes)

  for (const node of nodes) {
    assert.equal(node.properties["data-theme-aware"], undefined)
    assert.ok((node.properties.className as string[]).includes("lightbox-image"))
    assert.match(String(node.properties.ariaLabel), /^Zoom image:/)
  }
})

test("normalizes only true SVG objects without adding lightbox behavior", () => {
  const svg = element("object", {
    data: "/diagram.SVG?raw=1",
    type: "image/svg+xml",
    ariaLabel: "900|theme-aware",
    width: "auto",
  })
  const falseSvg = element("object", {
    data: "/diagram.png",
    type: "image/svg+xml",
    ariaLabel: "theme-aware",
  })

  transform(svg, falseSvg)

  assert.equal(svg.properties["data-theme-aware"], "true")
  assert.equal(svg.properties.width, 900)
  assert.equal(svg.properties.ariaLabel, "diagram")
  assert.equal(svg.properties.className, undefined)
  assert.deepEqual(falseSvg.properties, {
    data: "/diagram.png",
    type: "image/svg+xml",
    ariaLabel: "theme-aware",
  })
})

test("keeps dark theme-aware images transparent and shadowless in the lightbox", () => {
  const resources = ClickableImages().externalResources?.({} as never)
  const css = resources?.css?.map((resource) => resource.content).join("\n") ?? ""
  const script = resources?.js?.find((resource) => resource.contentType === "inline")
  assert.equal(script?.contentType, "inline")

  assert.match(
    css,
    /:root\[saved-theme="dark"\] :is\(img\[data-theme-aware="true"\], object\[data-theme-aware="true"\]\) \{\s*background: transparent;\s*box-shadow: none;\s*filter: hue-rotate\(180deg\) invert\(1\);\s*\}/,
  )
  assert.doesNotMatch(css, /\.lightbox-modal img \{[^}]*\b(?:background|transform|transition):/s)
  assert.doesNotMatch(css, /\.lightbox-modal\.active img/)
  assert.match(script.script, /modalImg\.setAttribute\("data-theme-aware", "true"\)/)
  assert.match(script.script, /modalImg\.removeAttribute\("data-theme-aware"\)/)
})

test("Obsidian limits theme-aware filtering to supported parsed image carriers", () => {
  const snippet = readFileSync(
    new URL("../../../Vault/.obsidian/snippets/markdown-max-width.css", import.meta.url),
    "utf8",
  )
  const styleSettings = JSON.parse(
    readFileSync(
      new URL(
        "../../../Vault/.obsidian/plugins/obsidian-style-settings/data.json",
        import.meta.url,
      ),
      "utf8",
    ),
  )

  const embedRule = snippet.match(/body\.theme-dark[\s\S]+?\.image-embed[\s\S]+?\}/)?.[0] ?? ""
  assert.match(snippet, /\[alt="theme-aware"\]/)
  assert.match(snippet, /\[width\]\[alt\$="\|theme-aware"\]/)
  assert.doesNotMatch(embedRule, /(?<!\[width\])\[alt\$="\|theme-aware"\]/)
  for (const extension of ["jxl", "png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"]) {
    assert.match(snippet, new RegExp(`\\[src\\$="\\.${extension}" i\\]`))
  }
  assert.match(snippet, /background: transparent;/)
  assert.match(snippet, /box-shadow: none;/)
  assert.match(snippet, /filter: hue-rotate\(180deg\) invert\(1\);/)
  assert.match(snippet, /transition: none;/)
  assert.match(
    snippet,
    /@keyframes theme-aware-lightbox-settle \{\s*from,\s*to \{\s*transform: none;\s*\}\s*\}/,
  )
  assert.match(
    snippet,
    /body\.theme-dark \.lightbox img:is\(\[alt="theme-aware"\], \[alt\$="\|theme-aware"\]\) \{\s*background: transparent;\s*box-shadow: none;\s*filter: hue-rotate\(180deg\) invert\(1\);\s*animation: theme-aware-lightbox-settle 250ms linear !important;/,
  )
  assert.doesNotMatch(
    snippet.match(/body\.theme-dark \.lightbox img[\s\S]+?\}/)?.[0] ?? "",
    /transition:/,
  )
  assert.doesNotMatch(snippet, /\.modal\.mod-image-lightbox/)
  assert.equal(styleSettings["baseline-style@@zoom-off"], true)
})
