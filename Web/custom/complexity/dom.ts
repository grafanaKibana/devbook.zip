import { mountComplexityFigure } from "./interactions"
import {
  COMPLEXITY_CHART,
  COMPLEXITY_FILTERS,
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

export function renderComplexityDom(
  root: HTMLElement,
  view: ComplexityViewModel,
): { destroy(): void } {
  const document = root.ownerDocument
  const { width, height, left, plotRight, labelX, top, axisY } = COMPLEXITY_CHART
  const clipId = `${view.figureId}-plot-clip`
  const panelId = `${view.figureId}-panel`
  const figure = document.createElement("figure")
  figure.id = view.figureId
  figure.className = "complexity"
  figure.dataset.complexityMode = view.mode
  figure.dataset.activeFilter = "all"

  const title = appendText(document, figure, "figcaption", view.title)
  title.id = `${view.figureId}-title`
  title.className = "complexity__title"

  const tabs = document.createElement("div")
  tabs.className = "complexity__tabs"
  tabs.setAttribute("role", "tablist")
  tabs.setAttribute("aria-label", "Complexity cases")
  for (const filter of COMPLEXITY_FILTERS) {
    const tab = appendText(document, tabs, "button", filter.label)
    tab.type = "button"
    tab.className = "complexity__tab"
    tab.dataset.filter = filter.id
    tab.setAttribute("role", "tab")
    tab.setAttribute("aria-controls", panelId)
    tab.setAttribute("aria-selected", filter.id === "all" ? "true" : "false")
    tab.tabIndex = filter.id === "all" ? 0 : -1
    tab.disabled =
      filter.id !== "all" && !view.availableCategories.includes(filter.id)
  }
  figure.append(tabs)

  const panel = document.createElement("div")
  panel.id = panelId
  panel.className = "complexity__panel"
  panel.setAttribute("role", "tabpanel")
  panel.setAttribute("aria-labelledby", title.id)
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
  for (const path of view.paths.filter((candidate) => !candidate.dimmed)) {
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
  for (const tick of view.ticks) {
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
      x: left - 8,
      y: tick.y + 4,
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
  const clipped = svgElement(document, "g", { "clip-path": `url(#${clipId})` })
  const areas = svgElement(document, "g", { class: "complexity__areas" })
  const curves = svgElement(document, "g", { class: "complexity__curves" })
  for (const path of view.paths) {
    if (!path.dimmed) {
      areas.append(
        svgElement(document, "path", {
          class: "complexity__area",
          d: path.area,
          fill: `url(#${path.id}-fill)`,
          "data-path-id": path.id,
          "data-category": path.category,
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
        "data-category": path.category,
        "data-context": path.dimmed ? "true" : "false",
      }),
    )
  }
  clipped.append(areas, curves)
  svg.append(clipped)

  const endpointLabels = svgElement(document, "g", { class: "complexity__endpoint-labels" })
  for (const endpoint of view.endpointLabels) {
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
  panel.append(plotWrap)
  figure.append(panel)

  const legend = document.createElement("div")
  legend.className = "complexity__legend"
  for (const group of view.legend) {
    const row = document.createElement("div")
    row.className = `complexity__legend-group${group.label ? "" : " is-ungrouped"}`
    if (group.label) {
      appendText(document, row, "span", group.label).className = "complexity__legend-group-label"
    }
    const items = document.createElement("ul")
    items.className = "complexity__legend-items"
    for (const legendItem of group.items) {
      const item = document.createElement("li")
      item.className = "complexity__legend-item"
      const button = document.createElement("button")
      button.type = "button"
      button.className = "complexity__legend-button"
      button.dataset.pathId = legendItem.pathId
      button.dataset.category = legendItem.category
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
  figure.append(legend)
  root.replaceChildren(figure)

  const interaction =
    typeof figure.querySelectorAll === "function"
      ? mountComplexityFigure(figure)
      : { destroy() {} }
  return {
    destroy() {
      interaction.destroy()
      root.replaceChildren()
    },
  }
}
