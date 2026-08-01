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
export type ComplexityFilter = "all" | ComplexityCategory

export const COMPLEXITY_FILTERS: { id: ComplexityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "best", label: "Best" },
  { id: "average", label: "Avg" },
  { id: "worst", label: "Worst" },
  { id: "other", label: "Other" },
]

export const COMPLEXITY_CHART = {
  width: 800,
  height: 320,
  left: 0,
  plotRight: 740,
  labelX: 748,
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

export interface ComplexityLegendGroup {
  label?: string
  items: {
    pathId: string
    category: ComplexityCategory
    label: string
    color: string
  }[]
}

export interface ComplexityEndpointLabel {
  curveId: CurveId
  formula: string
  pathIds: string[]
  color: string
  dimmed: boolean
  y: number
}

export interface ComplexityViewModel {
  figureId: string
  mode: ComplexityMode
  title: string
  paths: ComplexityPath[]
  legend: ComplexityLegendGroup[]
  endpointLabels: ComplexityEndpointLabel[]
  availableCategories: ComplexityCategory[]
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
const CONFIG_KEYS = ["version", "mode", "title", "variables", "entries"] as const
const { left: LEFT, plotRight: PLOT_RIGHT, top: TOP, axisY: AXIS_Y } = COMPLEXITY_CHART
const DATA_BOTTOM = AXIS_Y - 14
const MAX_VALUE = 10_000
const DUPLICATE_GAP = 4

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

function validateVariables(value: unknown): void {
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

function compactRole(role: string): string {
  return role
    .replace("Average", "Avg")
    .replace("Amortized / average", "Amortized / avg")
    .replace("Worst single op", "Worst")
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
): ComplexityPath {
  const samples = Array.from({ length: 9 }, (_, index) => {
    const n = index + 2
    const value = curves[curveId].evaluate(n)
    return { n, value, x: scale.x(n), y: scale.y(value) }
  })
  const points = [{ x: LEFT, y: AXIS_Y }, ...samples.map(({ x, y }) => ({ x, y: y - offset }))]
  const geometry = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ")
  const last = samples[samples.length - 1]
  const endY = Math.max(TOP, Math.min(DATA_BOTTOM, last.y - offset))
  return {
    id,
    curveId,
    category,
    formula: curves[curveId].formula,
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
    return {
      curveId,
      formula: curves[curveId].formula,
      pathIds: matching.map((path) => path.id),
      color: highlighted[0]?.color ?? CONTEXT_COLOR,
      dimmed: highlighted.length === 0,
      y: matching.reduce((sum, path) => sum + path.endY, 0) / matching.length,
    }
  }).sort((a, b) => a.y - b.y)

  const gap = 15
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

export function buildComplexityViewModel(input: unknown): ComplexityViewModel {
  const config = objectAt(input, "config")
  rejectUnknown(config, CONFIG_KEYS, "config")
  if (config.version !== 1) fail("version", "must be 1")
  const mode = config.mode
  if (mode !== "catalogue" && mode !== "cases" && mode !== "operations") {
    fail("mode", "must be catalogue, cases, or operations")
  }
  const title = textAt(config.title, "title")
  const figureId = `complexity-${mode}-${slug(title)}`
  validateVariables(config.variables)
  if (!Array.isArray(config.entries) || config.entries.length === 0) {
    fail("entries", "must be a non-empty array")
  }

  const highlighted: {
    id: string
    curveId: CurveId
    label: string
    legendGroup?: string
    legendLabel: string
    color: string
    category: ComplexityCategory
  }[] = []

  if (mode === "catalogue") {
    const seen = new Set<string>()
    config.entries.forEach((raw, index) => {
      const path = `entries[${index}]`
      const entry = objectAt(raw, path)
      rejectUnknown(entry, ["kind", "curveId"], path)
      if (entry.kind !== "catalogue") fail(`${path}.kind`, "must be catalogue")
      const curveId = curveIdAt(entry.curveId, `${path}.curveId`)
      assertUnique(seen, curveId, `${path}.curveId`)
      const id = pathId(figureId, curveId, index)
      highlighted.push({
        id,
        curveId,
        category: "other",
        label: curves[curveId].formula,
        legendLabel: curves[curveId].formula,
        color: CURVE_COLORS[curveId],
      })
    })
  } else if (mode === "cases") {
    const seen = new Set<string>()
    config.entries.forEach((raw, index) => {
      const path = `entries[${index}]`
      const entry = objectAt(raw, path)
      rejectUnknown(entry, ["kind", "role", "curveId"], path)
      if (entry.kind !== "case") fail(`${path}.kind`, "must be case")
      const role = textAt(entry.role, `${path}.role`)
      if (role !== "Best" && role !== "Average" && role !== "Worst") {
        fail(`${path}.role`, "must be Best, Average, or Worst")
      }
      assertUnique(seen, role, `${path}.role`)
      const curveId = curveIdAt(entry.curveId, `${path}.curveId`)
      const id = pathId(figureId, role, index)
      highlighted.push({
        id,
        curveId,
        category: categoryFor(role),
        label: `${role}: ${curves[curveId].formula}`,
        legendLabel: `${compactRole(role)} ${curves[curveId].formula}`,
        color: roleColor(role, curveId),
      })
    })
    for (const role of ["Best", "Average", "Worst"]) {
      if (!seen.has(role)) fail("entries", `must include ${role}`)
    }
  } else {
    const seenOperations = new Set<string>()
    config.entries.forEach((raw, operationIndex) => {
      const path = `entries[${operationIndex}]`
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
        if (bound.kind === "catalogue") {
          rejectUnknown(bound, ["kind", "curveId", "role"], boundPath)
        } else if (bound.kind === "text") {
          rejectUnknown(bound, ["kind", "formula", "role"], boundPath)
          textAt(bound.formula, `${boundPath}.formula`)
        } else {
          fail(`${boundPath}.kind`, "must be catalogue or text")
        }
        const role = textAt(bound.role, `${boundPath}.role`)
        assertUnique(seenRoles, role, `${boundPath}.role`)
        if (bound.kind === "text") return
        const curveId = curveIdAt(bound.curveId, `${boundPath}.curveId`)
        const id = pathId(figureId, `${operation}-${role}`, operationIndex * 100 + boundIndex)
        highlighted.push({
          id,
          curveId,
          category: categoryFor(role),
          label: `${operation} — ${role}: ${curves[curveId].formula}`,
          legendGroup: operation,
          legendLabel: `${compactRole(role)} ${curves[curveId].formula}`,
          color: operationColor(operationIndex, boundIndex),
        })
      })
    })
  }

  const scale = makeScale(MAX_VALUE)
  const selected = new Set(highlighted.map(({ curveId }) => curveId))
  const context = CURVE_IDS.filter((curveId) => !selected.has(curveId)).map((curveId, index) =>
    curvePath(
      `${figureId}-context-${curveId}-${index}`,
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
    ({ id, curveId, category, label, legendGroup, legendLabel, color }) => {
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
  const legend: ComplexityLegendGroup[] = []
  for (const path of paths.filter((candidate) => !candidate.dimmed)) {
    const group = legend.find((candidate) => candidate.label === path.legendGroup)
    const item = {
      pathId: path.id,
      category: path.category,
      label: path.legendLabel,
      color: path.color,
    }
    if (group) group.items.push(item)
    else legend.push({ label: path.legendGroup, items: [item] })
  }

  const availableCategories = Array.from(new Set(highlightedPaths.map((path) => path.category)))

  return {
    figureId,
    mode,
    title,
    paths,
    legend,
    endpointLabels: layoutEndpointLabels(paths),
    availableCategories,
    ticks,
    xTicks,
  }
}

export function curveValue(curveId: CurveId, n: number): number {
  return curves[curveId].evaluate(n)
}
