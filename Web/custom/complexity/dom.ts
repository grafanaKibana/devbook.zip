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

function renderResourceDom(
  document: Document,
  resource: ComplexityResourceViewModel,
  index: number,
): HTMLElement {
  const { width, height, left, plotRight, labelX, top, axisY } = COMPLEXITY_CHART
  const clipId = `${resource.labelId}-plot-clip`
  const paths = [...resource.contextPaths, ...resource.paths]
  const group = document.createElement("div")
  group.className = "complexity__resource"
  group.dataset.complexityResource = resource.key
  if (resource.key !== "catalogue") {
    group.id = `${resource.labelId}-panel`
    group.setAttribute("role", "tabpanel")
    group.setAttribute("aria-labelledby", resource.labelId)
    group.hidden = index > 0
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
    const open = path.bandTo === "unbounded"
    const gradient = svgElement(document, "linearGradient", {
      id: `${path.id}-fill`,
      x1: 0,
      y1: open ? 1 : 0,
      x2: 0,
      y2: open ? 0 : 1,
    })
    gradient.append(
      svgElement(document, "stop", {
        offset: "0%",
        "stop-color": path.color,
        "stop-opacity": open ? 0.22 : path.bandTo ? 0.18 : 0.2,
      }),
      svgElement(document, "stop", {
        offset: "100%",
        "stop-color": path.color,
        "stop-opacity": path.bandTo && !open ? 0.18 : 0,
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
      x: tick.value === 0 ? left : left + 8,
      y: tick.value === 0 ? axisY + 18 : tick.y + 4,
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
    if (path.bandGeometry) {
      curves.append(
        svgElement(document, "path", {
          class: "complexity__curve complexity__curve--band-top is-highlighted",
          d: path.bandGeometry,
          fill: "none",
          stroke: path.color,
          "vector-effect": "non-scaling-stroke",
          "data-path-id": path.id,
          "data-curve-id": String(path.bandTo),
          "data-context": "false",
        }),
      )
    }
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
  legend.className = `complexity__legend ${
    resource.legend.length === 1 && !resource.legend[0].label ? "is-ungrouped" : "is-grouped"
  }`
  for (const legendGroup of resource.legend) {
    const row = document.createElement("div")
    row.className = `complexity__legend-group${legendGroup.label ? "" : " is-ungrouped"}`
    if (legendGroup.label) {
      const pathIds = legendGroup.items.flatMap((item) =>
        item.kind === "plotted" ? [item.pathId] : [],
      )
      const label = appendText(
        document,
        row,
        pathIds.length > 0 ? "button" : "span",
        legendGroup.label,
      )
      label.className = `complexity__legend-group-label${
        pathIds.length > 0 ? " complexity__legend-group-button" : ""
      }`
      if (pathIds.length > 0) {
        label.setAttribute("type", "button")
        label.dataset.pathIds = pathIds.join(",")
        label.setAttribute("aria-pressed", "false")
      }
    }
    const items = document.createElement("ul")
    items.className = "complexity__legend-items"
    for (const legendItem of legendGroup.items) {
      const item = document.createElement("li")
      item.className = "complexity__legend-item"
      const entry = document.createElement(legendItem.kind === "plotted" ? "button" : "span")
      entry.className = `complexity__legend-entry ${
        legendItem.kind === "plotted" ? "complexity__legend-button" : "complexity__legend-static"
      }${legendItem.kind === "plotted" && legendItem.banded ? " is-banded" : ""}`
      if (legendItem.kind === "plotted") {
        entry.setAttribute("type", "button")
        entry.dataset.pathId = legendItem.pathId
        entry.setAttribute("aria-pressed", "false")
      }
      entry.style.setProperty("--complexity-color", legendItem.color)
      const swatch = document.createElement("span")
      swatch.className = "complexity__legend-swatch"
      swatch.setAttribute("aria-hidden", "true")
      entry.append(swatch, document.createTextNode(legendItem.label))
      item.append(entry)
      items.append(item)
    }
    row.append(items)
    legend.append(row)
  }
  group.append(legend)
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
  if (view.variables.length > 0) {
    const variables = document.createElement("dl")
    variables.className = "complexity__variables"
    for (const variable of view.variables) {
      const item = document.createElement("div")
      item.className = "complexity__variable"
      const term = document.createElement("dt")
      appendText(document, term, "var", variable.symbol)
      const description = document.createElement("dd")
      description.textContent = variable.description
      item.append(term, description)
      variables.append(item)
    }
    figure.append(variables)
  }
  if (view.resources.length > 1) {
    const tabs = document.createElement("div")
    tabs.className = "complexity__tabs"
    tabs.setAttribute("role", "tablist")
    tabs.setAttribute("aria-label", view.label)
    view.resources.forEach((resource, index) => {
      const tab = appendText(document, tabs, "button", resource.label)
      tab.id = resource.labelId
      tab.className = "complexity__tab"
      tab.setAttribute("type", "button")
      tab.setAttribute("role", "tab")
      tab.setAttribute("aria-selected", index === 0 ? "true" : "false")
      tab.setAttribute("aria-controls", `${resource.labelId}-panel`)
      tab.tabIndex = index === 0 ? 0 : -1
    })
    figure.append(tabs)
  }
  const resources = document.createElement("div")
  resources.className = "complexity__resources"
  view.resources.forEach((resource, index) =>
    resources.append(renderResourceDom(document, resource, index)),
  )
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
