export const CURVE_IDS = [
  "constant",
  "log-n",
  "linear",
  "n-log-n",
  "quadratic",
  "exponential",
  "factorial",
] as const

export type CurveId = (typeof CURVE_IDS)[number]
export type ComplexityMode = "catalogue" | "cases" | "operations"
export type ComplexityCategory = "best" | "average" | "worst" | "other"

export const COMPLEXITY_CHART = {
  width: 800,
  height: 320,
  left: 0,
  plotRight: 700,
  labelX: 708,
  top: 18,
  axisY: 282,
} as const

interface Curve {
  formula: string
  evaluate(n: number): number
}

export interface ComplexityPath {
  id: string
  curveId: CurveId
  category: ComplexityCategory
  formula: string
  label: string
  legendGroup?: string
  legendLabel: string
  color: string
  dimmed: boolean
  geometry: string
  area: string
  endY: number
  samples: { n: number; value: number; x: number; y: number }[]
}

export type ComplexityLegendItem =
  | {
      kind: "plotted"
      pathId: string
      category: ComplexityCategory
      label: string
      color: string
    }
  | {
      kind: "semantic"
      category: ComplexityCategory
      label: string
      color: string
    }

export interface ComplexityLegendGroup {
  label?: string
  items: ComplexityLegendItem[]
}

export interface ComplexityEndpointLabel {
  curveId: CurveId
  formula: string
  pathIds: string[]
  color: string
  dimmed: boolean
  y: number
}

export interface ComplexitySemanticBound {
  operation: string
  role: string
  formula: string
  category: ComplexityCategory
  color: string
  order: number
}

export interface ComplexityVariable {
  symbol: string
  description: string
}

export interface ComplexityResourceViewModel {
  key: "time" | "space" | "catalogue"
  label: string
  labelId: string
  mode: ComplexityMode
  paths: ComplexityPath[]
  contextPaths: ComplexityPath[]
  legend: ComplexityLegendGroup[]
  endpointLabels: ComplexityEndpointLabel[]
  semanticBounds: ComplexitySemanticBound[]
  ticks: { value: number; label: string; y: number }[]
  xTicks: { value: number; label: string; x: number }[]
}

export interface ComplexityViewModel {
  figureId: string
  mode: ComplexityMode
  title: string
  label: string
  variables: ComplexityVariable[]
  resources: ComplexityResourceViewModel[]
  paths: ComplexityPath[]
  legend: ComplexityLegendGroup[]
  endpointLabels: ComplexityEndpointLabel[]
  ticks: { value: number; label: string; y: number }[]
  xTicks: { value: number; label: string; x: number }[]
}

const curves: Record<CurveId, Curve> = {
  constant: {
    formula: "O(1)",
    evaluate: () => 1,
  },
  "log-n": {
    formula: "O(log n)",
    evaluate: Math.log2,
  },
  linear: { formula: "O(n)", evaluate: (n) => n },
  "n-log-n": {
    formula: "O(n log n)",
    evaluate: (n) => n * Math.log2(n),
  },
  quadratic: {
    formula: "O(n²)",
    evaluate: (n) => n * n,
  },
  exponential: {
    formula: "O(2^n)",
    evaluate: (n) => 2 ** n,
  },
  factorial: {
    formula: "O(n!)",
    evaluate: (n) => {
      let value = 1
      for (let factor = 2; factor <= n; factor++) value *= factor
      return value
    },
  },
}

