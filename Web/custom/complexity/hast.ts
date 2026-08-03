import type { Element, ElementContent, RootContent, Text } from "hast"

import { COMPLEXITY_CHART, COMPLEXITY_FILTERS, type ComplexityViewModel } from "./model"

const text = (value: string): Text => ({ type: "text", value })

function element(
  tagName: string,
  properties: Element["properties"] = {},
  children: ElementContent[] = [],
): Element {
  return { type: "element", tagName, properties, children }
}

export function renderComplexityHast(view: ComplexityViewModel): RootContent {
  const { width, height, left, plotRight, labelX, top, axisY } = COMPLEXITY_CHART
  const clipId = `${view.figureId}-plot-clip`
  const panelId = `${view.figureId}-panel`
  const gradients = view.paths
    .filter((path) => !path.dimmed)
    .map((path) =>
      element("linearGradient", { id: `${path.id}-fill`, x1: "0", y1: "0", x2: "0", y2: "1" }, [
        element("stop", { offset: "0%", stopColor: path.color, stopOpacity: 0.2 }),
        element("stop", { offset: "100%", stopColor: path.color, stopOpacity: 0 }),
      ]),
    )
  const grid = view.ticks.flatMap((tick) => [
    element("line", {
      className: ["complexity__grid"],
      x1: left,
      x2: plotRight,
      y1: tick.y,
      y2: tick.y,
    }),
    element(
      "text",
      {
        className: ["complexity__tick"],
        x: left + 8,
        y: tick.y + (tick.value === 0 ? -6 : 4),
      },
      [text(tick.label)],
    ),
  ])
  const xTicks = view.xTicks.map((tick) =>
    element("text", { className: ["complexity__x-tick"], x: tick.x, y: axisY + 18 }, [
      text(tick.label),
    ]),
  )
  const areas = view.paths
    .filter((path) => !path.dimmed)
    .map((path) =>
      element("path", {
        className: ["complexity__area"],
        d: path.area,
        fill: `url(#${path.id}-fill)`,
        "data-path-id": path.id,
        "data-category": path.category,
      }),
    )
  const paths = view.paths.map((path) =>
    element("path", {
      id: path.id,
      className: [
        "complexity__curve",
        path.dimmed ? "is-subtle" : "is-highlighted",
        ...(path.dimmed ? ["is-context"] : []),
      ],
      d: path.geometry,
      fill: "none",
      stroke: path.color,
      vectorEffect: "non-scaling-stroke",
      "data-path-id": path.id,
      "data-curve-id": path.curveId,
      "data-category": path.category,
      "data-context": path.dimmed ? "true" : "false",
    }),
  )
  const endpointLabels = view.endpointLabels.map((label) =>
    element(
      "text",
      {
        className: ["complexity__endpoint-label", label.dimmed ? "is-subtle" : "is-active"],
        x: labelX,
        y: label.y + 4,
        "data-curve-id": label.curveId,
        "data-path-ids": label.pathIds.join(","),
        style: `--complexity-label-color:${label.color}`,
      },
      [text(label.formula)],
    ),
  )
  const legend = view.legend.map((group) =>
    element(
      "div",
      {
        className: ["complexity__legend-group", ...(group.label ? [] : ["is-ungrouped"])],
      },
      [
        ...(group.label
          ? [
              element("span", { className: ["complexity__legend-group-label"] }, [
                text(group.label),
              ]),
            ]
          : []),
        element(
          "ul",
          { className: ["complexity__legend-items"] },
          group.items.map((item) =>
            element("li", { className: ["complexity__legend-item"] }, [
              element(
                "button",
                {
                  type: "button",
                  className: ["complexity__legend-button"],
                  "data-path-id": item.pathId,
                  "data-category": item.category,
                  ariaPressed: "false",
                  style: `--complexity-color:${item.color}`,
                },
                [
                  element("span", { className: ["complexity__legend-swatch"], ariaHidden: "true" }),
                  text(item.label),
                ],
              ),
            ]),
          ),
        ),
      ],
    ),
  )
  const tabs = COMPLEXITY_FILTERS.map((filter) =>
    element(
      "button",
      {
        id: `${view.figureId}-tab-${filter.id}`,
        type: "button",
        role: "tab",
        className: ["steptrace__tab", "complexity__tab"],
        "data-filter": filter.id,
        ariaSelected: filter.id === "all" ? "true" : "false",
        ariaControls: panelId,
        tabIndex: filter.id === "all" ? 0 : -1,
        disabled:
          filter.id === "all" || view.availableCategories.includes(filter.id) ? undefined : true,
      },
      [text(filter.label)],
    ),
  )

  return element(
    "figure",
    {
      id: view.figureId,
      className: ["complexity"],
      "data-complexity-mode": view.mode,
      "data-active-filter": "all",
    },
    [
      element("figcaption", { id: `${view.figureId}-title`, className: ["complexity__title"] }, [
        text(view.title),
      ]),
      element(
        "div",
        {
          className: ["steptrace__tabs", "complexity__tabs"],
          role: "tablist",
          ariaLabel: "Complexity cases",
        },
        tabs,
      ),
      element(
        "div",
        {
          id: panelId,
          className: ["complexity__panel"],
          role: "tabpanel",
          ariaLabelledBy: `${view.figureId}-tab-all`,
        },
        [
          element("div", { className: ["complexity__plot-wrap"] }, [
            element(
              "svg",
              {
                className: ["complexity__plot"],
                viewBox: `0 0 ${width} ${height}`,
                role: "presentation",
                ariaHidden: "true",
                focusable: "false",
              },
              [
                element("defs", {}, [
                  element("clipPath", { id: clipId }, [
                    element("rect", {
                      x: left,
                      y: top,
                      width: plotRight - left,
                      height: axisY - top,
                    }),
                  ]),
                  ...gradients,
                ]),
                ...grid,
                element("line", {
                  className: ["complexity__axis"],
                  x1: left,
                  x2: plotRight,
                  y1: axisY,
                  y2: axisY,
                }),
                ...xTicks,
                element("g", { clipPath: `url(#${clipId})` }, [
                  element("g", { className: ["complexity__areas"] }, areas),
                  element("g", { className: ["complexity__curves"] }, paths),
                ]),
                element("g", { className: ["complexity__endpoint-labels"] }, endpointLabels),
              ],
            ),
          ]),
        ],
      ),
      element("div", { className: ["complexity__legend"] }, legend),
    ],
  )
}
