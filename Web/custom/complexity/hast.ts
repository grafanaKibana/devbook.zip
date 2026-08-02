import type { Element, ElementContent, RootContent, Text } from "hast"

import {
  COMPLEXITY_CHART,
  type ComplexityResourceViewModel,
  type ComplexityViewModel,
} from "./model"

const text = (value: string): Text => ({ type: "text", value })

function element(
  tagName: string,
  properties: Element["properties"] = {},
  children: ElementContent[] = [],
): Element {
  return { type: "element", tagName, properties, children }
}

function renderResourceHast(resource: ComplexityResourceViewModel): Element {
  const { width, height, left, plotRight, labelX, top, axisY } = COMPLEXITY_CHART
  const clipId = `${resource.labelId}-plot-clip`
  const pathsToRender = [...resource.contextPaths, ...resource.paths]
  const gradients = pathsToRender
    .filter((path) => !path.dimmed)
    .map((path) =>
      element("linearGradient", { id: `${path.id}-fill`, x1: "0", y1: "0", x2: "0", y2: "1" }, [
        element("stop", { offset: "0%", stopColor: path.color, stopOpacity: 0.2 }),
        element("stop", { offset: "100%", stopColor: path.color, stopOpacity: 0 }),
      ]),
    )
  const grid = resource.ticks.flatMap((tick) => [
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
        x: tick.value === 0 ? left : left + 8,
        y: tick.value === 0 ? axisY + 18 : tick.y + 4,
      },
      [text(tick.label)],
    ),
  ])
  const xTicks = resource.xTicks.map((tick) =>
    element("text", { className: ["complexity__x-tick"], x: tick.x, y: axisY + 18 }, [
      text(tick.label),
    ]),
  )
  const areas = pathsToRender
    .filter((path) => !path.dimmed)
    .map((path) =>
      element("path", {
        className: ["complexity__area"],
        d: path.area,
        fill: `url(#${path.id}-fill)`,
        "data-path-id": path.id,
      }),
    )
  const paths = pathsToRender.map((path) =>
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
      "data-context": path.dimmed ? "true" : "false",
    }),
  )
  const endpointLabels = resource.endpointLabels.map((label) =>
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
  const legend = resource.legend.map((group) => {
    const pathIds = group.items.flatMap((item) => (item.kind === "plotted" ? [item.pathId] : []))
    return element(
      "div",
      {
        className: ["complexity__legend-group", ...(group.label ? [] : ["is-ungrouped"])],
      },
      [
        ...(group.label
          ? [
              element(
                pathIds.length > 0 ? "button" : "span",
                {
                  ...(pathIds.length > 0
                    ? {
                        type: "button",
                        "data-path-ids": pathIds.join(","),
                        ariaPressed: "false",
                      }
                    : {}),
                  className: [
                    "complexity__legend-group-label",
                    ...(pathIds.length > 0 ? ["complexity__legend-group-button"] : []),
                  ],
                },
                [text(group.label)],
              ),
            ]
          : []),
        element(
          "ul",
          { className: ["complexity__legend-items"] },
          group.items.map((item) =>
            element("li", { className: ["complexity__legend-item"] }, [
              element(
                item.kind === "plotted" ? "button" : "span",
                {
                  ...(item.kind === "plotted"
                    ? { type: "button", "data-path-id": item.pathId, ariaPressed: "false" }
                    : {}),
                  className: [
                    "complexity__legend-entry",
                    item.kind === "plotted"
                      ? "complexity__legend-button"
                      : "complexity__legend-static",
                  ],
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
    )
  })
  return element(
    "div",
    {
      className: ["complexity__resource"],
      "data-complexity-resource": resource.key,
      ...(resource.key === "catalogue" ? {} : { role: "group", ariaLabelledBy: resource.labelId }),
    },
    [
      ...(resource.key === "catalogue"
        ? []
        : [
            element("div", { id: resource.labelId, className: ["complexity__resource-label"] }, [
              text(resource.label),
            ]),
          ]),
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
      element(
        "div",
        {
          className: [
            "complexity__legend",
            resource.legend.length === 1 && !resource.legend[0].label
              ? "is-ungrouped"
              : "is-grouped",
          ],
        },
        legend,
      ),
    ],
  )
}

export function renderComplexityHast(view: ComplexityViewModel): RootContent {
  return element(
    "figure",
    {
      id: view.figureId,
      className: ["complexity"],
      "data-complexity-mode": view.mode,
      ariaLabel: view.label,
    },
    [
      element("span", { hidden: true }, [text(view.label)]),
      element(
        "div",
        { className: ["complexity__resources"] },
        view.resources.map(renderResourceHast),
      ),
    ],
  )
}