const CASE_COLORS = { Best: "#22a06b", Average: "#d99a00", Worst: "#e05252" } as const
const CURVE_COLORS: Record<CurveId, string> = {
  constant: "#22a06b",
  "log-n": "#1597b8",
  linear: "#db7c2e",
  "n-log-n": "#9b6bd6",
  quadratic: "#e05252",
  exponential: "#d04f9b",
  factorial: "#6f5bd3",
}
const CONTEXT_COLOR = "currentColor"
const OPERATION_COLORS = [
  ["#8bb8e8", "#4c89cb", "#245b98"],
  ["#bd9ee8", "#8d62c7", "#65379e"],
  ["#e7aa78", "#c97735", "#914619"],
  ["#78c9b3", "#389b82", "#176b57"],
] as const
const V1_CONFIG_KEYS = ["version", "mode", "title", "variables", "entries"] as const
const V2_CONFIG_KEYS = ["version", "label", "variables", "resources"] as const
const { left: LEFT, plotRight: PLOT_RIGHT, top: TOP, axisY: AXIS_Y } = COMPLEXITY_CHART
const DATA_BOTTOM = AXIS_Y - 14
const MAX_VALUE = 10_000
const DUPLICATE_GAP = 4

function renderValue(curveId: CurveId, n: number): number {
  if (curveId !== "factorial") return curves[curveId].evaluate(n)

  const lower = Math.floor(n)
  const t = n - lower
  const [p0, p1, p2, p3] = [lower - 1, lower, lower + 1, lower + 2].map((value) =>
    Math.log10(curves.factorial.evaluate(Math.max(1, value))),
  )
  const logValue =
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
  return 10 ** logValue
}

function fail(path: string, message: string): never {
  throw new Error(`complexity.${path}: ${message}`)
}

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object")
  return value as Record<string, unknown>
}

function rejectUnknown(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${path}.${key}`, "is not supported")
  }
}

function textAt(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") fail(path, "must be a non-empty string")
  return value
}

function curveIdAt(value: unknown, path: string): CurveId {
  if (typeof value !== "string" || !CURVE_IDS.includes(value as CurveId)) {
    fail(path, `must be one of ${CURVE_IDS.join(", ")}`)
  }
  return value as CurveId
}

function samplesAt(value: unknown, path: string): { n: number; value: number }[] {
  if (!Array.isArray(value) || value.length < 2) fail(path, "must contain at least two points")
  let previous = 0
  return value.map((raw, index) => {
    const pointPath = `${path}[${index}]`
    const point = objectAt(raw, pointPath)
    rejectUnknown(point, ["n", "value"], pointPath)
    if (typeof point.n !== "number" || !Number.isFinite(point.n) || point.n <= previous) {
      fail(`${pointPath}.n`, "must be finite, positive, and strictly increasing")
    }
    if (typeof point.value !== "number" || !Number.isFinite(point.value) || point.value <= 0) {
      fail(`${pointPath}.value`, "must be a finite positive number")
    }
    previous = point.n
    return { n: point.n, value: point.value }
  })
}

function validateV1Variables(value: unknown): void {
  const variables = objectAt(value, "variables")
  const entries = Object.entries(variables)
  if (entries.length === 0) fail("variables", "must declare n")
  const names = new Set<string>()
  for (const [name, description] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) fail(`variables.${name}`, "has an invalid name")
    textAt(description, `variables.${name}`)
    names.add(name)
  }
  if (!names.has("n")) fail("variables.n", "is required for plotted curves")
}

function validateV2Variables(value: unknown): ComplexityVariable[] {
  const variables = objectAt(value, "variables")
  if (Object.keys(variables).length === 0) fail("variables", "must be a non-empty object")
  const result: ComplexityVariable[] = []
  for (const [name, rawMetadata] of Object.entries(variables)) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) fail(`variables.${name}`, "has an invalid name")
    const metadata = objectAt(rawMetadata, `variables.${name}`)
    rejectUnknown(metadata, ["symbol", "description"], `variables.${name}`)
    result.push({
      symbol: textAt(metadata.symbol, `variables.${name}.symbol`),
      description: textAt(metadata.description, `variables.${name}.description`),
    })
  }
  return result
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function pathId(figureId: string, key: string, index: number): string {
  return `${figureId}-${slug(key)}-${index}`
}

function categoryFor(role?: string): ComplexityCategory {
  if (!role) return "other"
  const normalized = role.toLowerCase()
  if (normalized.startsWith("best")) return "best"
  if (normalized.includes("average")) return "average"
  if (normalized.startsWith("worst")) return "worst"
  return "other"
}

function roleColor(role: string, curveId: CurveId): string {
  if (role === "Best" || role === "Average" || role === "Worst") return CASE_COLORS[role]
  return CURVE_COLORS[curveId]
}

function operationColor(operationIndex: number, boundIndex: number): string {
  const palette = OPERATION_COLORS[operationIndex % OPERATION_COLORS.length]
  return palette[Math.min(boundIndex, palette.length - 1)]
}

function formatTick(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}M`
  if (value >= 1_000) return `${value / 1_000}k`
  return String(value)
}

