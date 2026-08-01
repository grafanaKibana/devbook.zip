import { mountComplexityFigure } from "./interactions"
import {
  COMPLEXITY_CHART,
  type ComplexityResourceViewModel,
  type ComplexityViewModel,
} from "./model"

const SVG_NS = "http://www.w3.org/2000/svg"

function appendText<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  parent: Element,
  tagName: K,
  value: string,
): HTMLElementTagNameMap[K] {
  const child = document.createElement(tagName)
  child.textContent = value
  parent.append(child)
  return child
}

function svgElement(
  document: Document,
  tagName: string,
  attributes: Record<string, string | number>,
): SVGElement {
  const node = document.createElementNS(SVG_NS, tagName)
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value))
  return node
}

function renderResourceDom(document: Document, resource: ComplexityResourceViewModel): HTMLElement {
  const { width, height, left, plotRight, labelX, top, axisY } = COMPLEXITY_CHART
  const clipId = `${resource.labelId}-plot-clip`
  const paths = [...resource.contextPaths, ...resource.paths]
  const group = document.createElement("div")
  group.className = "complexity__resource"
  group.dataset.complexityResource = resource.key
  if (resource.key !== "catalogue") {
    group.setAttribute("role", "group")
    group.setAttribute("aria-labelledby", resource.labelId)
    const label = appendText(document, group, "div", resource.label)
    label.id = resource.labelId
    label.className = "complexity__resource-label"
  }

  const plotWrap = document.createElement("div")
  plotWrap.className = "complexity__plot-wrap"
  const svg = svgElement(document, "svg", {
    class: "complexity__plot",
    viewBox: `0 0 ${width} ${height}`,
    role: "presentation",
    "aria-hidden": "true",
    focusable: "false",
  })
  const defs = svgElement(document, "defs", {})
  const clip = svgElement(document, "clipPath", { id: clipId })
  clip.append(
    svgElement(document, "rect", {
      x: left,
      y: top,
      width: plotRight - left,
      height: axisY - top,
    }),
  )
  defs.append(clip)
  for (const path of paths.filter((candidate) => !candidate.dimmed)) {
    const gradient = svgElement(document, "linearGradient", {
      id: `${path.id}-fill`,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 1,
    })
    gradient.append(
      svgElement(document, "stop", {
        offset: "0%",
        "stop-color": path.color,
        "stop-opacity": 0.2,
      }),
      svgElement(document, "stop", {
        offset: "100%",
        "stop-color": path.color,
        "stop-opacity": 0,
      }),
    )
    defs.append(gradient)
  }
  svg.append(defs)
  for (const tick of resource.ticks) {
    svg.append(
      svgElement(document, "line", {
        class: "complexity__grid",
        x1: left,
        x2: plotRight,
        y1: tick.y,
        y2: tick.y,
      }),
    )
    const label = svgElement(document, "text", {
      class: "complexity__tick",
      x: left + 8,
      y: tick.y + (tick.value === 0 ? -6 : 4),
    })
    label.textContent = tick.label
    svg.append(label)
  }
  svg.append(
    svgElement(document, "line", {
      class: "complexity__axis",
      x1: left,
      x2: plotRight,
      y1: axisY,
      y2: axisY,
    }),
  )
  for (const tick of resource.xTicks) {
    const label = svgElement(document, "text", {
      class: "complexity__x-tick",
      x: tick.x,
      y: axisY + 18,
    })
    label.textContent = tick.label
    svg.append(label)
  }
  const clipped = svgElement(document, "g", { "clip-path": `url(#${clipId})` })
  const areas = svgElement(document, "g", { class: "complexity__areas" })
  const curves = svgElement(document, "g", { class: "complexity__curves" })
  for (const path of paths) {
    if (!path.dimmed) {
      areas.append(
        svgElement(document, "path", {
          class: "complexity__area",
          d: path.area,
          fill: `url(#${path.id}-fill)`,
          "data-path-id": path.id,
        }),
      )
    }
    curves.append(
      svgElement(document, "path", {
        id: path.id,
        class: `complexity__curve ${path.dimmed ? "is-subtle is-context" : "is-highlighted"}`,
        d: path.geometry,
        fill: "none",
        stroke: path.color,
        "vector-effect": "non-scaling-stroke",
        "data-path-id": path.id,
        "data-curve-id": path.curveId,
        "data-context": path.dimmed ? "true" : "false",
      }),
    )
  }
  clipped.append(areas, curves)
  svg.append(clipped)

  const endpointLabels = svgElement(document, "g", { class: "complexity__endpoint-labels" })
  for (const endpoint of resource.endpointLabels) {
    const label = svgElement(document, "text", {
      class: `complexity__endpoint-label ${endpoint.dimmed ? "is-subtle" : "is-active"}`,
      x: labelX,
      y: endpoint.y + 4,
      "data-curve-id": endpoint.curveId,
      "data-path-ids": endpoint.pathIds.join(","),
    })
    label.style.setProperty("--complexity-label-color", endpoint.color)
    label.textContent = endpoint.formula
    endpointLabels.append(label)
  }
  svg.append(endpointLabels)
  plotWrap.append(svg)
  group.append(plotWrap)

  const legend = document.createElement("div")
  legend.className = "complexity__legend"
  for (const legendGroup of resource.legend) {
    const row = document.createElement("div")
    row.className = `complexity__legend-group${legendGroup.label ? "" : " is-ungrouped"}`
    if (legendGroup.label) {
      appendText(document, row, "span", legendGroup.label).className =
        "complexity__legend-group-label"
    }
    const items = document.createElement("ul")
    items.className = "complexity__legend-items"
    for (const legendItem of legendGroup.items) {
      const item = document.createElement("li")
      item.className = "complexity__legend-item"
      const button = document.createElement("button")
      button.type = "button"
      button.className = "complexity__legend-button"
      button.dataset.pathId = legendItem.pathId
      button.setAttribute("aria-pressed", "false")
      button.style.setProperty("--complexity-color", legendItem.color)
      const swatch = document.createElement("span")
      swatch.className = "complexity__legend-swatch"
      swatch.setAttribute("aria-hidden", "true")
      button.append(swatch, document.createTextNode(legendItem.label))
      item.append(button)
      items.append(item)
    }
    row.append(items)
    legend.append(row)
  }
  group.append(legend)
  if (resource.semanticBounds.length > 0) {
    const semanticBounds = document.createElement("dl")
    semanticBounds.className = "complexity__semantic-bounds"
    for (const bound of resource.semanticBounds) {
      appendText(document, semanticBounds, "dt", `${bound.operation} — ${bound.role}`)
      appendText(document, semanticBounds, "dd", bound.formula)
    }
    group.append(semanticBounds)
  }
  return group
}

export function renderComplexityDom(
  root: HTMLElement,
  view: ComplexityViewModel,
): { destroy(): void } {
  const document = root.ownerDocument
  const figure = document.createElement("figure")
  figure.id = view.figureId
  figure.className = "complexity"
  figure.dataset.complexityMode = view.mode
  figure.setAttribute("aria-label", view.label)
  const hiddenLabel = appendText(document, figure, "span", view.label)
  hiddenLabel.hidden = true
  const resources = document.createElement("div")
  resources.className = "complexity__resources"
  for (const resource of view.resources) resources.append(renderResourceDom(document, resource))
  figure.append(resources)
  root.replaceChildren(figure)

  const interaction =
    typeof figure.querySelectorAll === "function" ? mountComplexityFigure(figure) : { destroy() {} }
  return {
    destroy() {
      interaction.destroy()
      root.replaceChildren()
    },
  }
}
