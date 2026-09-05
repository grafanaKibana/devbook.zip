import type { FlowmaidDiagnostic } from "../domain/types"

export interface ExtractedFlowmaid {
  readonly yaml: string
  readonly startLine: number
  readonly endLine: number
}

export type ExtractionResult =
  | { readonly kind: "none" }
  | { readonly kind: "found"; readonly value: ExtractedFlowmaid }
  | { readonly kind: "invalid"; readonly diagnostic: FlowmaidDiagnostic }

const OPEN = /^\s*%% flowmaid\s*$/u
const CLOSE = /^\s*%% \/flowmaid\s*$/u
const PAYLOAD = /^\s*%% (.*)$/u

const invalid = (line: number, message: string): ExtractionResult => ({
  kind: "invalid",
  diagnostic: { code: "carrier-invalid", path: "$", line, column: 1, message },
})

export const extractFlowmaid = (mermaidSource: string): ExtractionResult => {
  const lines = mermaidSource.split(/\r?\n/u)
  const openers = lines.flatMap((line, index) => (OPEN.test(line) ? [index] : []))
  const closers = lines.flatMap((line, index) => (CLOSE.test(line) ? [index] : []))
  if (!openers.length && !closers.length) return { kind: "none" }
  if (openers.length !== 1 || closers.length !== 1)
    return invalid(1, "Flowmaid requires exactly one opening and closing delimiter")

  const start = openers[0]!
  const end = closers[0]!
  if (end <= start) return invalid(end + 1, "Flowmaid delimiters are reversed or nested")

  const payload: string[] = []
  for (let index = start + 1; index < end; index += 1) {
    const match = lines[index]!.match(PAYLOAD)
    if (!match) return invalid(index + 1, "Flowmaid payload lines must begin with `%% `")
    payload.push(match[1]!)
  }
  return {
    kind: "found",
    value: { yaml: payload.join("\n"), startLine: start + 1, endLine: end + 1 },
  }
}