function makeScale(maxValue: number) {
  const logMax = Math.max(1, Math.log10(maxValue))
  return {
    x: (n: number) => LEFT + (n / 10) * (PLOT_RIGHT - LEFT),
    y: (value: number) => TOP + (1 - Math.log10(value) / logMax) * (DATA_BOTTOM - TOP),
  }
}

function curvePath(
  id: string,
  curveId: CurveId,
  category: ComplexityCategory,
  label: string,
  legendLabel: string,
  color: string,
  dimmed: boolean,
  scale: ReturnType<typeof makeScale>,
  legendGroup?: string,
  offset = 0,
  formula = curves[curveId].formula,
): ComplexityPath {
  const samples = Array.from({ length: 9 }, (_, index) => {
    const n = index + 2
    const value = curves[curveId].evaluate(n)
    return { n, value, x: scale.x(n), y: scale.y(value) }
  })
  const points = [
    { x: LEFT, y: AXIS_Y },
    ...Array.from({ length: 33 }, (_, index) => {
      const n = 2 + index / 4
      return { x: scale.x(n), y: scale.y(renderValue(curveId, n)) - offset }
    }),
  ]
  const geometry = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ")
  const last = samples[samples.length - 1]
  const endY = Math.max(TOP, Math.min(DATA_BOTTOM, last.y - offset))
  return {
    id,
    curveId,
    category,
    formula,
    label,
    legendGroup,
    legendLabel,
    color,
    dimmed,
    geometry,
    area: `${geometry} L${last.x.toFixed(2)},${AXIS_Y.toFixed(2)} Z`,
    endY,
    samples,
  }
}

function layoutEndpointLabels(paths: ComplexityPath[]): ComplexityEndpointLabel[] {
  const labels = CURVE_IDS.map((curveId) => {
    const matching = paths.filter((path) => path.curveId === curveId)
    const highlighted = matching.filter((path) => !path.dimmed)
    const authoredFormulas = [...new Set(highlighted.map((path) => path.formula))]
    return {
      curveId,
      formula: authoredFormulas.length === 1 ? authoredFormulas[0] : curves[curveId].formula,
      pathIds: matching.map((path) => path.id),
      color: highlighted[0]?.color ?? CONTEXT_COLOR,
      dimmed: highlighted.length === 0,
      y: matching.reduce((sum, path) => sum + path.endY, 0) / matching.length,
    }
  }).sort((a, b) => a.y - b.y)

  const gap = 20
  const min = TOP + 5
  const max = DATA_BOTTOM - 4
  labels.forEach((label, index) => {
    label.y = Math.max(label.y, index === 0 ? min : labels[index - 1].y + gap)
  })
  const overflow = labels.at(-1)!.y - max
  if (overflow > 0) labels.forEach((label) => (label.y -= overflow))
  for (let index = labels.length - 2; index >= 0; index--) {
    labels[index].y = Math.min(labels[index].y, labels[index + 1].y - gap)
  }
  const underflow = min - labels[0].y
  if (underflow > 0) labels.forEach((label) => (label.y += underflow))
  return labels
}

function assertUnique(seen: Set<string>, value: string, path: string): void {
  if (seen.has(value)) fail(path, `duplicates ${value}`)
  seen.add(value)
}

interface HighlightedPath {
  id: string
  curveId: CurveId
  formula: string
  label: string
  legendGroup?: string
  legendLabel: string
  color: string
  category: ComplexityCategory
  order: number
}

