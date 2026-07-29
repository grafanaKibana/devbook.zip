import { mountSpan, type SpanConfig } from "../families/contiguous-storage"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [10, 20, 30, 40, 50, 60]

export function parseSpanConfig(config: StepTraceConfig): SpanConfig {
  const values = (config.values?.length ? config.values : DEFAULT_VALUES).map(String)
  const [start, end] = config.range ?? [1, Math.min(4, values.length)]
  if (
    values.length < 3 ||
    values.length > 10 ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end <= start ||
    end > values.length
  )
    throw new Error(`steptrace: span requires 3 to 10 "values" and a valid half-open "range".`)
  return { values, start, length: end - start }
}

export const span = {
  id: "span",
  family: "contiguous-storage",
  meta: { label: "Span" },
  parse: parseSpanConfig,
  mount: mountSpan,
} satisfies InteractiveStructureDefinition<SpanConfig>
