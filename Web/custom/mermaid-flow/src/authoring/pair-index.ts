const PAIR_ID = /^[a-z][a-z0-9-]{0,63}$/u

export interface AuthoringPosition {
  start: { line: number; column: number; offset?: number }
  end: { line: number; column: number; offset?: number }
}

export interface AuthoringNode {
  type: string
  lang?: string | null
  value?: string
  position?: AuthoringPosition
  children?: AuthoringNode[]
  data?: unknown
}

export interface PairRecord {
  readonly node: AuthoringNode
  readonly parent: AuthoringNode
  readonly index: number
  readonly source: string
  readonly position: AuthoringPosition | null
  readonly pairId: string | null
  readonly config: Record<string, unknown> | null
  readonly mermaid: AuthoringNode | null
  failure: string | null
}

export interface PairIndex {
  readonly records: readonly PairRecord[]
  readonly byRange: ReadonlyMap<string, readonly PairRecord[]>
}

export const readConfigPairId = (source: string): string | null => {
  try {
    const config: unknown = JSON.parse(source)
    if (!config || typeof config !== "object" || Array.isArray(config)) return null
    const pairId = (config as { for?: unknown }).for
    return typeof pairId === "string" && PAIR_ID.test(pairId) ? pairId : null
  } catch {
    return null
  }
}

export const readMermaidPairId = (source: string): string | null => {
  const markers = source.split(/\r?\n/u).flatMap((line) => {
    const match = line.match(/^\s*%%\s*mermaid-flow:\s*([a-z][a-z0-9-]{0,63})\s*$/u)
    return match ? [match[1]] : []
  })
  return markers.length === 1 ? markers[0] : null
}

const rangeKey = (lineStart: number, lineEnd: number, source: string): string =>
  `${lineStart}:${lineEnd}:${source}`

export const buildPairIndex = (root: AuthoringNode): PairIndex => {
  const records: PairRecord[] = []
  const counts = new Map<string, number>()

  const walk = (parent: AuthoringNode): void => {
    if (!parent.children) return
    for (let index = 0; index < parent.children.length; index += 1) {
      const node = parent.children[index]
      if (node.type === "code" && node.lang === "mermaid-flow" && typeof node.value === "string") {
        const previous = parent.children[index - 1]
        const pairId = readConfigPairId(node.value)
        const mermaid = previous?.type === "code" && previous.lang === "mermaid" ? previous : null
        let config: Record<string, unknown> | null = null
        if (pairId) {
          config = JSON.parse(node.value) as Record<string, unknown>
          counts.set(pairId, (counts.get(pairId) ?? 0) + 1)
        }
        let failure: string | null = null
        if (!pairId) {
          failure = "configuration must be JSON with a valid string `for`"
        } else if (!mermaid) {
          failure = "configuration must immediately follow its Mermaid fence"
        } else if (readMermaidPairId(mermaid.value ?? "") !== pairId) {
          failure = "the immediately preceding Mermaid marker does not match `for`"
        }
        records.push({
          node,
          parent,
          index,
          source: node.value,
          position: node.position ?? null,
          pairId,
          config,
          mermaid,
          failure,
        })
      }
      walk(node)
    }
  }

  walk(root)
  for (const record of records)
    if (record.pairId && counts.get(record.pairId)! > 1)
      record.failure = `pairing ID \`${record.pairId}\` is duplicated`

  const byRange = new Map<string, PairRecord[]>()
  for (const record of records) {
    if (!record.position) continue
    const key = rangeKey(
      record.position.start.line - 1,
      record.position.end.line - 1,
      record.source,
    )
    const matches = byRange.get(key) ?? []
    matches.push(record)
    byRange.set(key, matches)
  }
  return { records, byRange }
}

export const findPairRecord = (
  index: PairIndex,
  lineStart: number,
  lineEnd: number,
  source: string,
): PairRecord | null => {
  const matches = index.byRange.get(rangeKey(lineStart, lineEnd, source))
  return matches?.length === 1 ? matches[0] : null
}