function finishResource(
  key: ComplexityResourceViewModel["key"],
  label: string,
  labelId: string,
  mode: ComplexityMode,
  highlighted: HighlightedPath[],
  semanticBounds: ComplexitySemanticBound[],
): ComplexityResourceViewModel {
  const scale = makeScale(MAX_VALUE)
  const selected = new Set(highlighted.map(({ curveId }) => curveId))
  const context = CURVE_IDS.filter((curveId) => !selected.has(curveId)).map((curveId, index) =>
    curvePath(
      `${labelId}-context-${curveId}-${index}`,
      curveId,
      "other",
      curves[curveId].formula,
      curves[curveId].formula,
      CONTEXT_COLOR,
      true,
      scale,
    ),
  )
  const counts = new Map<CurveId, number>()
  const indexes = new Map<CurveId, number>()
  for (const { curveId } of highlighted) counts.set(curveId, (counts.get(curveId) ?? 0) + 1)
  const highlightedPaths = highlighted.map(
    ({ id, curveId, category, formula, label, legendGroup, legendLabel, color }) => {
      const index = indexes.get(curveId) ?? 0
      indexes.set(curveId, index + 1)
      const offset = (counts.get(curveId) ?? 0) > 1 ? index * DUPLICATE_GAP : 0
      return curvePath(
        id,
        curveId,
        category,
        label,
        legendLabel,
        color,
        false,
        scale,
        legendGroup,
        offset,
        formula,
      )
    },
  )
  const paths = [...context, ...highlightedPaths]
  const ticks: ComplexityViewModel["ticks"] = [{ value: 0, label: "0", y: AXIS_Y }]
  for (let value = 1; value <= MAX_VALUE; value *= 10) {
    ticks.push({ value, label: formatTick(value), y: scale.y(value) })
  }
  const xTicks: ComplexityViewModel["xTicks"] = [2, 4, 6, 8, 10].map((value) => ({
    value,
    label: String(value),
    x: scale.x(value),
  }))
  const endpointLabels = layoutEndpointLabels(paths)
  const endpointFormulas = new Map(
    endpointLabels.map((label) => [label.curveId, label.formula]),
  )
  const legend: ComplexityLegendGroup[] = []
  const legendEntries = [
    ...highlightedPaths.map((path, index) => ({
      order: highlighted[index].order,
      group: path.legendGroup,
      item: {
        kind: "plotted" as const,
        pathId: path.id,
        category: path.category,
        label:
          endpointFormulas.get(path.curveId) === path.formula
            ? path.legendLabel
            : `${path.legendLabel}: ${path.formula}`,
        color: path.color,
      },
    })),
    ...semanticBounds.map((bound) => ({
      order: bound.order,
      group: bound.operation,
      item: {
        kind: "semantic" as const,
        category: bound.category,
        label: `${bound.role}: ${bound.formula}`,
        color: bound.color,
      },
    })),
  ].sort((left, right) => left.order - right.order)
  for (const { group: groupLabel, item } of legendEntries) {
    const group = legend.find((candidate) => candidate.label === groupLabel)
    if (group) group.items.push(item)
    else legend.push({ label: groupLabel, items: [item] })
  }

  return {
    key,
    label,
    labelId,
    mode,
    paths: highlightedPaths,
    contextPaths: context,
    legend,
    endpointLabels,
    semanticBounds,
    ticks,
    xTicks,
  }
}

