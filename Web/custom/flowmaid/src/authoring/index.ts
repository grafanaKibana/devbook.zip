import type { FlowmaidDiagnostic, FlowmaidProgram } from "../domain/types"
import { extractFlowmaid } from "./extract"

export interface SourcePosition {
  readonly start: { readonly line: number; readonly column: number; readonly offset?: number }
  readonly end: { readonly line: number; readonly column: number; readonly offset?: number }
}

export interface MermaidSourceNode {
  readonly type: string
  readonly lang?: string | null
  readonly value?: string
  readonly position?: SourcePosition
  readonly children?: readonly MermaidSourceNode[]
}

export interface FlowmaidRecord {
  readonly id: string
  readonly source: string
  readonly position: SourcePosition | null
  readonly program?: FlowmaidProgram
  readonly diagnostic?: FlowmaidDiagnostic
}

export interface FlowmaidIndex {
  readonly records: readonly FlowmaidRecord[]
  readonly byRange: ReadonlyMap<string, readonly FlowmaidRecord[]>
}

const rangeKey = (start: number, end: number, source: string) => `${start}:${end}:${source}`

export const buildFlowmaidIndex = (
  root: MermaidSourceNode,
  compileSource: (yaml: string) => FlowmaidProgram,
): FlowmaidIndex => {
  const records: FlowmaidRecord[] = []
  const walk = (node: MermaidSourceNode): void => {
    if (node.type === "code" && node.lang === "mermaid" && typeof node.value === "string") {
      const extracted = extractFlowmaid(node.value)
      if (extracted.kind !== "none") {
        const position = node.position ?? null
        const id = position
          ? `${position.start.line}:${position.start.column}:${position.end.line}:${position.end.column}`
          : `record:${records.length}`
        if (extracted.kind === "invalid")
          records.push({ id, source: node.value, position, diagnostic: extracted.diagnostic })
        else {
          try {
            records.push({
              id,
              source: node.value,
              position,
              program: compileSource(extracted.value.yaml),
            })
          } catch (error) {
            const diagnostic =
              error && typeof error === "object" && "diagnostic" in error
                ? (error as { diagnostic: FlowmaidDiagnostic }).diagnostic
                : {
                    code: "schema-invalid" as const,
                    path: "$",
                    message: error instanceof Error ? error.message : String(error),
                  }
            records.push({ id, source: node.value, position, diagnostic })
          }
        }
      }
    }
    node.children?.forEach(walk)
  }
  walk(root)

  const byRange = new Map<string, FlowmaidRecord[]>()
  for (const record of records) {
    if (!record.position) continue
    const key = rangeKey(
      record.position.start.line - 1,
      record.position.end.line - 1,
      record.source,
    )
    byRange.set(key, [...(byRange.get(key) ?? []), record])
  }
  return { records, byRange }
}

export const findFlowmaidRecord = (
  index: FlowmaidIndex,
  lineStart: number,
  lineEnd: number,
  source: string,
): FlowmaidRecord | null => {
  const matches = index.byRange.get(rangeKey(lineStart, lineEnd, source))
  return matches?.length === 1 ? matches[0]! : null
}