function buildResource(
  rawEntries: unknown,
  mode: ComplexityMode,
  pathPrefix: string,
  key: ComplexityResourceViewModel["key"],
  label: string,
  labelId: string,
  version: 1 | 2,
): ComplexityResourceViewModel {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    fail(`${pathPrefix}entries`, "must be a non-empty array")
  }
  const highlighted: HighlightedPath[] = []
  const semanticBounds: ComplexitySemanticBound[] = []

  if (mode === "catalogue") {
    const seen = new Set<string>()
    rawEntries.forEach((raw, index) => {
      const path = `${pathPrefix}entries[${index}]`
      const entry = objectAt(raw, path)
      rejectUnknown(entry, ["kind", "curveId"], path)
      if (entry.kind !== "catalogue") fail(`${path}.kind`, "must be catalogue")
      const curveId = curveIdAt(entry.curveId, `${path}.curveId`)
      assertUnique(seen, curveId, `${path}.curveId`)
      const formula = curves[curveId].formula
      highlighted.push({
        id: pathId(labelId, curveId, index),
        curveId,
        formula,
        category: "other",
        label: formula,
        legendLabel: formula,
        color: CURVE_COLORS[curveId],
        order: index,
      })
    })
  } else if (mode === "cases") {
    const seen = new Set<string>()
    rawEntries.forEach((raw, index) => {
      const path = `${pathPrefix}entries[${index}]`
      const entry = objectAt(raw, path)
      rejectUnknown(
        entry,
        version === 2 ? ["kind", "role", "formula", "curveId"] : ["kind", "role", "curveId"],
        path,
      )
      if (entry.kind !== "case") fail(`${path}.kind`, "must be case")
      const role = textAt(entry.role, `${path}.role`)
      if (role !== "Best" && role !== "Average" && role !== "Worst") {
        fail(`${path}.role`, "must be Best, Average, or Worst")
      }
      assertUnique(seen, role, `${path}.role`)
      const curveId = curveIdAt(entry.curveId, `${path}.curveId`)
      const formula =
        version === 2 ? textAt(entry.formula, `${path}.formula`) : curves[curveId].formula
      highlighted.push({
        id: pathId(labelId, role, index),
        curveId,
        formula,
        category: categoryFor(role),
        label: `${role}: ${formula}`,
        legendLabel: role,
        color: roleColor(role, curveId),
        order: index,
      })
    })
    for (const role of ["Best", "Average", "Worst"]) {
      if (!seen.has(role)) fail(`${pathPrefix}entries`, `must include ${role}`)
    }
  } else {
    const seenOperations = new Set<string>()
    rawEntries.forEach((raw, operationIndex) => {
      const path = `${pathPrefix}entries[${operationIndex}]`
      const entry = objectAt(raw, path)
      rejectUnknown(entry, ["kind", "operation", "bounds"], path)
      if (entry.kind !== "operation") fail(`${path}.kind`, "must be operation")
      const operation = textAt(entry.operation, `${path}.operation`)
      assertUnique(seenOperations, operation, `${path}.operation`)
      if (!Array.isArray(entry.bounds) || entry.bounds.length === 0) {
        fail(`${path}.bounds`, "must be a non-empty array")
      }
      const seenRoles = new Set<string>()
      entry.bounds.forEach((rawBound, boundIndex) => {
        const boundPath = `${path}.bounds[${boundIndex}]`
        const bound = objectAt(rawBound, boundPath)
        const plottedKind = version === 2 ? "curve" : "catalogue"
        if (bound.kind === plottedKind) {
          rejectUnknown(
            bound,
            version === 2 ? ["kind", "curveId", "formula", "role"] : ["kind", "curveId", "role"],
            boundPath,
          )
        } else if (version === 2 && bound.kind === "samples") {
          rejectUnknown(bound, ["kind", "formula", "role", "samples"], boundPath)
        } else if (bound.kind === "text") {
          rejectUnknown(bound, ["kind", "formula", "role"], boundPath)
        } else {
          fail(
            `${boundPath}.kind`,
            version === 2 ? "must be curve, samples, or text" : `must be ${plottedKind} or text`,
          )
        }
        const role = textAt(bound.role, `${boundPath}.role`)
        assertUnique(seenRoles, role, `${boundPath}.role`)
        if (bound.kind === "text") {
          semanticBounds.push({
            operation,
            role,
            formula: textAt(bound.formula, `${boundPath}.formula`),
            category: categoryFor(role),
            color: operationColor(operationIndex, boundIndex),
            order: operationIndex * 100 + boundIndex,
          })
          return
        }
        if (bound.kind === "samples") {
          samplesAt(bound.samples, `${boundPath}.samples`)
          semanticBounds.push({
            operation,
            role,
            formula: textAt(bound.formula, `${boundPath}.formula`),
            category: categoryFor(role),
            color: operationColor(operationIndex, boundIndex),
            order: operationIndex * 100 + boundIndex,
          })
          return
        }
        const curveId = curveIdAt(bound.curveId, `${boundPath}.curveId`)
        const formula =
          version === 2 ? textAt(bound.formula, `${boundPath}.formula`) : curves[curveId].formula
        highlighted.push({
          id: pathId(labelId, `${operation}-${role}`, operationIndex * 100 + boundIndex),
          curveId,
          formula,
          category: categoryFor(role),
          label: `${operation} — ${role}: ${formula}`,
          legendGroup: operation,
          legendLabel: role,
          color: operationColor(operationIndex, boundIndex),
          order: operationIndex * 100 + boundIndex,
        })
      })
    })
  }
  return finishResource(key, label, labelId, mode, highlighted, semanticBounds)
}

export function buildComplexityViewModel(
  input: unknown,
  instanceNamespace?: string,
): ComplexityViewModel {
  const config = objectAt(input, "config")
  if (config.version === 2) {
    rejectUnknown(config, V2_CONFIG_KEYS, "config")
    const label = textAt(config.label, "label")
    const variables = validateV2Variables(config.variables)
    const resources = objectAt(config.resources, "resources")
    rejectUnknown(resources, ["time", "space"], "resources")
    if (!("time" in resources)) fail("resources.time", "is required")
    if (!("space" in resources)) fail("resources.space", "is required")
    const namespace = slug(textAt(instanceNamespace, "instanceNamespace"))
    const figureId = `complexity-${namespace}`
    const resourceViews = (["time", "space"] as const).map((key) => {
      const path = `resources.${key}`
      const resource = objectAt(resources[key], path)
      rejectUnknown(resource, ["mode", "entries"], path)
      if (resource.mode !== "cases" && resource.mode !== "operations") {
        fail(`${path}.mode`, "must be one of cases, operations")
      }
      return buildResource(
        resource.entries,
        resource.mode,
        `${path}.`,
        key,
        key === "time" ? "Time" : "Space",
        `${figureId}-${key}`,
        2,
      )
    })
    return {
      figureId,
      mode: resourceViews[0].mode,
      title: label,
      label,
      variables,
      resources: resourceViews,
      paths: resourceViews.flatMap((resource) => [...resource.contextPaths, ...resource.paths]),
      legend: resourceViews.flatMap((resource) => resource.legend),
      endpointLabels: resourceViews.flatMap((resource) => resource.endpointLabels),
      ticks: resourceViews[0].ticks,
      xTicks: resourceViews[0].xTicks,
    }
  }

  rejectUnknown(config, V1_CONFIG_KEYS, "config")
  if (config.version !== 1) fail("version", "must be 1 or 2")
  if (config.mode !== "catalogue" && config.mode !== "cases" && config.mode !== "operations") {
    fail("mode", "must be catalogue, cases, or operations")
  }
  const title = textAt(config.title, "title")
  validateV1Variables(config.variables)
  const figureId = `complexity-${slug(instanceNamespace ?? `${config.mode}-${title}`)}`
  const resource = buildResource(
    config.entries,
    config.mode,
    "",
    "catalogue",
    title,
    `${figureId}-catalogue`,
    1,
  )
  return {
    figureId,
    mode: config.mode,
    title,
    label: title,
    variables: [],
    resources: [resource],
    paths: [...resource.contextPaths, ...resource.paths],
    legend: resource.legend,
    endpointLabels: resource.endpointLabels,
    ticks: resource.ticks,
    xTicks: resource.xTicks,
  }
}

export function curveValue(curveId: CurveId, n: number): number {
  return curves[curveId].evaluate(n)
}
